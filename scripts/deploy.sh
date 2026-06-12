#!/usr/bin/env bash
# =============================================================================
#  Edustream — Production Deployment Script
#  Mirrors the GitHub Actions pipeline; safe to run manually on the server.
#
#  Usage:
#    chmod +x scripts/deploy.sh
#    ./scripts/deploy.sh [--rollback]
# =============================================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
KEEP_BACKUPS="${KEEP_BACKUPS:-2}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TAG="backup_${TIMESTAMP}"
LOG_FILE="${PROJECT_DIR}/logs/deploy_${TIMESTAMP}.log"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; RESET='\033[0m'

log()  { echo -e "${CYAN}▶ $*${RESET}" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${GREEN}✅ $*${RESET}" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}⚠️  $*${RESET}" | tee -a "$LOG_FILE"; }
err()  { echo -e "${RED}❌ $*${RESET}" | tee -a "$LOG_FILE"; }

# ── Pre-flight ─────────────────────────────────────────────────────────────────
mkdir -p "${PROJECT_DIR}/logs"
cd "$PROJECT_DIR"
echo "=== Edustream Deploy — ${TIMESTAMP} ===" >> "$LOG_FILE"

# ── Rollback mode ─────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--rollback" ]]; then
  warn "Manual rollback requested"
  LATEST_BACKUP=$(docker images --format '{{.Tag}}' \
    | grep '^backup_' | sort -r | head -n1)

  if [ -z "$LATEST_BACKUP" ]; then
    err "No backup images found."
    exit 1
  fi

  warn "Rolling back to: ${LATEST_BACKUP}"
  for SERVICE in backend frontend; do
    BACKUP_IMAGE="edustream_${SERVICE}:${LATEST_BACKUP}"
    if docker image inspect "$BACKUP_IMAGE" &>/dev/null; then
      docker tag "$BACKUP_IMAGE" "edustream-${SERVICE}:latest" 2>/dev/null || true
    fi
  done
  docker compose -f "$COMPOSE_FILE" up -d --no-build --remove-orphans
  ok "Rollback to ${LATEST_BACKUP} complete"
  exit 0
fi

# ── Cleanup handler (runs on any error) ───────────────────────────────────────
on_error() {
  err "Deployment failed at step: ${CURRENT_STEP:-unknown}"
  warn "Attempting automatic rollback..."

  LATEST_BACKUP=$(docker images --format '{{.Tag}}' \
    | grep '^backup_' | sort -r | head -n1 || true)

  if [ -n "$LATEST_BACKUP" ]; then
    for SERVICE in backend frontend; do
      BACKUP_IMAGE="edustream_${SERVICE}:${LATEST_BACKUP}"
      docker image inspect "$BACKUP_IMAGE" &>/dev/null \
        && docker tag "$BACKUP_IMAGE" "edustream-${SERVICE}:latest" 2>/dev/null || true
    done
    docker compose -f "$COMPOSE_FILE" up -d --no-build --remove-orphans \
      && warn "Rollback to ${LATEST_BACKUP} applied" \
      || err "Rollback also failed — manual intervention required"
  else
    err "No backup images — cannot auto-rollback. Logs: ${LOG_FILE}"
  fi
  exit 1
}
trap on_error ERR

# ── Step 1: Git sync ──────────────────────────────────────────────────────────
CURRENT_STEP="git-sync"
log "[1/6] Syncing latest 'host' branch..."
git fetch origin host 2>&1 | tee -a "$LOG_FILE"
git reset --hard origin/host 2>&1 | tee -a "$LOG_FILE"
ok "Git sync complete — $(git log -1 --format='%h %s')"

# ── Step 2: Tag current images as backup ──────────────────────────────────────
CURRENT_STEP="backup"
log "[2/6] Tagging current images as ${BACKUP_TAG}..."
docker compose -f "$COMPOSE_FILE" images -q | while read -r IMAGE_ID; do
  SERVICE=$(docker inspect \
    --format='{{index .Config.Labels "com.docker.compose.service"}}' \
    "$IMAGE_ID" 2>/dev/null || true)
  if [ -n "$SERVICE" ]; then
    docker tag "$IMAGE_ID" "edustream_${SERVICE}:${BACKUP_TAG}" 2>/dev/null \
      && log "  Tagged edustream_${SERVICE}:${BACKUP_TAG}" || true
  fi
done
ok "Backup tagging done"

# ── Step 3: Build ─────────────────────────────────────────────────────────────
CURRENT_STEP="build"
log "[3/6] Building images..."
docker compose -f "$COMPOSE_FILE" build --pull 2>&1 | tee -a "$LOG_FILE"
ok "Build complete"

# ── Step 4: Deploy ────────────────────────────────────────────────────────────
CURRENT_STEP="deploy"
log "[4/6] Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans 2>&1 | tee -a "$LOG_FILE"
ok "Containers started"

# ── Step 5: Health check ──────────────────────────────────────────────────────
CURRENT_STEP="healthcheck"
log "[5/6] Waiting for containers to stabilise (10s)..."
sleep 10
UNHEALTHY=$(docker compose -f "$COMPOSE_FILE" ps \
  | grep -vE "(Up|running)" | grep -v "^NAME" || true)
if [ -n "$UNHEALTHY" ]; then
  err "Unhealthy containers detected:\n${UNHEALTHY}"
  exit 1
fi
ok "Health check passed"

# ── Step 6: Prune old backups ─────────────────────────────────────────────────
CURRENT_STEP="prune"
log "[6/6] Pruning old backups (keep last ${KEEP_BACKUPS})..."
BACKUP_TIMESTAMPS=$(docker images --format '{{.Tag}}' \
  | grep '^backup_' | cut -d_ -f2- | sort -ru | uniq)
TOTAL=$(echo "$BACKUP_TIMESTAMPS" | grep -c . || true)

if [ "$TOTAL" -le "$KEEP_BACKUPS" ]; then
  log "  Only ${TOTAL} backup(s) — nothing to prune"
else
  OLD=$(echo "$BACKUP_TIMESTAMPS" | tail -n +"$((KEEP_BACKUPS + 1))")
  for TS in $OLD; do
    docker images --format '{{.Repository}}:{{.Tag}}' \
      | grep "backup_${TS}" \
      | xargs -r docker rmi -f 2>/dev/null || true
    warn "  Pruned backup_${TS}"
  done
  docker image prune -f >> "$LOG_FILE" 2>&1
fi
ok "Prune complete"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
ok "=== Deployment successful: ${TIMESTAMP} ==="
echo "  Commit : $(git log -1 --format='%h %s')"
echo "  Backup : ${BACKUP_TAG}"
echo "  Log    : ${LOG_FILE}"
echo ""
docker compose -f "$COMPOSE_FILE" ps
