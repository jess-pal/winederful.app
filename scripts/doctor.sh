#!/usr/bin/env bash
set -u

echo "Wine Persona Doctor"
echo "==================="

overall=0

check_cmd() {
  local cmd="$1"
  local label="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "[OK]   $label: $(command -v "$cmd")"
  else
    echo "[MISS] $label is not installed"
    overall=1
  fi
}

check_file() {
  local file="$1"
  local label="$2"
  if [ -f "$file" ]; then
    echo "[OK]   $label exists ($file)"
  else
    echo "[MISS] $label missing ($file)"
    overall=1
  fi
}

check_cmd "node" "Node.js"
check_cmd "pnpm" "pnpm"
check_cmd "git" "Git"

if command -v node >/dev/null 2>&1; then
  echo "Node version: $(node -v)"
fi

check_file ".env.local" "Local env file"
check_file "package.json" "Project manifest"
check_file "sql/schema.sql" "Database schema"

echo
if [ "$overall" -eq 0 ]; then
  echo "Doctor check passed."
else
  echo "Doctor found missing requirements."
fi

exit "$overall"
