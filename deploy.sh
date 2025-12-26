#!/bin/bash

# CRM Production Deployment Script
# Run this script on your production server

set -e  # Exit on any error

echo "🚀 Starting CRM Production Deployment..."

# Check if required files exist
if [ ! -f "backend/.env.production" ]; then
    echo "❌ ERROR: backend/.env.production not found!"
    echo "Please create this file with your production environment variables."
    echo "Use backend/.env.example as a template."
    exit 1
fi

if [ ! -f "frontend/.env.production" ]; then
    echo "❌ ERROR: frontend/.env.production not found!"
    echo "Please create this file with your production environment variables."
    echo "Use frontend/.env.example as a template."
    exit 1
fi

# Check if SSL certificates exist
if [ ! -d "ssl" ]; then
    echo "⚠️  WARNING: SSL certificates not found in ./ssl directory"
    echo "Please add your SSL certificates (cert.pem and key.pem) to ./ssl/"
    echo "For now, creating self-signed certificates for testing..."
    mkdir -p ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🏥 Performing health checks..."
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend health check failed"
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Replace self-signed SSL certificates with real ones"
echo "3. Set up monitoring and backups"
echo "4. Test all functionality"
echo ""
echo "🔗 Access your application:"
echo "   Frontend: https://your-domain.com"
echo "   Backend API: https://your-domain.com/api"
echo ""
echo "📊 Monitor logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"