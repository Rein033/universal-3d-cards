#!/bin/sh
# Glue src/*.js (in name order) into the single file HACS serves.
set -e
cd "$(dirname "$0")"
cat src/*.js > 3d-printer-card.js
echo "3d-printer-card.js: $(wc -c < 3d-printer-card.js) bytes"
