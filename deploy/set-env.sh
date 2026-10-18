#!/usr/bin/env bash
# Firqui Jewels - put shop settings (email, UPI, contact address...) into the
# server's environment file without touching the generated secrets.
#
# 1. On your laptop, copy deploy/prod-values.env.example to a file OUTSIDE the
#    repository (e.g. firqui-prod.env), fill it in, and copy it to the server:
#       scp -i your-key.pem firqui-prod.env ubuntu@SERVER_IP:~/
# 2. On the server:
#       sudo bash deploy/set-env.sh ~/firqui-prod.env
#
# Only the keys listed below are accepted. The values file is deleted afterwards.

set -euo pipefail

VALUES="${1:?Usage: sudo bash deploy/set-env.sh <values-file>}"
ENV_FILE=/etc/firqui/firqui.env
ALLOWED="SPRING_MAIL_HOST SPRING_MAIL_PORT SPRING_MAIL_USERNAME SPRING_MAIL_PASSWORD CONTACT_EMAIL UPI_ID UPI_PAYEE_NAME FRONTEND_URL CORS_ALLOWED_ORIGINS ADMIN_EMAIL"

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }
[ -f "$ENV_FILE" ] || { echo "$ENV_FILE not found. Run deploy/setup-server.sh first."; exit 1; }
[ -f "$VALUES" ] || { echo "$VALUES not found."; exit 1; }

cp -p "$ENV_FILE" "$ENV_FILE.bak"
changed=0

while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in ''|\#*) continue ;; esac
    key="${line%%=*}"
    value="${line#*=}"
    if [[ " $ALLOWED " != *" $key "* ]]; then
        echo "Skipping $key (not a shop setting this script manages)"
        continue
    fi
    if [ -z "$value" ]; then
        echo "Skipping $key (empty)"
        continue
    fi
    # Replace the line if the key exists, otherwise append it
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" 'BEGIN{done=0} index($0, k"=")==1 {print k"="v; done=1; next} {print} END{if(!done) print k"="v}' "$ENV_FILE" > "$tmp"
    cat "$tmp" > "$ENV_FILE"
    rm -f "$tmp"
    echo "Set $key"
    changed=$((changed + 1))
done < "$VALUES"

chown root:firqui "$ENV_FILE"
chmod 640 "$ENV_FILE"
shred -u "$VALUES" 2>/dev/null || rm -f "$VALUES"

if [ "$changed" -gt 0 ]; then
    echo "Updated $changed setting(s). Previous file kept as $ENV_FILE.bak"
    if systemctl is-active --quiet firqui; then
        systemctl restart firqui
        echo "Backend restarted."
    fi
else
    echo "Nothing changed."
fi
