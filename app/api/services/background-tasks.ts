// Registry for fire-and-forget work: the writes a request handler starts but
// deliberately never awaits (search-row syncs, query telemetry, event logs,
// preview prerenders). Production never waits on it — a response must not
// pay for a translation call or a render. It exists so the test suite can
// wait for that work deterministically (drainBackgroundTasks) instead of
// sleeping, and so one test's late write can never land in the next test.
//
// The caller keeps its own rejection handling; `work` is returned unchanged,
// so wrapping a call is behaviour-neutral.

const inFlight = new Set<Promise<void>>();

export function runInBackground<T>(work: Promise<T>): Promise<T> {
  const tracked: Promise<void> = work.then(
    () => {
      inFlight.delete(tracked);
    },
    () => {
      inFlight.delete(tracked);
    }
  );
  inFlight.add(tracked);
  return work;
}

// Resolves once every tracked task has settled, including tasks started by
// other tracked tasks while waiting.
export async function drainBackgroundTasks(): Promise<void> {
  while (inFlight.size > 0) await Promise.all(inFlight);
}
