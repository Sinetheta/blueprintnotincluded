#!/bin/bash
# docker compose for one of the two projects on the box.
#
#   compose.sh <production|staging> <any docker compose arguments>
#
#   compose.sh production ps
#   compose.sh staging logs -f --tail 100 app
#   compose.sh production exec app npm run migrate:status
#
# The project directory (/srv/bpni/<project>) holds that project's .env and
# app.env and names its volumes; the compose file is the shared copy the
# workflow rsyncs to /srv/bpni/deploy. Override either with BPNI_ROOT.
set -euo pipefail

root=${BPNI_ROOT:-/srv/bpni}
project=${1:-}
case "$project" in
  production|staging) shift ;;
  *)
    echo "usage: $(basename "$0") <production|staging> <docker compose args...>" >&2
    exit 64
    ;;
esac

dir="$root/$project"
[ -f "$dir/.env" ] || { echo "$dir/.env is missing (copy deploy/env/$project.env.example)" >&2; exit 66; }
[ -f "$dir/app.env" ] || { echo "$dir/app.env is missing (copy deploy/env/app.env.example)" >&2; exit 66; }

exec docker compose --project-directory "$dir" -f "$root/deploy/compose.yml" "$@"
