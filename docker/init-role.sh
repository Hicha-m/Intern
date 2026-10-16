#!/bin/sh
# Sourced by the official PostgreSQL entrypoint, before the two SQL files.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_password="$APP_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE intern_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'app_password') \gexec
ALTER DATABASE intern OWNER TO intern_user;
SQL
# The following schema/data imports create objects owned by the application role.
export PGOPTIONS='-c role=intern_user'
