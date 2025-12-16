#!/bin/bash

# Hostinger VPS Deployment Script
# This script deploys the CRM application to Hostinger VPS

set -e  # Exit on any error

# Configuration
SERVER_USER="root"  # Change this to your VPS username
SERVER_HOST=""      # Add your Hostinger VPS IP address
APP_NAME="crm-app"
DEPLOY_PATH="/var/www/crm-app"
BACKUP_PATH="/var/backups/crm-app"
DOMAIN=""           # Add your domain name

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if configuration is set
check_config() {
    if [ -z "$SERVER_HOST" ]; then
        log_error "Please set SERVER_HOST in the script"
        exit 1
    fi
    
    if [ -z "$DOMAIN" ]; then
        log_warning "DOMAIN not set. Using IP address for deployment"
    fi
}

# Check if we can connect to the server
check_connection() {
    log_info "Checking connection to $SERVER_HOST..."
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_HOST exit 2>/dev/null; then
        log_success "Connection to server successful"
    else
        log_error "Cannot connect to server. Please check your SSH configuration"
        exit 1
    fi
}

# Install dependencies on server
install_dependencies() {
    log_info "Installing dependencies on server..."
    ssh $SERVER_USER@$SERVER_HOST << 'EOF'
        # Update system
        apt update && apt upgrade -y
        
        # Install Docker
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            systemctl start docker
            systemctl enable docker
        fi
        
        # Install Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi
        
        # Install Nginx (for reverse proxy)
        if ! command -v nginx &> /dev/null; then
            apt install -y nginx
            systemctl start nginx
            systemctl enable nginx
        fi
        
        # Install Node.js (for direct deployment option)
        if ! command -v node &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt install -y nodejs
        fi
        
        # Install PM2 (process manager)
        if ! command -v pm2 &> /dev/null; then
            npm install -g pm2
        fi
        
        # Install MongoDB (if not using external service)
        if ! command -v mongod &> /dev/null; then
            wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
            echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            apt update
            apt install -y mongodb-org
            systemctl start mongod
            systemctl enable mongod
        fi
EOF
    log_success "Dependencies installed"
}

# Create backup of current deployment
create_backup() {
    log_info "Creating backup of current deployment..."
    ssh $SERVER_USER@$SERVER_HOST << EOF
        if [ -d "$DEPLOY_PATH" ]; then
            mkdir -p $BACKUP_PATH
            BACKUP_NAME="backup-\$(date +%Y%m%d-%H%M%S)"
            cp -r $DEPLOY_PATH $BACKUP_PATH/\$BACKUP_NAME
            echo "Backup created: $BACKUP_PATH/\$BACKUP_NAME"
        fi
EOF
    log_success "Backup created"
}

# Deploy application files
deploy_files() {
    log_info "Deploying application files..."
    
    # Create deployment directory
    ssh $SERVER_USER@$SERVER_HOST "mkdir -p $DEPLOY_PATH"
    
    # Copy files to server
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'frontend/dist' \
        --exclude 'backend/uploads' \
        ./ $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/
    
    log_success "Files deployed"
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."
    ssh $SERVER_USER@$SERVER_HOST << EOF
        cd $DEPLOY_PATH
        
        # Create backend .env file
        cat > backend/.env << 'ENVEOF'
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/crm_production
JWT_SECRET=\$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://$DOMAIN
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket
ENVEOF

        # Create frontend .env file
        cat > frontend/.env.production << 'ENVEOF'
VITE_API_URL=https://$DOMAIN/api
VITE_APP_NAME=CRM System
ENVEOF

        chmod 600 backend/.env frontend/.env.production
EOF
    log_success "Environment variables configured"
}

# Build and start application with Docker
deploy_with_docker() {
    log_info "Deploying with Docker..."
    
    # Create docker-compose.yml
    ssh $SERVER_USER@$SERVER_HOST << EOF
        cd $DEPLOY_PATH
        cat > docker-compose.yml << 'DOCKEREOF'
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: crm-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: \$(openssl rand -base64 32)
    volumes:
      - mongodb_data:/data/db
    networks:
      - crm-network

  backend:
    build: ./backend
    container_name: crm-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/crm_production
    depends_on:
      - mongodb
    volumes:
      - ./backend/uploads:/app/uploads
    networks:
      - crm-network

  frontend:
    build: ./frontend
    container_name: crm-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - crm-network

volumes:
  mongodb_data:

networks:
  crm-network:
    driver: bridge
DOCKEREOF

        # Build and start containers
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
EOF
    log_success "Docker deployment completed"
}

# Deploy without Docker (direct deployment)
deploy_direct() {
    log_info "Deploying directly (without Docker)..."
    
    ssh $SERVER_USER@$SERVER_HOST << EOF
        cd $DEPLOY_PATH
        
        # Install backend dependencies
        cd backend
        npm install --production
        
        # Install frontend dependencies and build
        cd ../frontend
        npm install
        npm run build
        
        # Start backend with PM2
        cd ../backend
        pm2 stop crm-backend || true
        pm2 delete crm-backend || true
        pm2 start src/server.js --name crm-backend --env production
        
        # Configure Nginx for frontend
        cat > /etc/nginx/sites-available/crm << 'NGINXEOF'
server {
    listen 80;
    server_name $DOMAIN;
    
    # Frontend
    location / {
        root $DEPLOY_PATH/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF
        
        # Enable site
        ln -sf /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
        nginx -t && systemctl reload nginx
        
        # Save PM2 configuration
        pm2 save
        pm2 startup
EOF
    log_success "Direct deployment completed"
}

# Setup SSL certificate
setup_ssl() {
    if [ -n "$DOMAIN" ]; then
        log_info "Setting up SSL certificate..."
        ssh $SERVER_USER@$SERVER_HOST << EOF
            # Install Certbot
            apt install -y certbot python3-certbot-nginx
            
            # Get SSL certificate
            certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
            
            # Setup auto-renewal
            (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
EOF
        log_success "SSL certificate configured"
    else
        log_warning "Skipping SSL setup (no domain configured)"
    fi
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check if services are running
    ssh $SERVER_USER@$SERVER_HOST << EOF
        echo "Checking services..."
        
        # Check Docker containers (if using Docker)
        if command -v docker-compose &> /dev/null; then
            cd $DEPLOY_PATH
            docker-compose ps
        fi
        
        # Check PM2 processes (if using direct deployment)
        if command -v pm2 &> /dev/null; then
            pm2 status
        fi
        
        # Check Nginx
        systemctl status nginx --no-pager
        
        # Check MongoDB
        systemctl status mongod --no-pager
        
        # Test API endpoint
        curl -f http://localhost:5000/api/health || echo "API health check failed"
EOF
    
    log_success "Deployment verification completed"
}

# Main deployment function
main() {
    log_info "Starting deployment to Hostinger VPS..."
    
    check_config
    check_connection
    install_dependencies
    create_backup
    deploy_files
    setup_environment
    
    # Choose deployment method
    echo "Choose deployment method:"
    echo "1) Docker (recommended)"
    echo "2) Direct deployment"
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        1)
            deploy_with_docker
            ;;
        2)
            deploy_direct
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
    
    setup_ssl
    verify_deployment
    
    log_success "Deployment completed successfully!"
    log_info "Your application should be available at: http://$DOMAIN"
    
    if [ -n "$DOMAIN" ]; then
        log_info "HTTPS URL: https://$DOMAIN"
    fi
}

# Run main function
main "$@"