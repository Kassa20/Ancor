#!/usr/bin/env bash
# Starts the API (port 3001) and the client (port 5173) together. Ctrl-C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d node_modules ] || { echo "Dependencies missing. Run ./scripts/setup.sh first."; exit 1; }
[ -f server/.env ] || echo "Warning: server/.env not found; database calls will fail."

npm run dev --workspace=server &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM

# Wait for the API before opening the client.
for _ in $(seq 1 30); do
  if curl -s -o /dev/null -X POST http://localhost:3001/api/risk/precheck; then break; fi
  sleep 0.5
done

echo
echo "API:    http://localhost:3001"
echo "Client: http://localhost:5173"
echo
npm run dev --workspace=client
