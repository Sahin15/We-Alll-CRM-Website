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
sudo mkdir -p /var/www/wealll-crm
sudo cp -r frontend/dist/* /var/www/wealll-crm/
sudo chown -R www-data:www-data /var/www/wealll-crm/
sudo chmod -R 755 /var/www/wealll-crm/

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