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

echo "🚀 Starting UAT deployment..."

if [ ! -d "$APP_DIR/.git" ]; then
  echo "❌ Missing git repo at $APP_DIR"
  echo "   Clone: git clone https://github.com/Sahin15/We-Alll-CRM-Website.git $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "📥 Syncing to origin/${BRANCH}..."
git fetch origin "$BRANCH"
git checkout "$BRANCH" 2>/dev/null || git checkout -B "$BRANCH" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"

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

if ! grep -q "Add Objective for" "$WEB_ROOT/assets/js/$(basename "$WORKSPACE_CHUNK")" 2>/dev/null; then
  echo "⚠️  Warning: published bundle may be missing latest goals/objectives UI"
fi

SW_MTIME="$(stat -c '%y' "$WEB_ROOT/sw.js" 2>/dev/null || stat -f '%Sm' "$WEB_ROOT/sw.js")"
echo "✅ sw.js published at: ${SW_MTIME}"

echo "🔄 Restarting UAT backend (crm-uat-api)..."
pm2 restart crm-uat-api || pm2 start src/server.js --name crm-uat-api --cwd "$APP_DIR/backend"
pm2 save

echo "🌐 Updating nginx config..."
NGINX_SITE="/etc/nginx/sites-enabled/crm-uat"
cp deploy/nginx/uat.wealll.cloud.conf "$NGINX_SITE"
nginx -t
systemctl reload nginx

echo ""
echo "✅ UAT deployment complete!"
echo "📌 Commit: ${DEPLOY_COMMIT}"
echo "🌍 UAT site: https://uat.wealll.cloud"
