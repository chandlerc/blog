#!/bin/bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR/tools/site-diff"
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies for site-diff..."
  npm ci || npm install
fi
node compare.js "$@"
