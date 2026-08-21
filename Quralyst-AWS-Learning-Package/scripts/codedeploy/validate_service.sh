#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# CodeDeploy Hook: ValidateService
# Goal: Ensure services are running and healthy
# ─────────────────────────────────────────────────────────────────────────────

echo "Validating Frontend Docker Container (Port 8080)..."
for i in {1..12}; do
  if curl -s -f -L http://127.0.0.1:8080 > /dev/null; then
    echo "Frontend Container is healthy."
    CONTAINER_HEALTHY=true
    break
  fi
  echo "Attempt $i: Frontend Container not responding yet. Waiting 5s..."
  sleep 5
done

if [ "$CONTAINER_HEALTHY" != true ]; then
  echo "Frontend Container failed validation."
  exit 1
fi

echo "Validating Host Nginx Proxy (Port 443 via HTTPS/Localhost)..."
for i in {1..5}; do
  if curl -s -o /dev/null -w "%{http_code}" -L --insecure https://127.0.0.1 | grep -q "200"; then
    echo "Host Nginx is healthy and proxying correctly."
    NGINX_HEALTHY=true
    break
  fi
  echo "Attempt $i: Host Nginx not responding with 200 yet. Waiting 5s..."
  sleep 5
done

if [ "$NGINX_HEALTHY" != true ]; then
  echo "Host Nginx failed validation."
  exit 1
fi

echo "All validations passed successfully."

exit 0
