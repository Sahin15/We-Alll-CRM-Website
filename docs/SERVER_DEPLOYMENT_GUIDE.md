# CRM System - Server Deployment Guide

Complete step-by-step guide to deploy your CRM system on a production server.

---

## 📋 Prerequisites

### What You Need:
1. **VPS/Cloud Server**:
   - ✅ **Hostinger VPS KVM 2** (You already have this!)
   - Specifications: 2 GB RAM, 2 CPU Cores, 50 GB SSD
   - Operating System: Ubuntu 22.04 LTS
   
   **Alternative providers:**
   - DigitalOcean Droplet ($6-12/month)
   - AWS EC2 (t2.micro free tier or t2.small)
   - Linode ($5-10/month)
   - Vultr ($6-12/month)

2. **Server Specifications** (Your Hostinger VPS KVM 2):
   - ✅ 2 GB RAM
   - ✅ 2 CPU Cores
   - ✅ 50 GB SSD
   - ✅ Ubuntu 22.04 LTS (recommended)

3. **Domain Name** (Optional but recommended):
   - Example: yourdomain.com
   - Can buy from Namecheap, GoDaddy, etc. ($10-15/year)

4. **MongoDB** (Choose one):
   - MongoDB Atlas (Free tier: 512MB)
   - Self-hosted on same server
   - Separate MongoDB server

5. **AWS Account** (Already have):
   - For S3 storage (already configured)

---

## 🚀 Deployment Options

### Option 1: Simple Deployment (Recommended for Testing)
- Direct deployment with PM2
- Nginx as reverse proxy
- Quick setup (30-45 minutes)

### Option 2: Docker Deployment (Recommended for Production)
- Containerized application
- Easy scaling and updates
- Setup time: 45-60 minutes

### Option 3: Managed Services (Easiest but Costly)
- Frontend: Vercel/Netlify (Free tier available)
- Backend: Railway/Render ($5-10/month)
- Database: MongoDB Atlas (Free tier)

---

## 📝 OPTION 1: Simple Deployment (Step-by-Step)

### Step 1: Get a Server

#### ✅ Hostinger VPS KVM 2 (You Already Have This!):

**Your Server Details:**
- **Plan:** VPS KVM 2
- **RAM:** 2 GB
- **CPU:** 2 Cores
- **Storage:** 50 GB SSD
- **OS:** Ubuntu 22.04 LTS (should be installed)

**What You Need from Hostinger:**
1. Log in to Hostinger hPanel
2. Go to VPS section
3. Note down:
   - ✅ Server IP address
   - ✅ Root password (or SSH key)
   - ✅ SSH port (usually 22)

**Hostinger VPS Access:**
- You can access via hPanel's built-in terminal OR
- Use SSH from your computer (recommended)

#### Alternative Providers (For Reference):
- DigitalOcean Droplet ($6-12/month)
- AWS EC2 (t2.small)
- Linode ($5-10/month)

---

### Step 2: Connect to Your Hostinger VPS

#### Get Your Connection Details:
1. Log in to Hostinger hPanel
2. Go to VPS → Your VPS
3. Find:
   - **IP Address:** (e.g., 123.45.67.89)
   - **Root Password:** (or reset it)
   - **SSH Port:** Usually 22

#### Windows (using PowerShell or CMD):
```bash
# Connect to Hostinger VPS
ssh root@your_hostinger_ip

# Enter password when prompted
```

#### Alternative: Use Hostinger's Built-in Terminal
- In hPanel → VPS → Browser Terminal
- Click "Open Terminal"
- Already logged in as root

#### First Login - Update System:
```bash
# Update system packages
apt update && apt upgrade -y

# This may take 5-10 minutes
# Press Y when asked to continue

# Reboot if kernel was updated
reboot

# Wait 1 minute, then reconnect
ssh root@your_hostinger_ip
```

---

### Step 3: Install Required Software

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Nginx (Web Server)
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install build tools (for some npm packages)
sudo apt install -y build-essential
```

---

### Step 4: Setup MongoDB

#### ✅ You Already Have MongoDB Setup!

**What You Need:**
1. Your MongoDB connection string (from your personal account)
2. Make sure it's accessible from your Hostinger VPS

**Test Your MongoDB Connection:**
```bash
# Install MongoDB Shell (mongosh) to test
curl -fsSL https://www.mongodb.com/try/download/shell | bash

# Test connection (replace with your connection string)
mongosh "mongodb+srv://username:password@cluster.mongodb.net/crm-database"

# If it connects successfully, you're good!
# Type 'exit' to quit
```

**Important: Whitelist Hostinger VPS IP**
1. Go to MongoDB Atlas
2. Network Access → Add IP Address
3. Add your Hostinger VPS IP: `your_hostinger_ip`
4. OR use `0.0.0.0/0` (allow from anywhere - easier for now)

**Later: Switching to Company Account**
- When ready, just change the connection string in .env
- Takes 5 minutes, no data migration needed
- Can export/import data if needed

#### Option B: Install MongoDB on Hostinger VPS (Not Recommended)

```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

---

### Step 5: Clone Your Project

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/yourusername/crm-website.git
# OR upload files using SCP/SFTP

# Navigate to project
cd crm-website
```

---

### Step 6: Setup Backend

```bash
# Navigate to backend
cd ~/crm-website/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
```

**Paste this in .env file:**
```env
# MongoDB (use YOUR existing connection string)
MONGO_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/crm-database?retryWrites=true&w=majority

# JWT (generate a strong random secret)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
JWT_EXPIRE=30d

# AWS S3 (use YOUR existing credentials)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=crm-payment-proofs

