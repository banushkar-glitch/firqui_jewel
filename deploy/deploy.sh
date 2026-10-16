#!/usr/bin/env bash
# Firqui Jewels - build and publish. Run on the server after setup-server.sh,
# and again after every "git pull".
#
# Usage:  sudo bash deploy/deploy.sh

set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_USER="${SUDO_USER:-root}"

# SKIP_BUILD=1 uses a jar that was built elsewhere and copied into backend/target
# (building needs more memory than a 1 GB server comfortably has)
if [ "${SKIP_BUILD:-0}" = "1" ]; then
    echo "==> Using prebuilt backend jar"
else
    echo "==> Building backend"
    sudo -u "$BUILD_USER" sh -c "cd '$REPO_DIR/backend' && sh ./mvnw -q -DskipTests clean package"
fi
JAR="$(ls "$REPO_DIR"/backend/target/*.jar | grep -v original | head -n 1)"
install -o firqui -g firqui -m 644 "$JAR" /opt/firqui/app/firqui.jar

echo "==> Publishing frontend"
# Backup files and the two oversized source images are not used by the site
rsync -a --delete \
    --exclude '*.bak' \
    --exclude 'assets/image.png' \
    --exclude 'assets/home main.png' \
    "$REPO_DIR/frontend/" /var/www/firqui/

echo "==> Copying product images from the repository (existing files are kept)"
if [ -d "$REPO_DIR/uploads" ]; then
    rsync -a --ignore-existing "$REPO_DIR/uploads/" /var/lib/firqui/uploads/
    chown -R firqui:firqui /var/lib/firqui/uploads
fi

echo "==> Restarting backend"
systemctl restart firqui

for i in $(seq 1 120); do
    if curl -fs -o /dev/null http://127.0.0.1:8080/api/products; then
        echo "Backend is up. Deploy finished."
        exit 0
    fi
    sleep 2
done

echo "Backend did not answer within 4 minutes. Check: sudo journalctl -u firqui -n 100 --no-pager"
exit 1
