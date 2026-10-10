// Runs the frontend unit suite (`ng test --no-watch`) with bounded resources and
// fails if the vitest pool ever exceeds those bounds.
//
// Why a wrapper: @angular/build:unit-test (20.3) starts vitest with `config: false`
// and exposes no pool options, so the only lever on worker count is vitest's
// environment contract (VITEST_MAX_FORKS / VITEST_MAX_THREADS). Left alone the
// pool forks one worker per *host* core — 24 on a workstation, inside a container
// that only sees a fraction of its memory. Incident 2026-10-10: a retry loop
// stacked several such pools and took the host down.
//
// Three jobs, all portable (plain Node, `ps` on Linux/macOS, no dependencies):
//   1. Defaults. Caps the pool at WORKER_CAP forks and each worker's V8 heap at
//      WORKER_HEAP_MB unless the caller already set them (the devcontainer does,
//      in .devcontainer/docker-compose.yml; CI and a host checkout get them here).
//   2. Cleanup. The runner lives in its own process group, and SIGINT/SIGTERM/SIGHUP
//      on this process kill that whole group — so `timeout`, Ctrl-C, or the shell
//      of a killed `docker exec` going away all take the workers with them. If our
//      parent disappears without a signal, the group is killed too — and whatever
//      happens above us, nothing outlives DEADLINE_MS. (A killed `docker exec`
//      client sends the container side no signal at all: that run keeps going,
//      bounded by the caps and this deadline, and its output is discarded.)
//   3. Honesty. Samples `ps` while the suite runs and prints the peak worker count
//      and peak per-worker RSS at the end; exits non-zero if either passed its
//      ceiling, even when every test passed. That is the regression test for the
//      limits themselves. Ceilings are constants below, not environment — the
//      point is that nobody silences them per run.
//
// Usage: `npm test`, `npm run test:coverage`, `npm test -- --include='**/x.spec.ts'`.
// Every argument is passed through to `ng test`.
const { spawn, execFileSync } = require("node:child_process");
const path = require("node:path");

const WORKER_CAP = 4; // forks; the suite is ~100 files and finishes in ~30 s at 4
const WORKER_HEAP_MB = 1536; // --max-old-space-size per node process
// RSS, not heap: the V8 limit is a ceiling on one of several memory regions, so the
// process footprint runs higher. Measured 2026-10-10: ~310 MB peak per worker, so
// this leaves room for growth and still catches a leak long before 1.5 GB of heap.
const WORKER_RSS_CEILING_MB = 1024;
const SAMPLE_MS = 500;
const KILL_GRACE_MS = 10_000;
// The full suite takes ~35 s here (~60 s with coverage); a slow CI runner is still
// well inside this. Anything longer is a hang, and a hang is what stacks pools.
const DEADLINE_MS = 10 * 60_000;

const env = { ...process.env };
env.VITEST_MAX_FORKS ??= String(WORKER_CAP);
env.VITEST_MAX_THREADS ??= String(WORKER_CAP);
if (!/max-old-space-size/.test(env.NODE_OPTIONS ?? "")) {
  env.NODE_OPTIONS =
    `${env.NODE_OPTIONS ?? ""} --max-old-space-size=${WORKER_HEAP_MB}`.trim();
}
// The ceiling is WORKER_CAP regardless of what the environment asks for: a
// caller raising VITEST_MAX_FORKS gets a bigger pool and a failed run, which is
// the point — the limit is documented, not negotiable per run.
const workerCap = WORKER_CAP;

const ng = path.join(
  __dirname,
  "..",
  "node_modules",
  "@angular",
  "cli",
  "bin",
  "ng.js",
);
const detached = process.platform !== "win32";
const child = spawn(
  process.execPath,
  [ng, "test", "--no-watch", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env,
    detached,
  },
);

// --- cleanup -------------------------------------------------------------------

let shuttingDown = false;
function killGroup(signal) {
  try {
    if (detached) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    // already gone
  }
}
let stoppedBecause = null;
function shutdown(reason, signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  stoppedBecause = reason;
  // Kill first, log second: if we are here because our stdio went away, the
  // log line may block, and the pool must already be on its way out by then.
  killGroup(signal);
  setTimeout(() => killGroup("SIGKILL"), KILL_GRACE_MS).unref();
  console.error(`\nrun-tests: ${reason}; stopping the vitest pool`);
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => shutdown(`received ${signal}`, signal));
}
setTimeout(
  () => shutdown(`still running after ${DEADLINE_MS / 60_000} min`),
  DEADLINE_MS,
).unref();
const parentAtStart = process.ppid;

// --- sampling ------------------------------------------------------------------

const WORKER_TITLE = /\bnode \(vitest \d+\)/;
let psAvailable = process.platform !== "win32";
let peakWorkers = 0;
let peakWorkerRssMb = 0;
let peakMainRssMb = 0;

function sample() {
  if (process.ppid !== parentAtStart) {
    shutdown(`parent process ${parentAtStart} is gone`);
  }
  if (!psAvailable) return;
  let out;
  try {
    out = execFileSync("ps", ["-eo", "pid,rss,args"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    psAvailable = false;
    console.error(
      "run-tests: `ps` unavailable, pool size and memory will not be checked",
    );
    return;
  }
  let workers = 0;
  for (const line of out.split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const [, pid, rssKb, args] = m;
    const rssMb = Number(rssKb) / 1024;
    if (WORKER_TITLE.test(args)) {
      workers++;
      if (rssMb > peakWorkerRssMb) peakWorkerRssMb = rssMb;
    } else if (Number(pid) === child.pid && rssMb > peakMainRssMb) {
      peakMainRssMb = rssMb;
    }
  }
  if (workers > peakWorkers) peakWorkers = workers;
}
const sampler = setInterval(sample, SAMPLE_MS);

// --- result --------------------------------------------------------------------

child.on("exit", (code, signal) => {
  clearInterval(sampler);
  sample();
  // If ng died but its forks did not, they are still in the group. Harmless
  // when the group is already empty.
  killGroup("SIGKILL");
  const fmt = (mb) => `${Math.round(mb)} MB`;
  const problems = [];
  if (peakWorkers > workerCap) {
    problems.push(
      `${peakWorkers} concurrent vitest workers, cap is ${workerCap}`,
    );
  }
  if (peakWorkerRssMb > WORKER_RSS_CEILING_MB) {
    problems.push(
      `peak worker RSS ${fmt(peakWorkerRssMb)}, ceiling is ${fmt(WORKER_RSS_CEILING_MB)}`,
    );
  }
  if (psAvailable) {
    console.error(
      `\nrun-tests: pool peaked at ${peakWorkers} worker(s) (cap ${workerCap}), ` +
        `worker RSS ${fmt(peakWorkerRssMb)} (ceiling ${fmt(WORKER_RSS_CEILING_MB)}), ` +
        `runner RSS ${fmt(peakMainRssMb)}`,
    );
  }
  for (const p of problems) console.error(`run-tests: LIMIT EXCEEDED — ${p}`);
  if (stoppedBecause)
    console.error(`run-tests: run stopped (${stoppedBecause})`);
  if (signal) {
    process.exitCode =
      128 + (require("node:os").constants.signals[signal] ?? 15);
  } else {
    process.exitCode = code || (problems.length ? 1 : 0);
  }
});