# Server
PORT=5000
NODE_ENV=production

# Email (optional - for future use)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

**Important Notes:**
- ✅ Use YOUR MongoDB connection string (from your personal account)
- ✅ Use YOUR AWS S3 credentials (already configured)
- ✅ Generate a strong JWT_SECRET (random string, 32+ characters)
- ✅ Keep this file secure - never commit to git!

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

```bash
# Test backend
npm start

# If it works, stop it (Ctrl+C) and start with PM2
pm2 start src/server.js --name crm-backend
pm2 save
pm2 startup
```

---

### Step 7: Build Frontend

```bash
# Navigate to frontend
cd ~/crm-website/frontend-new

# Install dependencies
npm install

# Create production .env file
nano .env
```

**Paste this:**
```env
VITE_API_URL=http://your_server_ip:5000/api
# OR if using domain:
# VITE_API_URL=https://api.yourdomain.com/api
```

**Save and exit**

```bash
# Build for production
npm run build

# This creates a 'dist' folder with optimized files
```

---

### Step 8: Setup Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/crm
```

**Paste this configuration:**

```nginx
# Backend API
server {
    listen 80;
    server_name your_hostinger_ip;  # Replace with your actual IP (e.g., 123.45.67.89)

    # API requests
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for large uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Frontend
    location / {
        root /home/crm/crm-website/frontend-new/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Increase max upload size for payment proofs
    client_max_body_size 10M;
}
```

**Save and exit**

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

---

### Step 9: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

### Step 10: Test Your Application

1. **Open browser and go to:**
   ```
   http://your_hostinger_ip
   ```
   Replace `your_hostinger_ip` with your actual IP (e.g., http://123.45.67.89)

2. **You should see your CRM login page!**

3. **Test API:**
   ```
   http://your_hostinger_ip/api/health
   ```

4. **If you see errors:**
   - Check PM2 logs: `pm2 logs crm-backend`
   - Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify MongoDB connection in .env
   - Check firewall: `sudo ufw status`

---

### Step 11: Setup SSL Certificate (HTTPS) - Optional but Recommended

**Only if you have a domain name:**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically configure Nginx for HTTPS

# Test auto-renewal
sudo certbot renew --dry-run
```

**Update frontend .env:**
```env
VITE_API_URL=https://yourdomain.com/api
```

**Rebuild frontend:**
```bash
cd ~/crm-website/frontend-new
npm run build
sudo systemctl restart nginx
```

---

## 🔧 Useful Commands

### PM2 Commands:
```bash
# View running processes
pm2 list

# View logs
pm2 logs crm-backend

# Restart backend
pm2 restart crm-backend

# Stop backend
pm2 stop crm-backend

# Monitor
pm2 monit
```

### Nginx Commands:
```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### System Commands:
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
htop  # (install with: sudo apt install htop)

# Check server uptime
uptime
```

---

## 🔄 Updating Your Application

### Update Backend:
```bash
cd ~/crm-website/backend
git pull origin main
npm install
pm2 restart crm-backend
```

### Update Frontend:
```bash
cd ~/crm-website/frontend-new
git pull origin main
npm install
npm run build
sudo systemctl restart nginx
```

---

## 🐛 Troubleshooting

### Backend not starting:
```bash
# Check logs
pm2 logs crm-backend

# Check if port 5000 is in use
sudo lsof -i :5000

# Check MongoDB connection
mongo "your_mongodb_connection_string"
```

### Frontend not loading:
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if dist folder exists
ls -la ~/crm-website/frontend-new/dist

# Rebuild frontend
cd ~/crm-website/frontend-new
npm run build
```

### 502 Bad Gateway:
```bash
# Backend is not running
pm2 restart crm-backend

# Check backend logs
pm2 logs crm-backend
```

### Cannot upload images:
```bash
# Check AWS credentials in backend .env
# Check S3 bucket permissions
# Check Nginx client_max_body_size
```

---

## 💰 Cost Estimate

### Your Monthly Costs:
- **Server (Hostinger VPS KVM 2):** ~$8-12/month (already purchased!)
- **Domain Name:** $1/month ($12/year) - optional
- **MongoDB Atlas:** Free (512MB) - using personal account
- **AWS S3:** ~$1-2/month (for images) - already configured
- **SSL Certificate:** Free (Let's Encrypt)

**Total: ~$9-15/month** (Server cost depends on your Hostinger plan)

**Note:** You already have the server and MongoDB, so you're mostly set!

---

## 📊 Performance Tips

1. **Enable Gzip compression in Nginx**
2. **Use CDN for static assets** (Cloudflare free tier)
3. **Setup MongoDB indexes** for faster queries
4. **Enable PM2 cluster mode** for multiple CPU cores
5. **Setup monitoring** (PM2 Plus, New Relic, or Datadog)

---

## 🔐 Security Checklist

- [ ] Change default SSH port
- [ ] Disable root login
- [ ] Setup SSH key authentication
- [ ] Enable firewall (UFW)
- [ ] Install fail2ban (brute force protection)
- [ ] Use strong JWT secret
- [ ] Enable HTTPS with SSL
- [ ] Regular backups (MongoDB + code)
- [ ] Keep system updated
- [ ] Use environment variables (never commit .env)

---

## 📞 Need Help?

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system resources: `htop`
4. Verify MongoDB connection
5. Check firewall rules: `sudo ufw status`

---

**Next Steps:**
1. Choose your server provider
2. Follow steps 1-10
3. Test all features
4. Setup SSL (step 11)
5. Configure backups
6. Monitor performance

Good luck with your deployment! 🚀
