#!/bin/sh
# Glue src/*.js (in name order) into the single file HACS serves.
set -e
cd "$(dirname "$0")"
cat src/*.js > universal-3d-cards.js
echo "universal-3d-cards.js: $(wc -c < universal-3d-cards.js) bytes"
