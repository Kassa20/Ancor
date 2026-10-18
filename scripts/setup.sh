#!/usr/bin/env bash
# One-time setup: checks Node, installs dependencies, creates .env files.
set -euo pipefail
cd "$(dirname "$0")/.."

# Node 22.9+ is needed for --env-file-if-exists (server) and Vite 8 (client).
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
NODE_MINOR=$(node -p 'process.versions.node.split(".")[1]' 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -lt 22 ] || { [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 9 ]; }; then
  echo "Node 22.9+ required (found $(node -v 2>/dev/null || echo none)). Try: nvm install 22 && nvm use 22"
  exit 1
fi

echo "Installing dependencies (client + server workspaces)..."
npm install

for dir in server client; do
  if [ ! -f "$dir/.env" ]; then
    cp "$dir/.env.example" "$dir/.env"
    echo "Created $dir/.env from template"
  fi
done

if ! grep -q '^SUPABASE_SERVICE_ROLE_KEY=.\+' server/.env; then
  echo
  echo "Next: add SUPABASE_SERVICE_ROLE_KEY to server/.env"
  echo "      (Supabase dashboard > Project Settings > API keys)."
fi

echo
echo "Then run the database migration once:"
echo "  Supabase dashboard > SQL Editor > run each file in supabase/migrations/ in filename order"
echo
echo "Setup done. Start the app with: ./scripts/start.sh"
