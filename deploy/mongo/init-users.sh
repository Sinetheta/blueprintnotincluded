#!/bin/bash
# Runs once, on the data volume's first start, from /docker-entrypoint-initdb.d
# (the mongo image skips the directory when /data/db is already initialised).
# The image has already created the root user from MONGO_INITDB_ROOT_*; this
# adds the two users the stack actually uses:
#
#   bpni    readWrite on blueprintnotincluded — the app (DB_URI in compose.yml)
#   backup  backup on admin                   — mongodump in the backup sidecar
#
# Both passwords come from the project's .env via the mongo service's
# environment. Changing a password later: `db.changeUserPassword(...)` in
# mongosh as root, then the matching value in .env, then `compose up -d`.
set -euo pipefail

: "${MONGO_APP_PASSWORD:?MONGO_APP_PASSWORD is required}"
: "${MONGO_BACKUP_PASSWORD:?MONGO_BACKUP_PASSWORD is required}"

# The entrypoint sources this file with `mongo` set to a mongosh command line
# already authenticated as the root user it just created.
"${mongo[@]}" --eval '
    const appDb = "blueprintnotincluded";
    db.getSiblingDB(appDb).createUser({
      user: "bpni",
      pwd: process.env.MONGO_APP_PASSWORD,
      roles: [{ role: "readWrite", db: appDb }],
    });
    db.getSiblingDB("admin").createUser({
      user: "backup",
      pwd: process.env.MONGO_BACKUP_PASSWORD,
      roles: [{ role: "backup", db: "admin" }],
    });
    print("init-users: created bpni (readWrite on " + appDb + ") and backup (backup on admin)");
  '
