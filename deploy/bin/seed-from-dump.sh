#!/bin/bash
# Replace a project's database with a dump of another MongoDB.
#
#   seed-from-dump.sh <production|staging> dump   <source mongodb uri>
#   seed-from-dump.sh <production|staging> restore <archive>
#   seed-from-dump.sh <production|staging> all     <source mongodb uri>
#
# `dump` writes /srv/bpni/dumps/seed-<stamp>.archive.gz (gzip mongodump
# archive of the source's `blueprintnotincluded` database, every collection
# included — previewimages too, so the restored site comes up with warm
# previews). `restore` drops the project's database and restores the archive
# into it as root, then prints collection counts. `all` does both.
#
# Uses:
#   - the trial seed and the final cut-over: dump from the DigitalOcean
#     read-only URI (the PROD_READONLY_URI in /.env.migration on the dev box;
#     paste it on the command line here, it is read-only)
#   - refreshing staging from production on the same box:
#       seed-from-dump.sh staging all "mongodb://root:<pw>@bpni-production-mongo-1:27017/?authSource=admin"
#     (staging's backup container must be able to reach that host: pass
#     --network bpni-production_default via SEED_RUN_ARGS)
#
# Everything runs inside the project's backup image (mongodump/mongorestore),
# so the host needs nothing installed. The app keeps running during a
# restore; stop it first for a consistent cut-over
# (`compose.sh production stop app`), start it after.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
compose="$here/compose.sh"
root=${BPNI_ROOT:-/srv/bpni}
dumps="$root/dumps"

project=${1:?usage: seed-from-dump.sh <production|staging> <dump|restore|all> <uri|archive>}
mode=${2:?usage: seed-from-dump.sh <production|staging> <dump|restore|all> <uri|archive>}
arg=${3:?usage: seed-from-dump.sh <production|staging> <dump|restore|all> <uri|archive>}
db=blueprintnotincluded

# docker compose run on the backup service: --profile backup because the
# sidecar's profile is off on staging; -T for no tty (works from a pipe).
run() {
  # shellcheck disable=SC2086
  "$compose" "$project" --profile backup run --rm --no-deps -T ${SEED_RUN_ARGS:-} backup "$@"
}

root_pw() {
  grep -E '^MONGO_ROOT_PASSWORD=' "$root/$project/.env" | tail -n1 | cut -d= -f2- | tr -d '"'
}

do_dump() {
  local uri=$1
  local name="seed-$(date -u +%Y%m%dT%H%M%SZ).archive.gz"
  mkdir -p "$dumps"
  # Progress to stderr: stdout carries only the archive name, for `all`.
  echo "== dumping $db from the source into $dumps/$name (previewimages included; several GB, be patient)" >&2
  run mongodump --uri="$uri" --db="$db" --gzip --archive="/dumps/$name" >&2
  ls -lh "$dumps/$name" >&2
  echo "$name"
}

do_restore() {
  local archive=$1
  [ -f "$dumps/$archive" ] || { echo "$dumps/$archive not found" >&2; exit 66; }
  local pw
  pw=$(root_pw)
  echo "== restoring $archive into $project's mongo (drops $db first)"
  run mongorestore --uri="mongodb://root:${pw}@mongo:27017/?authSource=admin" \
    --nsInclude="$db.*" --drop --gzip --archive="/dumps/$archive"
  echo "== collection counts"
  "$compose" "$project" exec -T mongo mongosh --quiet -u root -p "$pw" --authenticationDatabase admin "$db" --eval '
    db.getCollectionNames().sort().forEach(c => print(c.padEnd(28), db.getCollection(c).estimatedDocumentCount()));
  '
  echo "== next: run migrations, then check the site"
  echo "   $compose $project exec app npm run migrate:status"
  echo "   $compose $project exec app npm run migrate:up"
}

case "$mode" in
  dump) do_dump "$arg" ;;
  restore) do_restore "$arg" ;;
  all)
    name=$(do_dump "$arg")
    do_restore "$name"
    ;;
  *) echo "mode must be dump, restore or all" >&2; exit 64 ;;
esac
