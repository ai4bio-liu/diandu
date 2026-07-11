#!/bin/bash
# Double-click this file to start 点读 DianDu.
cd "$(dirname "$0")"
PORT=8321
( sleep 1; open "http://localhost:$PORT" ) &
exec python3 -m http.server $PORT
