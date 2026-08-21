#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# CodeDeploy Hook: AfterInstall
# Goal: Set permissions on deployment directory
# ─────────────────────────────────────────────────────────────────────────────

echo "Setting permissions..."
chown -R ubuntu:ubuntu /home/ubuntu/Frontend
chmod -R 755 /home/ubuntu/Frontend
