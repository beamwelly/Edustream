#!/usr/bin/env bash
# =============================================================================
#  Edustream — One-Time Server Setup Script
#  Run this ONCE on your production server to prepare it for CI/CD.
#  Usage: bash scripts/server_setup.sh
# =============================================================================
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-$(whoami)}"
PROJECT_DIR="${PROJECT_DIR:-$HOME/Edustream}"
BRANCH="host"

echo "==== Edustream Server Setup ===="
echo "User       : ${DEPLOY_USER}"
echo "Project Dir: ${PROJECT_DIR}"
echo "Branch     : ${BRANCH}"
echo ""

# ── 1. Authorised Keys ────────────────────────────────────────────────────────
echo "▶ [1/4] Checking authorized_keys..."
mkdir -p ~/.ssh && chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
echo ""
echo "Paste the CI/CD PUBLIC key below (then press Enter + Ctrl-D):"
cat >> ~/.ssh/authorized_keys
echo "✅ Key added to authorized_keys"

# ── 2. Project directory ──────────────────────────────────────────────────────
echo "▶ [2/4] Cloning / verifying repository..."
if [ -d "${PROJECT_DIR}/.git" ]; then
  echo "  Repo already exists at ${PROJECT_DIR}"
  cd "${PROJECT_DIR}"
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
else
  echo "  Cloning into ${PROJECT_DIR}..."
  read -rp "  Enter your repository SSH URL: " REPO_URL
  git clone --branch "${BRANCH}" "${REPO_URL}" "${PROJECT_DIR}"
  cd "${PROJECT_DIR}"
fi
echo "✅ Repository ready"

# ── 3. .env file ─────────────────────────────────────────────────────────────
echo "▶ [3/4] Setting up .env..."
if [ ! -f "${PROJECT_DIR}/.env" ]; then
  cp "${PROJECT_DIR}/.env.example" "${PROJECT_DIR}/.env"
  echo ""
  echo "⚠️  .env created from .env.example — fill in all secrets before deploying:"
  echo "   nano ${PROJECT_DIR}/.env"
else
  echo "  .env already exists — skipping"
fi

# ── 4. Permissions ────────────────────────────────────────────────────────────
echo "▶ [4/4] Making scripts executable..."
chmod +x "${PROJECT_DIR}/scripts/"*.sh
echo "✅ Permissions set"

echo ""
echo "======================================"
echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env:          nano ${PROJECT_DIR}/.env"
echo "  2. Add GitHub Secrets (Settings → Secrets → Actions):"
echo "       SSH_PRIVATE_KEY    — private key matching the public key added above"
echo "       SERVER_HOST        — your server IP or hostname"
echo "       SERVER_USER        — ${DEPLOY_USER}"
echo "       SLACK_WEBHOOK_URL  — (optional) Slack incoming webhook"
echo "  3. Push to 'host' branch to trigger the first deploy."
echo "======================================"
