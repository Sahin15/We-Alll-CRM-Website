#!/bin/bash
# ============================================
# We Alll Office - Deploy Script
# Run on server: bash deploy.sh
# ============================================

set -e  # Stop on any error

echo "🚀 Starting deployment..."

# 1. Stash any local changes and pull latest code
echo "📥 Pulling latest code from GitHub..."
git stash
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

# 4. Restart backend
echo "🔄 Restarting backend..."
pm2 restart all
pm2 save

# 5. Reload nginx
echo "🌐 Reloading nginx..."
systemctl reload nginx

echo ""
echo "✅ Deployment complete!"
echo "🌍 Site is live at https://wealll.cloud"
