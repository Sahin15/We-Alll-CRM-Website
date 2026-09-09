#!/bin/bash
# First-time UAT VPS setup (steps 6–12)
# Run on Hostinger VPS as deploy user: bash deploy/setup-uat-vps.sh
set -e

APP_DIR="/root/crm-website-uat"
WEB_ROOT="/var/www/crm-uat/frontend/dist"
REPO="https://github.com/Sahin15/We-Alll-CRM-Website.git"
BRANCH="staging"

echo "=== Step 6: Clone / update UAT app ==="
mkdir -p "$WEB_ROOT"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
else
  echo "Repo already exists at $APP_DIR — pulling latest staging..."
fi

cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "=== Step 8: Backend .env ==="
if [ ! -f backend/.env ]; then
  cp backend/.env.uat.example backend/.env
  echo ""
  echo "⚠️  Created backend/.env from template."
  echo "    Edit it NOW before continuing (MONGO_URI, JWT_SECRET, AWS, etc.):"
  echo "    nano $APP_DIR/backend/.env"
  echo ""
  read -r -p "Press Enter after you have saved backend/.env ..." _
else
  echo "backend/.env already exists — skipping copy"
fi

echo "=== Step 9: Backend install + PM2 ==="
cd "$APP_DIR/backend"
npm install --production
if pm2 describe crm-uat-api >/dev/null 2>&1; then
  pm2 restart crm-uat-api
else
  pm2 start src/server.js --name crm-uat-api
fi
pm2 save

echo "=== Step 10: Frontend build + publish (UAT mode) ==="
bash "$APP_DIR/deploy-uat.sh"

echo "=== Step 11: nginx + SSL ==="
sudo cp "$APP_DIR/deploy/nginx/uat.wealll.cloud.conf" /etc/nginx/sites-enabled/crm-uat
if [ ! -f /etc/letsencrypt/live/uat.wealll.cloud/fullchain.pem ]; then
  echo "Running certbot for uat.wealll.cloud ..."
  sudo certbot --nginx -d uat.wealll.cloud --non-interactive --agree-tos -m sahin@wealll.cloud || {
    echo "certbot failed — run manually: sudo certbot --nginx -d uat.wealll.cloud"
  }
fi
sudo nginx -t && sudo systemctl reload nginx

echo "=== Step 12: Seed demo data ==="
cd "$APP_DIR/backend"
npm run seed:uat

echo ""
echo "✅ UAT setup complete!"
echo "🌍 https://uat.wealll.cloud"
echo "   Demo logins: *@demo.wealll.local (password printed above by seed script)"
