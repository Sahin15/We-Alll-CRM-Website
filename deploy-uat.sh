#!/bin/bash
# ============================================
# We Alll Office - UAT Deploy Script
# Run on server: bash deploy-uat.sh
# Path: /var/www/crm-uat
# Branch: staging → uat.wealll.cloud
# ============================================

set -e

echo "🚀 Starting UAT deployment..."

APP_DIR="/var/www/crm-uat"
cd "$APP_DIR"

echo "📥 Pulling latest code from staging..."
git checkout -- backend/package-lock.json frontend/package-lock.json 2>/dev/null || true
git stash push -m "pre-uat-deploy-$(date +%Y%m%d)" 2>/dev/null || true
git pull origin staging

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

echo "🔄 Restarting UAT backend (crm-uat-api)..."
pm2 restart crm-uat-api || pm2 start src/server.js --name crm-uat-api --cwd "$APP_DIR/backend"
pm2 save

echo "🌐 Reloading nginx..."
systemctl reload nginx

echo ""
echo "✅ UAT deployment complete!"
echo "🌍 UAT site: https://uat.wealll.cloud"
