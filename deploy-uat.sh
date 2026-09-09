#!/bin/bash
# ============================================
# We Alll Office - UAT Deploy Script
# Run on VPS: bash deploy-uat.sh
#
# Git + build:  /root/crm-website-uat
# nginx root:  /var/www/crm-uat/frontend/dist
# Branch:      staging → uat.wealll.cloud
# ============================================

set -e

APP_DIR="/root/crm-website-uat"
WEB_ROOT="/var/www/crm-uat/frontend/dist"
BRANCH="staging"
NGINX_SITE="/etc/nginx/sites-enabled/crm-uat"

echo "🚀 Starting UAT deployment..."

if [ ! -d "$APP_DIR/.git" ]; then
  echo "❌ Missing git repo at $APP_DIR"
  echo "   Clone: git clone https://github.com/Sahin15/We-Alll-CRM-Website.git $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

if [ "${SKIP_GIT_SYNC:-0}" != "1" ]; then
  echo "📥 Syncing to origin/${BRANCH}..."
  git fetch origin "$BRANCH"
  git checkout "$BRANCH" 2>/dev/null || git checkout -B "$BRANCH" "origin/${BRANCH}"
  git reset --hard "origin/${BRANCH}"
fi

DEPLOY_COMMIT="$(git rev-parse --short HEAD)"
echo "📌 Deploying commit: ${DEPLOY_COMMIT} ($(git log -1 --pretty=%s))"

echo "📦 Installing backend dependencies..."
cd backend
npm install --production
cd ..

echo "🔨 Building frontend (UAT mode)..."
cd frontend
rm -rf node_modules dist
npm install
npm run build:uat
cd ..

WORKSPACE_CHUNK="$(ls frontend/dist/assets/js/project-workspace-*.js 2>/dev/null | head -1 || true)"
if [ -z "$WORKSPACE_CHUNK" ]; then
  echo "❌ Frontend build failed: project-workspace chunk missing"
  exit 1
fi
echo "✅ Built $(basename "$WORKSPACE_CHUNK")"

echo "📂 Publishing static files to ${WEB_ROOT}..."
mkdir -p "$WEB_ROOT"
rsync -a --delete frontend/dist/ "$WEB_ROOT/"
chmod -R o+rX "$WEB_ROOT"

SW_MTIME="$(stat -c '%y' "$WEB_ROOT/sw.js" 2>/dev/null || stat -f '%Sm' "$WEB_ROOT/sw.js")"
echo "✅ sw.js published at: ${SW_MTIME}"

echo "🔄 Ensuring UAT backend (crm-uat-api) runs from ${APP_DIR}/backend..."
if pm2 describe crm-uat-api >/dev/null 2>&1; then
  PM2_CWD="$(pm2 show crm-uat-api 2>/dev/null | awk '/exec cwd/ {print $4; exit}')"
  if [ "$PM2_CWD" != "$APP_DIR/backend" ]; then
    echo "⚠️  Removing stale crm-uat-api (cwd: ${PM2_CWD:-unknown})"
    pm2 delete crm-uat-api
  fi
fi
if pm2 describe crm-uat-backend >/dev/null 2>&1; then
  echo "⚠️  Removing duplicate crm-uat-backend"
  pm2 delete crm-uat-backend
fi
if pm2 describe crm-uat-api >/dev/null 2>&1; then
  pm2 restart crm-uat-api --update-env
else
  pm2 start src/server.js --name crm-uat-api --cwd "$APP_DIR/backend"
fi
pm2 save

echo "🌐 Updating nginx config..."
rm -f "${NGINX_SITE}.bak"
cp deploy/nginx/uat.wealll.cloud.conf "$NGINX_SITE"
nginx -t
systemctl reload nginx

echo ""
echo "✅ UAT deployment complete!"
echo "📌 Commit: ${DEPLOY_COMMIT}"
echo "🌍 UAT site: https://uat.wealll.cloud"
