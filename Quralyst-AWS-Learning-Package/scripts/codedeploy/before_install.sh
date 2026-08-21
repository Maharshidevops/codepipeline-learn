#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# CodeDeploy Hook: BeforeInstall
# Goal: Prepare environment directory
# ─────────────────────────────────────────────────────────────────────────────

# Create deployment directory if it doesn't exist
mkdir -p /home/ubuntu/Frontend
