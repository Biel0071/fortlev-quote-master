#!/usr/bin/env bash
# One-click rollback: swap Nginx upstream to the OTHER slot.
set -euo pipefail
EDGE_CONF="${EDGE_CONF:-/etc/nginx/conf.d/edge.conf}"

CURRENT=$(grep -E "^\s*server 127\.0\.0\.1:808[12];" "$EDGE_CONF" | grep -v '^\s*#' | head -1 | awk '{print $2}' | tr -d ';')
if [[ "$CURRENT" == "127.0.0.1:8081" ]]; then
    FROM=8081; TO=8082
else
    FROM=8082; TO=8081
fi
echo ">> Rolling back: $FROM -> $TO"

sudo sed -i.bak -E \
    -e "s|^\s*server 127\.0\.0\.1:${FROM};|    # server 127.0.0.1:${FROM};|" \
    -e "s|^\s*# server 127\.0\.0\.1:${TO};|    server 127.0.0.1:${TO};|" \
    "$EDGE_CONF"

sudo nginx -t && sudo systemctl reload nginx
echo ">> Rollback done. Now serving from :${TO}"
