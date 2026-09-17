#!/bin/bash
# ============================================
# We Alll Office - Deploy Script
# Run on server: bash deploy.sh
# ============================================

set -e  # Stop on any error

echo "🚀 Starting deployment..."

# 1. Pull latest code (discard local lockfile drift from npm install on server)
echo "📥 Pulling latest code from GitHub..."
git checkout -- backend/package-lock.json frontend/package-lock.json 2>/dev/null || true
git stash push -m "pre-deploy-$(date +%Y%m%d)" 2>/dev/null || true
git pull origin main

# 2. Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production
cd ..

# 3. Build frontend
echo "🔨 Building frontend..."
cd frontend
rm -rf node_modules dist
npm install
npm run build
cd ..

# 4. Restart backend (We Alll CRM only — wealll-backend is inventory, not CRM)
echo "🔄 Restarting backend..."
if [ -f backend/.env ]; then
  if ! grep -qE '^[[:space:]]*WEBSITE_LEAD_ALLOWED_ORIGINS=' backend/.env; then
    echo "⚠️  WARNING: WEBSITE_LEAD_ALLOWED_ORIGINS is not set in backend/.env"
    echo "   Production requires: https://wealll.com,https://www.wealll.com (no localhost)"
  fi
  if ! grep -qE '^[[:space:]]*CORS_ORIGIN=' backend/.env; then
    echo "⚠️  WARNING: CORS_ORIGIN is not set in backend/.env"
  fi
else
  echo "⚠️  WARNING: backend/.env not found — set production secrets on the server before traffic"
fi
pm2 restart wealll-office-backend
pm2 save

# 5. Reload nginx
echo "🌐 Reloading nginx..."
systemctl reload nginx

echo ""
echo "✅ Deployment complete!"
echo "🌍 Site is live at https://wealll.cloud"
