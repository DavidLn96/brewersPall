#!/usr/bin/env bash
# Runs the migration and RLS tests against a throwaway local Postgres.
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=$(pg_config --bindir)
DIR=$(mktemp -d)
PORT=${PGTEST_PORT:-54329}
"$BIN/initdb" -D "$DIR" -U postgres -A trust >/dev/null
"$BIN/pg_ctl" -D "$DIR" -o "-p $PORT -k $DIR" -l "$DIR/log" start >/dev/null
trap '"$BIN/pg_ctl" -D "$DIR" stop -m fast >/dev/null; rm -rf "$DIR"' EXIT
P="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -c 'create database t' >/dev/null
$P -d t -f tests/stub_supabase.sql
$P -d t -f migrations/*_init.sql
$P -d t -f tests/rls_test.sql
