#!/bin/bash

# CRM Website Deployment Script
echo "🚀 Starting deployment..."

# Build frontend for production
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Copy built files to server web directory
echo "📁 Copying files to web directory..."
sudo mkdir -p /var/www/html
sudo cp -r frontend/dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

# Install backend dependencies
echo "⚙️ Installing backend dependencies..."
cd backend
npm install --production
cd ..

# Restart services
echo "🔄 Restarting services..."
pm2 restart crm-backend || pm2 start backend/src/server.js --name "crm-backend"

# Reload Nginx
echo "🌐 Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo "🌍 Website: https://wealll.cloud"