#!/usr/bin/env bash
# Firqui Jewels - ship the current code to the server.
# Used by the GitHub Actions workflow on every push to main, and by hand:
#
#   bash deploy/release.sh ubuntu@13.233.12.191 ~/.ssh/firqui_admin
#
# Builds the backend jar from the committed code (the 1 GB server is too small to
# build), sends the jar, the website and the deploy scripts over SSH, then runs
# deploy/deploy.sh on the server with SKIP_BUILD=1. Data, uploads and settings on
# the server are kept.

set -euo pipefail

TARGET="${1:?Usage: bash deploy/release.sh <user@host> [ssh-key-file]}"
KEY="${2:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=20)
[ -n "$KEY" ] && SSH+=(-i "$KEY")

# Ship exactly what is committed: build from a clean copy of HEAD, so local edits
# (for example passwords in a developer's application.properties) never get packed
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
git -C "$ROOT" archive HEAD frontend deploy backend | tar xf - -C "$WORK"
echo "==> Releasing commit $(git -C "$ROOT" rev-parse --short HEAD)"
if [ -n "$(git -C "$ROOT" status --porcelain -- frontend deploy backend)" ]; then
    echo "    (uncommitted changes in this checkout are NOT included)"
fi

cd "$WORK"
echo "==> Building backend"
(cd backend && sh ./mvnw -B -q -DskipTests package)
JAR="$(ls backend/target/*.jar | grep -v original | head -n 1)"
echo "==> Shipping $(basename "$JAR"), frontend and deploy scripts to $TARGET"

# The release replaces ~/firqui_release on the server as a whole
tar czf -     --exclude='*.bak'     --exclude='frontend/assets/image.png'     --exclude='frontend/assets/home main.png'     frontend deploy "$JAR"   | "${SSH[@]}" "$TARGET" '
        set -e
        rm -rf ~/firqui_release.new && mkdir -p ~/firqui_release.new
        tar xzf - -C ~/firqui_release.new
        rm -rf ~/firqui_release && mv ~/firqui_release.new ~/firqui_release
        sudo env SKIP_BUILD=1 bash ~/firqui_release/deploy/deploy.sh
    '
echo "==> Release finished"
