#!/usr/bin/env sh
# Builds dist/follow-restore-<version>.zip for store upload.
# Ships: manifest, src, icons (PNG), PRIVACY.md, LICENSE, README.md.
# Excludes: git metadata, tests, node_modules, package.json, PUBLISHING.md, scripts, the SVG source.
set -eu
cd "$(dirname "$0")/.."
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json | head -1)
mkdir -p dist
OUT="dist/follow-restore-${VERSION}.zip"
rm -f "$OUT"
zip -r -X "$OUT" manifest.json src/content.js icons/icon16.png icons/icon48.png icons/icon128.png PRIVACY.md LICENSE README.md
echo "wrote $OUT"
unzip -l "$OUT"
