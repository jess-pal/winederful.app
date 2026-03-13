#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required"
  exit 1
fi

psql "${SUPABASE_DB_URL}" -v ON_ERROR_STOP=1 -f sql/phase6_security_advisor_hardening.sql

