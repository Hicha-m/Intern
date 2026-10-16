#!/bin/sh
set -eu
# Restore the three private fictitious PDFs referenced by the delivered SQL.
for account in alice bob vide; do
  mkdir -p "/app/.private-media/dev/$account"
  if [ ! -f "/app/.private-media/dev/$account/cv.pdf" ]; then
    cp /app/donnees/cv_fictif.pdf "/app/.private-media/dev/$account/cv.pdf"
    chmod 600 "/app/.private-media/dev/$account/cv.pdf"
  fi
done
.venv/bin/python app/manage.py migrate --check
.venv/bin/python app/manage.py collectstatic --noinput
exec .venv/bin/gunicorn --chdir app config.wsgi:application --bind 0.0.0.0:8000 \
  --workers 2 --timeout 90 --access-logfile -
