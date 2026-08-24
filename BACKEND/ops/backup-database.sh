set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

umask 077
script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backup_directory="${BACKUP_DIR:-${script_directory}/../backups}"
backup_file="${backup_directory}/overqualified-$(date -u +%Y%m%dT%H%M%SZ).dump"
temporary_file="${backup_file}.tmp"

mkdir -p "$backup_directory"
trap 'rm -f "$temporary_file"' EXIT
pg_dump --dbname "$DATABASE_URL" --format=custom --no-owner --no-acl --file "$temporary_file"
mv "$temporary_file" "$backup_file"
trap - EXIT
printf '%s\n' "$backup_file"
