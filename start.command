#!/bin/bash
# Double-click in Finder: starts the Strom-Dashboard and opens it in the browser.
# Close the Terminal window (or press Ctrl+C) to stop the server.

cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
URL="http://localhost:4321"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js wurde nicht gefunden. Installieren: https://nodejs.org"
  read -r -p "Enter zum Schließen …"
  exit 1
fi

# Already running (e.g. second double-click)? Just open the browser.
if curl -fs -o /dev/null "$URL/api/settings"; then
  echo "Dashboard läuft bereits: $URL"
  open "$URL"
  exit 0
fi

# Open the browser as soon as the server answers.
(
  for _ in $(seq 1 50); do
    if curl -fs -o /dev/null "$URL/api/settings"; then open "$URL"; exit 0; fi
    sleep 0.2
  done
) &

node server.js || read -r -p "Enter zum Schließen …"
