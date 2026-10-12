#!/bin/bash
# Double-click this file to run the Lucky Lion eBike site locally for presenting.
# It starts a local web server and opens the site in your default browser.

cd "$(dirname "$0")" || exit 1

PORT=8000
# find a free port if 8000 is taken
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done

URL="http://localhost:$PORT"
echo "======================================================"
echo "  Lucky Lion eBike — starting local server"
echo "  Opening: $URL"
echo "  (Close this window to stop the server.)"
echo "======================================================"

# open the browser shortly after the server starts
( sleep 1; open "$URL" ) &

# start the server (foreground; closing the window stops it)
python3 -m http.server "$PORT"
