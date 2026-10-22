#!/bin/bash
# Default command: install the crontab from BACKUP_SCHEDULE and run crond in
# the foreground. Any other command (mongodump, rclone, bash ...) runs as-is,
# which is how the one-off scripts in deploy/bin use this image.
set -euo pipefail

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

: "${BACKUP_SCHEDULE:=30 3 * * *}"
: "${BACKUP_REMOTE:?BACKUP_REMOTE is required}"

# crond starts jobs with an empty environment; the job needs this container's.
# Export every BACKUP_* / RCLONE_CONFIG_* variable into a file the job sources
# first, single-quoted so nothing in a value is expanded or interpreted.
{
  while IFS='=' read -r name value; do
    case "$name" in
      BACKUP_*|RCLONE_CONFIG_*) printf "export %s='%s'\n" "$name" "${value//\'/\'\\\'\'}" ;;
    esac
  done < <(env)
} > /etc/backup.env
chmod 600 /etc/backup.env

echo "$BACKUP_SCHEDULE . /etc/backup.env && /usr/local/bin/backup.sh >> /proc/1/fd/1 2>&1" > /etc/crontabs/root

echo "backup: scheduled '$BACKUP_SCHEDULE' (UTC) -> $BACKUP_REMOTE, excluding ${BACKUP_EXCLUDE_COLLECTIONS:-nothing}"
exec crond -f -l 6
