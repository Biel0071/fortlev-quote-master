#!/usr/bin/env bash
# Blue/Green swap with health check + auto rollback.
# Run on the VPS as: sudo ./deploy.sh <image-tag>
set -euo pipefail

IMAGE="${1:?usage: deploy.sh <image>}"
COMPOSE_DIR="${COMPOSE_DIR:-/opt/app}"
EDGE_CONF="${EDGE_CONF:-/etc/nginx/conf.d/edge.conf}"

cd "$COMPOSE_DIR"

# Which slot is currently live?
CURRENT=$(grep -E "^\s*server 127\.0\.0\.1:808[12];" "$EDGE_CONF" | grep -v '^\s*#' | head -1 | awk '{print $2}' | tr -d ';')
if [[ "$CURRENT" == "127.0.0.1:8081" ]]; then
    LIVE=blue;   IDLE=green; IDLE_PORT=8082
else
    LIVE=green;  IDLE=blue;  IDLE_PORT=8081
fi
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
    sudo nginx -t && sudo systemctl reload nginx
    docker compose stop "app_$IDLE" || true
    exit 1
fi
sudo systemctl reload nginx

echo ">> Traffic now on app_$IDLE. Keeping app_$LIVE warm for rollback."
echo ">> To rollback: rerun this script pointing to previous image, or manually swap the sed."
