#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
VERSION="$(/usr/bin/python3 - <<'PY'
import json, pathlib
print(json.loads(pathlib.Path("manifest.json").read_text())["version"])
PY
)"
ZIP_PATH="$DIST_DIR/old-address-detector-$VERSION.zip"

mkdir -p "$DIST_DIR"
rm -f "$ZIP_PATH"

cd "$ROOT_DIR"
zip -r "$ZIP_PATH" \
  manifest.json \
  background.js \
  content.js \
  popup.html \
  popup.js \
  options.html \
  options.js \
  shared \
  styles \
  assets/icons

echo "Created $ZIP_PATH"
