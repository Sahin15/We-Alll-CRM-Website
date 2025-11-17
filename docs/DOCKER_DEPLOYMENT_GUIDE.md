# CRM System - Docker Deployment Guide

Deploy your CRM system using Docker containers for easier management and scaling.

---

## 🐳 Why Docker?

### Benefits:
- ✅ Consistent environment (dev = production)
- ✅ Easy updates and rollbacks
- ✅ Isolated containers
- ✅ Simple scaling
- ✅ One-command deployment

---

## 📋 Prerequisites

1. **Server with Docker installed**
2. **Docker Compose installed**
3. **Domain name** (optional)
4. **MongoDB Atlas account** OR use MongoDB container
5. **AWS S3 credentials** (already have)

---

## 🚀 Quick Start (5 Steps)

### Step 1: Create Docker Files

I'll create the necessary Docker files for you.

### Step 2: Configure Environment

Update environment variables.

### Step 3: Build and Run

One command to start everything.

### Step 4: Setup Nginx/Caddy

Reverse proxy for production.

### Step 5: Enable HTTPS

Automatic SSL with Let's Encrypt.

---

## 📝 Detailed Steps

### Step 1: Install Docker on Server

```bash
# Connect to your server
ssh root@your_server_ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose

# Verify installation
docker --version
docker-compose --version

# Add user to docker group (optional)
sudo usermod -aG docker $USER
newgrp docker
```

---

### Step 2: Clone Project

```bash
# Clone your repository
cd ~
git clone https://github.com/yourusername/crm-website.git
cd crm-website
```

---

### Step 3: Create Docker Files

I'll provide the Docker configuration files you need to create.

---

### Step 4: Configure Environment

```bash
# Backend environment
cd ~/crm-website/backend
nano .env.production
```

**Paste:**
```env
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/crm-database
JWT_SECRET=your_super_secret_jwt_key_production
JWT_EXPIRE=30d
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=crm-payment-proofs
PORT=5000
NODE_ENV=production
```

```bash
# Frontend environment
cd ~/crm-website/frontend-new
nano .env.production
```

**Paste:**
```env
VITE_API_URL=https://yourdomain.com/api
```

---

### Step 5: Build and Run

```bash
# From project root
cd ~/crm-website

# Build and start containers
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check running containers
docker ps
```

---

### Step 6: Setup Reverse Proxy (Nginx)

```bash
# Install Nginx on host
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/crm
```

**Paste:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔧 Docker Commands

### Container Management:
```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# Restart containers
docker-compose restart

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild after code changes
docker-compose up -d --build

# Remove all containers and volumes
docker-compose down -v
```

### Debugging:
```bash
# Enter backend container
docker exec -it crm-backend sh

# Enter frontend container
docker exec -it crm-frontend sh

# View container stats
docker stats

# Inspect container
docker inspect crm-backend
```

---

## 🔄 Updating Application

```bash
# Pull latest code
cd ~/crm-website
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build backend
```

---

## 💾 Backup and Restore

### Backup MongoDB (if using container):
```bash
# Backup
docker exec crm-mongodb mongodump --out /backup

# Copy backup to host
docker cp crm-mongodb:/backup ./mongodb-backup-$(date +%Y%m%d)
```

### Restore MongoDB:
```bash
# Copy backup to container
docker cp ./mongodb-backup crm-mongodb:/backup

# Restore
docker exec crm-mongodb mongorestore /backup
```

---

## 📊 Monitoring

### Setup Portainer (Docker GUI):
```bash
docker volume create portainer_data

docker run -d \
  -p 9000:9000 \
  --name portainer \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce

# Access at: http://your_server_ip:9000
```

---

## 🔐 Security Best Practices

1. **Use Docker secrets** for sensitive data
2. **Run containers as non-root user**
3. **Limit container resources** (CPU, memory)
4. **Regular security updates**
5. **Use private Docker registry** for images
6. **Enable Docker Content Trust**
7. **Scan images for vulnerabilities**

---

## 💰 Cost Comparison

### Docker vs Traditional:
- **Same server costs**
- **Easier management** = Less time = Lower maintenance cost
- **Better resource utilization**
- **Faster deployments**

---

## 🎯 Production Checklist

- [ ] Docker and Docker Compose installed
- [ ] Environment variables configured
- [ ] MongoDB connection tested
- [ ] AWS S3 credentials verified
- [ ] Containers running successfully
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Backups automated
- [ ] Monitoring setup
- [ ] Logs configured
- [ ] Health checks enabled

---

## 🚨 Troubleshooting

### Container won't start:
```bash
# Check logs
docker-compose logs backend

# Check if port is in use
sudo lsof -i :5000

# Restart Docker
sudo systemctl restart docker
```

### Cannot connect to MongoDB:
```bash
# Test connection from container
docker exec -it crm-backend sh
node -e "require('mongoose').connect('YOUR_MONGO_URI').then(() => console.log('Connected')).catch(err => console.log(err))"
```

### Out of disk space:
```bash
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune
```

---

## 📈 Scaling with Docker

### Horizontal Scaling:
```bash
# Scale backend to 3 instances
docker-compose up -d --scale backend=3

# Add load balancer (Nginx)
# Configure round-robin
```

### Vertical Scaling:
```yaml
# In docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

---

## 🎓 Next Steps

1. **Learn Docker basics** (if new to Docker)
2. **Setup CI/CD pipeline** (GitHub Actions)
3. **Implement health checks**
4. **Configure log aggregation** (ELK stack)
5. **Setup monitoring** (Prometheus + Grafana)
6. **Automate backups**
7. **Implement blue-green deployment**

---

**Docker makes deployment and management much easier!** 🐳

Choose Docker if you want:
- Easy updates
- Better isolation
- Consistent environments
- Simple scaling
- Modern DevOps practices
