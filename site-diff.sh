#!/bin/bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR/tools/site-diff"
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies for site-diff..."
  npm ci || npm install
fi
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo "Downloading the pinned Chromium build for site-diff..."
  npm run setup
fi
node site-diff.js "$@"
