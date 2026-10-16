#!/usr/bin/env bash
# Firqui Jewels - one-time server setup for Ubuntu 22.04 / 24.04 on AWS EC2.
# Installs Java, PostgreSQL, Nginx and Certbot, creates the database, the
# service user, the folders and /etc/firqui/firqui.env with random secrets.
#
# Usage:  sudo bash deploy/setup-server.sh firquijewels.com
# Safe to run again: existing database password, env file and Nginx site are kept.

set -euo pipefail

DOMAIN="${1:?Usage: sudo bash deploy/setup-server.sh <domain>   e.g. firquijewels.com}"
[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE=/etc/firqui/firqui.env
NGINX_SITE=/etc/nginx/sites-available/firqui

echo "==> Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y openjdk-17-jdk-headless postgresql nginx certbot python3-certbot-nginx rsync curl openssl

# Small instances run out of memory while building without swap
if ! swapon --show | grep -q .; then
    echo "==> Adding 2G swap"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Creating user and folders"
id firqui >/dev/null 2>&1 || useradd --system --home /var/lib/firqui --shell /usr/sbin/nologin firqui
mkdir -p /opt/firqui/app /var/www/firqui /etc/firqui /var/backups/firqui \
         /var/lib/firqui/uploads /var/lib/firqui/private_storage/payment_proofs
chown -R firqui:firqui /var/lib/firqui /opt/firqui
chmod 750 /var/lib/firqui/private_storage
chown postgres:postgres /var/backups/firqui

if [ ! -f "$ENV_FILE" ]; then
    echo "==> Creating database and $ENV_FILE"
    DB_PASSWORD="$(openssl rand -hex 24)"
    ADMIN_PASSWORD="$(openssl rand -base64 12 | tr -d '/+=')"

    sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'firqui') THEN
        CREATE ROLE firqui LOGIN PASSWORD '${DB_PASSWORD}';
    ELSE
        ALTER ROLE firqui PASSWORD '${DB_PASSWORD}';
    END IF;
END
\$\$;
SQL
    sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='firqui_jewels'" | grep -q 1 \
        || sudo -u postgres createdb -O firqui firqui_jewels

    cat > "$ENV_FILE" <<ENV
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:postgresql://localhost:5432/firqui_jewels
DB_USERNAME=firqui
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=$(openssl rand -hex 48)
ADMIN_EMAIL=admin@${DOMAIN}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
FRONTEND_URL=https://${DOMAIN}
CORS_ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=
SPRING_MAIL_PASSWORD=
ENV
    chown root:firqui "$ENV_FILE"
    chmod 640 "$ENV_FILE"
else
    echo "==> $ENV_FILE already exists, keeping it"
fi

echo "==> Installing systemd service"
install -m 644 "$DEPLOY_DIR/firqui.service" /etc/systemd/system/firqui.service
systemctl daemon-reload
systemctl enable firqui >/dev/null

if [ ! -f "$NGINX_SITE" ]; then
    echo "==> Installing Nginx site for $DOMAIN"
    sed "s/__DOMAIN__/${DOMAIN}/g" "$DEPLOY_DIR/nginx.conf" > "$NGINX_SITE"
    ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/firqui
    rm -f /etc/nginx/sites-enabled/default
else
    echo "==> Nginx site already exists, keeping it"
fi
nginx -t
systemctl reload nginx

echo "==> Installing nightly database backup (kept 14 days in /var/backups/firqui)"
cat > /usr/local/bin/firqui-backup <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail
pg_dump firqui_jewels | gzip > "/var/backups/firqui/firqui_jewels_$(date +%F).sql.gz"
find /var/backups/firqui -name '*.sql.gz' -mtime +14 -delete
BACKUP
chmod 755 /usr/local/bin/firqui-backup
echo '30 2 * * * postgres /usr/local/bin/firqui-backup' > /etc/cron.d/firqui-backup

echo
echo "Setup finished."
echo "  Admin login : $(grep '^ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2)"
echo "  Admin pass  : sudo grep ADMIN_PASSWORD $ENV_FILE"
echo "Next: sudo bash deploy/deploy.sh"
