#!/bin/bash
# Dump the database to one gzip archive and upload it to R2.
#
#   daily/<db>-<UTC stamp>.archive.gz   kept BACKUP_KEEP_DAILY_DAYS  (14)
#   weekly/<db>-<UTC stamp>.archive.gz  Sundays only, kept BACKUP_KEEP_WEEKLY_DAYS (56)
#
# BACKUP_EXCLUDE_COLLECTIONS (comma-separated) is left out of the archive. In
# production that is `previewimages`: a cache of rendered preview WebPs (~3 GB,
# ~600 KB per blueprint) that the app rebuilds on request and that would fill
# R2's free 10 GB in three nights. A restore therefore comes up with cold
# previews, re-rendered as pages are viewed, or all at once with
# `npm run backfill-previews`. Moving that collection to object storage
# altogether is a separate piece of work.
#
# Run by crond inside the backup container (see entrypoint.sh), or by hand for
# an ad-hoc pre-migration snapshot:
#   bin/compose.sh production exec backup backup.sh
set -euo pipefail

: "${BACKUP_MONGO_URI:?}"
: "${BACKUP_DB:?}"
: "${BACKUP_REMOTE:?}"
: "${BACKUP_KEEP_DAILY_DAYS:=14}"
: "${BACKUP_KEEP_WEEKLY_DAYS:=56}"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
name="${BACKUP_DB}-${stamp}.archive.gz"
work=$(mktemp -d /dumps/backup.XXXXXX)
trap 'rm -rf "$work"' EXIT
archive="$work/$name"

# The connection URI (with the backup user's password) goes to mongodump
# through a 0600 config file rather than an argument, so it never shows in
# the process list. Removed with $work by the trap.
cfg="$work/tools.yaml"
( umask 077 && printf 'uri: "%s"\n' "$BACKUP_MONGO_URI" > "$cfg" )

exclude=()
IFS=',' read -r -a excluded <<< "${BACKUP_EXCLUDE_COLLECTIONS:-}"
for c in "${excluded[@]}"; do
  c=$(echo "$c" | tr -d '[:space:]')
  [ -n "$c" ] && exclude+=("--excludeCollection=$c")
done

echo "backup: dumping $BACKUP_DB (excluding: ${BACKUP_EXCLUDE_COLLECTIONS:-nothing})"
mongodump --config="$cfg" --db="$BACKUP_DB" "${exclude[@]}" \
  --gzip --archive="$archive" --quiet
size=$(du -h "$archive" | cut -f1)

echo "backup: uploading $name ($size) to $BACKUP_REMOTE/daily/"
rclone copyto "$archive" "$BACKUP_REMOTE/daily/$name"
if [ "$(date -u +%u)" = "7" ]; then
  echo "backup: Sunday, also keeping it under weekly/"
  rclone copyto "$BACKUP_REMOTE/daily/$name" "$BACKUP_REMOTE/weekly/$name"
fi

echo "backup: pruning daily/ older than ${BACKUP_KEEP_DAILY_DAYS}d, weekly/ older than ${BACKUP_KEEP_WEEKLY_DAYS}d"
rclone delete --min-age "${BACKUP_KEEP_DAILY_DAYS}d" "$BACKUP_REMOTE/daily/"
rclone delete --min-age "${BACKUP_KEEP_WEEKLY_DAYS}d" "$BACKUP_REMOTE/weekly/"

echo "backup: done ($name, $size). Archives now in R2:"
rclone lsf --format "tsp" "$BACKUP_REMOTE/daily/" | tail -n 3
rclone size "$BACKUP_REMOTE"
