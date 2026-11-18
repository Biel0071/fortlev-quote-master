#!/usr/bin/env bash
# Blue/Green swap with health check + auto rollback.
# Run on the VPS as: sudo ./deploy.sh <image-tag>
set -euo pipefail

IMAGE="${1:?usage: deploy.sh <image>}"
EXPECTED_SHA="${IMAGE##*:}"
COMPOSE_DIR="${COMPOSE_DIR:-/opt/app}"
EDGE_CONF="${EDGE_CONF:-/etc/nginx/conf.d/edge.conf}"

if [[ ! "$EXPECTED_SHA" =~ ^[a-f0-9]{40}$ ]]; then
    echo "!! Production image tag must be a 40-character commit SHA."
    exit 1
fi
if [[ ! -d "$COMPOSE_DIR" || ! -f "$COMPOSE_DIR/docker-compose.yml" ]]; then
    echo "!! Store deployment target is not provisioned at $COMPOSE_DIR."
    exit 1
fi
if [[ ! -f "$EDGE_CONF" || ! -s /etc/letsencrypt/live/materialdecontrucao.online/fullchain.pem ]]; then
    echo "!! Store Nginx edge config or HTTPS certificate is missing."
    exit 1
fi

cd "$COMPOSE_DIR"
if ! docker compose config --quiet; then
    echo "!! Store Docker Compose configuration is invalid."
    exit 1
fi

# Keep the admin publisher on the storefront's HTTPS origin while forwarding
# to the already-running Fenix API Platform on this VPS.
if ! sudo grep -Fq 'location ^~ /api/store-publish/' "$EDGE_CONF"; then
    EDGE_CONF_SETUP_BACKUP="${EDGE_CONF}.publish-setup.bak"
    sudo cp -- "$EDGE_CONF" "$EDGE_CONF_SETUP_BACKUP"
    if ! sudo python3 - "$EDGE_CONF" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
config = path.read_text()
marker = '    client_max_body_size 25M;'
location = '''

    # Same-origin HTTPS bridge to the existing Fenix API Platform.
    location ^~ /api/store-publish/ {
        if ($host !~* "^((www\\.)?materialdecontrucao\\.online)$") { return 404; }
        proxy_pass http://209.50.241.22:3001/admin/store-publish/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header Authorization     $http_authorization;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection        "";
        proxy_buffering off;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
'''
if config.count(marker) != 1:
    raise SystemExit('HTTPS edge configuration marker not found; refusing to rewrite Nginx config.')
path.write_text(config.replace(marker, marker + location, 1))
PY
    then
        sudo cp -- "$EDGE_CONF_SETUP_BACKUP" "$EDGE_CONF"
        echo "!! Could not configure the HTTPS publisher route."
        exit 1
    fi
    if ! sudo nginx -t; then
        sudo cp -- "$EDGE_CONF_SETUP_BACKUP" "$EDGE_CONF"
        sudo nginx -t && sudo systemctl reload nginx
        echo "!! Nginx rejected the publisher route; original config restored."
        exit 1
    fi
    sudo systemctl reload nginx
fi

# Which slot is currently live?
CURRENT=$(grep -E "^\s*server 127\.0\.0\.1:808[12];" "$EDGE_CONF" | grep -v '^\s*#' | head -1 | awk '{print $2}' | tr -d ';')
if [[ "$CURRENT" != "127.0.0.1:8081" && "$CURRENT" != "127.0.0.1:8082" ]]; then
    echo "!! Nginx edge config does not select an active blue/green slot."
    exit 1
fi
if [[ "$CURRENT" == "127.0.0.1:8081" ]]; then
    LIVE=blue;   IDLE=green; IDLE_PORT=8082
else
    LIVE=green;  IDLE=blue;  IDLE_PORT=8081
fi
ROLLBACK_NEEDED=0
rollback_on_exit() {
    local exit_code=$?
    if [[ "$ROLLBACK_NEEDED" == "1" ]]; then
        echo "!! Deployment verification failed. Restoring the previous app slot."
        sudo mv -f "${EDGE_CONF}.bak" "$EDGE_CONF"
        sudo nginx -t && sudo systemctl reload nginx
        docker compose stop "app_$IDLE" || true
    fi
    exit "$exit_code"
}
trap rollback_on_exit EXIT
echo ">> Live=$LIVE  Idle=$IDLE  -> deploying $IMAGE to $IDLE"

# Pull + start idle slot with new image
IMAGE="$IMAGE" docker compose up -d --pull always "app_$IDLE"

# Wait for health
echo ">> Waiting for app_$IDLE health..."
for i in {1..30}; do
    if curl -fsS "http://127.0.0.1:${IDLE_PORT}/healthz" >/dev/null 2>&1; then
        echo ">> app_$IDLE healthy"
        break
    fi
    sleep 2
    if [[ $i -eq 30 ]]; then
        echo "!! Health check failed. Aborting. Live=$LIVE stays."
        docker compose stop "app_$IDLE" || true
        exit 1
    fi
done

# Swap Nginx upstream: comment old, uncomment new
sudo sed -i.bak -E \
    -e "s|^\s*server 127\.0\.0\.1:8081;|    # server 127.0.0.1:8081;|" \
    -e "s|^\s*server 127\.0\.0\.1:8082;|    # server 127.0.0.1:8082;|" \
    "$EDGE_CONF"
sudo sed -i -E "s|^\s*# server 127\.0\.0\.1:${IDLE_PORT};|    server 127.0.0.1:${IDLE_PORT};|" "$EDGE_CONF"

# Validate + reload
if ! sudo nginx -t; then
    echo "!! nginx -t failed. Rolling back."
    sudo mv "${EDGE_CONF}.bak" "$EDGE_CONF"
    ROLLBACK_NEEDED=0
    sudo nginx -t && sudo systemctl reload nginx
    docker compose stop "app_$IDLE" || true
    exit 1
fi
sudo systemctl reload nginx
ROLLBACK_NEEDED=1

echo ">> Traffic now on app_$IDLE. Keeping app_$LIVE warm for rollback."

echo ">> Checking public HTTPS site..."
if ! curl --fail --silent --show-error --retry 4 --retry-delay 3 --retry-all-errors --max-time 20 \
    https://materialdecontrucao.online/healthz -o /dev/null || \
   ! curl --fail --silent --show-error --retry 4 --retry-delay 3 --retry-all-errors --max-time 20 \
    https://materialdecontrucao.online/ -o /dev/null; then
    echo "!! Public HTTPS health check failed. Restoring app_$LIVE."
    exit 1
fi

if ! SERVED_SHA=$(curl --fail --silent --show-error --retry 4 --retry-delay 3 --retry-all-errors --max-time 20 \
    https://materialdecontrucao.online/deploy-version.json | python3 -c 'import json,sys; print(json.load(sys.stdin).get("commit", ""))'); then
    echo "!! Public version marker is missing or invalid. Restoring app_$LIVE."
    exit 1
fi
if [[ "$SERVED_SHA" != "$EXPECTED_SHA" ]]; then
    echo "!! Domain serves $SERVED_SHA; expected $EXPECTED_SHA. Restoring app_$LIVE."
    exit 1
fi
ROLLBACK_NEEDED=0
trap - EXIT

echo ">> To rollback: rerun this script pointing to previous image, or manually swap the sed."
