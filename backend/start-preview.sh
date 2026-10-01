#!/usr/bin/env bash
set -euo pipefail

case "${OWNER_PREVIEW_MODE:-}" in
  True|true|1) ;;
  *) echo "Set OWNER_PREVIEW_MODE=True to run this read-only preview." >&2; exit 1 ;;
esac

# A fresh, isolated directory avoids touching a real database or existing uploads.
OWNER_PREVIEW_ROOT="$(mktemp -d /tmp/akeya-owner-preview.XXXXXX)"
export OWNER_PREVIEW_ROOT

python manage.py migrate --noinput
python manage.py load_owner_preview --confirm-demo
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-10000}" --workers 1 --threads 2 --timeout 60 --access-logfile - --no-control-socket
