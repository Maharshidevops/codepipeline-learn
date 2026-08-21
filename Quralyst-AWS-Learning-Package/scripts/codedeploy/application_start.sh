#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# CodeDeploy Hook: ApplicationStart
# Goal: Build Frontend Docker container, start it, cleanup old images
# ─────────────────────────────────────────────────────────────────────────────

cd /home/ubuntu/Frontend

# Obsolete: Image is now built in CodeBuild to prevent ApplicationStart timeout
# echo "Fetching production secrets from AWS Secrets Manager..."
# aws secretsmanager get-secret-value \
#   --secret-id quralyst/dev/frontend/env \
#   --region us-west-1 \
#   --query SecretString \
#   --output text | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > .env.production
# 
# echo "Building local Docker image..."
# docker build -t quralyst-frontend:latest .
# 
# echo "Removing temporary secrets file..."
# rm -f .env.production

IMAGE_DETAIL="/home/ubuntu/Frontend/imageDetail.json"
if [ ! -f "$IMAGE_DETAIL" ]; then
    echo "ERROR: imageDetail.json not found at ${IMAGE_DETAIL}"
    exit 1
fi

IMAGE_URI=$(jq -r '.ImageURI' "$IMAGE_DETAIL")
ECR_REGISTRY=$(echo "$IMAGE_URI" | cut -d'/' -f1)
AWS_REGION=$(echo "$ECR_REGISTRY" | awk -F'.' '{print $4}')

echo "Logging in to ECR..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "Pulling image: ${IMAGE_URI}"
docker pull "$IMAGE_URI"

echo "Stopping and removing existing frontend container..."
docker stop quralyst-frontend || true
docker rm quralyst-frontend || true

echo "Starting new frontend container..."
docker run -d \
  --name quralyst-frontend \
  --restart unless-stopped \
  -p 8080:80 \
  "$IMAGE_URI"

echo "Cleaning up dangling images..."
docker image prune -f || true
