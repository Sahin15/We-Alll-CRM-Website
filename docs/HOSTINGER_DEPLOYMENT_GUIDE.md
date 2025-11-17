# 🚀 CRM Deployment on Hostinger VPS - Quick Guide

**Customized for YOUR setup: Hostinger VPS KVM 2 + MongoDB Atlas + AWS S3**

---

## ✅ What You Already Have

Great news! You're 90% ready:

- ✅ **Hostinger VPS KVM 2** (2GB RAM, 2 CPU, 50GB SSD)
- ✅ **MongoDB Atlas** (Personal account - working!)
- ✅ **AWS S3** (Already configured for images)

**You just need to deploy the code!**

---

## 🎯 Quick Overview

**Time:** 30-45 minutes
**Cost:** ~$9-15/month (just your Hostinger VPS)
**Difficulty:** Beginner-friendly

---

## 📋 What You Need Before Starting

### 1. Hostinger VPS Access
- [ ] Server IP address (from hPanel)
- [ ] Root password (or SSH key)
- [ ] SSH access working

### 2. MongoDB Connection
- [ ] MongoDB connection string (from your personal account)
- [ ] Hostinger VPS IP whitelisted in MongoDB Atlas

### 3. AWS S3 Credentials
- [ ] AWS Access Key ID
- [ ] AWS Secret Access Key
- [ ] S3 Bucket name: `crm-payment-proofs`

### 4. Your Code
- [ ] Git repository URL OR
- [ ] Code files ready to upload

---

## 🚀 Step-by-Step Deployment

### Step 1: Connect to Your Hostinger VPS

#### Option A: Using Hostinger hPanel Terminal (Easiest)
1. Log in to Hostinger hPanel
2. Go to VPS → Your VPS
3. Click "Browser Terminal"
4. You're in! (Already logged in as root)

#### Option B: Using SSH from Your Computer
```bash
# Windows PowerShell or CMD
ssh root@your_hostinger_ip

# Enter password when prompted
```

---

### Step 2: Update System

```bash
# Update all packages
apt update && apt upgrade -y

# This takes 5-10 minutes
# Press Y when asked

# Reboot if kernel updated
reboot

# Wait 1 minute, then reconnect
```

---

### Step 3: Install Required Software

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install PM2 (Process Manager)
npm install -g pm2

# Install Nginx (Web Server)
apt install -y nginx

# Install Git
apt install -y git

# Install build tools
apt install -y build-essential

# All done! ✅
```

---

### Step 4: Setup MongoDB Connection

**Important: Do this before deploying!**

#### A. Get Your Hostinger VPS IP Address

```bash
# Connect to your Hostinger VPS first
ssh root@your_hostinger_ip

# Get the public IP
curl ifconfig.me
# Note this IP address (e.g., 123.45.67.89)
```

#### B. Whitelist Hostinger IP in MongoDB Atlas

**Option 1: Using MongoDB Atlas Web Interface**

1. Go to https://cloud.mongodb.com
2. Log in to your account
3. Select your cluster
4. Click "Network Access" (left sidebar)
5. Click "Add IP Address"
6. Enter your Hostinger VPS IP (from step A)
7. OR click "Allow Access from Anywhere" (0.0.0.0/0) - easier for now
8. Click "Confirm"
9. Wait 1-2 minutes for changes to apply

**Option 2: Using MongoDB Compass (You Have This!)**

MongoDB Compass is just for viewing/managing data, not for network settings. You still need to whitelist the IP using the web interface above.

#### C. Get Your MongoDB Connection String

**Using MongoDB Atlas Web Interface:**

1. Go to your cluster
2. Click "Connect"
3. Choose "Connect your application"
4. Copy the connection string
5. It looks like: `mongodb+srv://username:password@cluster.mongodb.net/crm-database`
6. Replace `<password>` with your actual password
7. Replace `<dbname>` with `crm-database`

**Using MongoDB Compass (Easier!):**

1. Open MongoDB Compass on your computer
2. You should see your connection in "Saved Connections"
3. Click the "..." menu (three dots) next to your connection
4. Click "Copy Connection String"
5. Paste it somewhere safe - this is what you'll use in your .env file!

**Example connection string:**
```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/crm-database
```

#### D. Test Connection from Hostinger VPS (Optional but Recommended)

```bash
# Install mongosh (MongoDB Shell) on your VPS
curl -fsSL https://www.mongodb.com/try/download/shell | bash

# Test connection (paste YOUR connection string)
mongosh "mongodb+srv://username:password@cluster.mongodb.net/crm-database"

# If it connects successfully, you'll see:
# "Connected to MongoDB"
# Type: exit

# If it fails, check:
# - Is Hostinger IP whitelisted in MongoDB Atlas?
# - Is the connection string correct?
# - Is password correct?
```

---

### Step 4.5: Using MongoDB Compass (Your GUI Tool)

**What is MongoDB Compass?**
- Desktop application for MongoDB
- Visual interface to view/manage your database
- You already have it installed!

**How to Use MongoDB Compass with Your CRM:**

#### 1. Connect to Your Database

1. Open MongoDB Compass
2. Click on your saved connection OR
3. Paste your connection string
4. Click "Connect"

#### 2. View Your CRM Database

After deployment, you'll see these collections:
- `users` - All users (admin, clients)
- `services` - Your services
- `plans` - Your plans
- `invoices` - All invoices
- `payments` - Payment records
- `subscriptions` - Active subscriptions
- `notifications` - System notifications
- `leads` - Lead management

#### 3. Common Tasks in Compass

**View Data:**
- Click on `crm-database` (or your database name)
- Click on any collection (e.g., `users`)
- See all documents (records)

**Search/Filter:**
- Use the filter bar at top
- Example: `{ email: "admin@example.com" }`
- Click "Find"

**Create Admin User (If Needed):**
1. Click on `users` collection
2. Click "Add Data" → "Insert Document"
3. Paste this (change email/password):
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "$2a$10$hashed_password_here",
  "role": "admin",
  "department": "Management",
  "isActive": true,
  "createdAt": "2024-11-17T00:00:00.000Z"
}
```
4. Click "Insert"

**Note:** For password, you'll need to hash it. Better to create admin user through the application after deployment!

**Export Data:**
- Click on collection
- Click "..." menu
- Click "Export Collection"
- Choose JSON or CSV

**Import Data:**
- Click on collection
- Click "Add Data" → "Import File"
- Choose your JSON/CSV file

**Monitor Performance:**
- Click "Performance" tab
- See slow queries
- Check indexes

#### 4. Useful MongoDB Compass Features

**Schema Analysis:**
- Click "Schema" tab
- See data types and patterns
- Understand your data structure

**Explain Plan:**
- Write a query
- Click "Explain"
- See query performance

**Indexes:**
- Click "Indexes" tab
- See existing indexes
- Create new indexes for performance

**Aggregation Pipeline:**
- Click "Aggregations" tab
- Build complex queries visually
- Export results

#### 5. Troubleshooting with Compass

**Can't Connect?**
- Check if Hostinger IP is whitelisted
- Verify connection string
- Check username/password
- Try "Allow Access from Anywhere" (0.0.0.0/0)

**Database Empty After Deployment?**
- Normal! Database starts empty
- Data appears after you use the application
- Create services, plans, etc. through the CRM

**Need to Reset Data?**
- Click on collection
- Select all documents
- Click "Delete"
- Confirm

**Backup Database:**
- Use mongodump command OR
- Export each collection in Compass
- Save JSON files

#### 6. MongoDB Compass Tips

**Best Practices:**
- ✅ Use Compass to view data (read-only mostly)
- ✅ Make changes through your CRM application
- ✅ Use Compass for debugging
- ✅ Export data for backups
- ❌ Don't manually edit production data (risky)
- ❌ Don't delete collections (unless you know what you're doing)

**When to Use Compass:**
- View all users
- Check payment records
- Debug data issues
- Export reports
- Monitor database size
- Create backups
- Analyze performance

**When to Use Your CRM:**
- Create/edit services
- Create/edit plans
- Manage invoices
- Verify payments
- Normal operations

---

### Step 5: Clone Your Project

```bash
# Go to home directory
cd ~

# Clone from GitHub (replace with your repo)
git clone https://github.com/yourusername/crm-website.git

# OR upload files using SFTP/SCP
# Then extract if needed

# Navigate to project
cd crm-website

# Verify files are there
ls -la
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

**Paste this (replace with YOUR actual values):**
```env
# MongoDB - YOUR connection string
MONGO_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/crm-database?retryWrites=true&w=majority

# JWT - Generate a strong random secret
JWT_SECRET=change_this_to_a_long_random_string_32_characters_minimum
JWT_EXPIRE=30d

# AWS S3 - YOUR credentials
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=crm-payment-proofs

# Server
PORT=5000
NODE_ENV=production

# Email (optional - for future)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

```bash
# Test backend
npm start

# If it starts without errors, great!
# Press Ctrl+C to stop

# Start with PM2
pm2 start src/server.js --name crm-backend

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it shows

# Check status
pm2 status
pm2 logs crm-backend
```

---

### Step 7: Build Frontend

```bash
# Navigate to frontend
cd ~/crm-website/frontend-new

# Install dependencies
npm install

# Create .env file
nano .env
```

**Paste this (replace with YOUR Hostinger IP):**
```env
VITE_API_URL=http://your_hostinger_ip:5000/api
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

```bash
# Build for production
npm run build

# This creates a 'dist' folder
# Takes 2-3 minutes

# Verify dist folder exists
ls -la dist/
```

---

### Step 8: Setup Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/crm
```

**Paste this (replace your_hostinger_ip with YOUR actual IP):**
```nginx
server {
    listen 80;
    server_name your_hostinger_ip;

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
        
        # Timeouts for uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Frontend
    location / {
        root /root/crm-website/frontend-new/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Max upload size for images
    client_max_body_size 10M;
}
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

```bash
# Enable the site
ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# If test passes, restart Nginx
systemctl restart nginx

# Enable Nginx on boot
systemctl enable nginx

# Check status
systemctl status nginx
```

---

### Step 9: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
# Type 'y' and press Enter

# Check status
ufw status
```

---

### Step 10: Test Your Application! 🎉

1. **Open your browser**
2. **Go to:** `http://your_hostinger_ip`
3. **You should see your CRM login page!**

**Test checklist:**
- [ ] Login page loads
- [ ] Can login (create admin user first if needed)
- [ ] Dashboard loads
- [ ] Can create service
- [ ] Can create plan
- [ ] Can upload image (profile picture)
- [ ] No errors in browser console (F12)

**If you see errors:**
```bash
# Check backend logs
pm2 logs crm-backend

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Check if backend is running
pm2 status

# Restart if needed
pm2 restart crm-backend
systemctl restart nginx
```

---

## 🔐 Optional: Setup SSL (If You Have Domain)

**Only if you have a domain name pointing to your Hostinger IP:**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts
# Certbot will automatically configure Nginx for HTTPS

# Update frontend .env
cd ~/crm-website/frontend-new
nano .env
```

**Change to:**
```env
VITE_API_URL=https://yourdomain.com/api
```

```bash
# Rebuild frontend
npm run build

# Restart Nginx
systemctl restart nginx

# Test auto-renewal
certbot renew --dry-run
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
systemctl restart nginx
```

---

## 🔧 Useful Commands

### PM2 Commands:
```bash
pm2 list                    # List all processes
pm2 logs crm-backend        # View logs
pm2 restart crm-backend     # Restart backend
pm2 stop crm-backend        # Stop backend
pm2 monit                   # Monitor resources
```

### Nginx Commands:
```bash
nginx -t                              # Test config
systemctl restart nginx               # Restart
tail -f /var/log/nginx/error.log     # View errors
tail -f /var/log/nginx/access.log    # View access
```

### System Commands:
```bash
df -h           # Check disk space
free -h         # Check memory
htop            # Monitor processes (install: apt install htop)
curl ifconfig.me # Get your IP
```

---

## 🐛 Troubleshooting

### Backend won't start:
```bash
# Check logs
pm2 logs crm-backend

# Check MongoDB connection
mongosh "your_connection_string"

# Check if port 5000 is in use
lsof -i :5000

# Restart
pm2 restart crm-backend
```

### Frontend not loading:
```bash
# Check if dist folder exists
ls -la ~/crm-website/frontend-new/dist

# Rebuild
cd ~/crm-website/frontend-new
npm run build

# Check Nginx
nginx -t
systemctl restart nginx
```

### 502 Bad Gateway:
```bash
# Backend is not running
pm2 restart crm-backend
pm2 logs crm-backend
```

### Cannot upload images:
```bash
# Check AWS credentials in .env
cat ~/crm-website/backend/.env | grep AWS

# Check S3 bucket permissions
# Verify bucket name is correct
```

---

## 📊 MongoDB: Personal vs Company Account

### Current Setup (Personal Account):
- ✅ Working now
- ✅ Easy to test
- ✅ No issues for development

### When to Switch to Company Account:
- After successful deployment
- After testing everything
- When company account is ready
- Before going to production (optional)

### How to Switch (Takes 5 Minutes):
```bash
# 1. Get new connection string from company MongoDB account
# 2. Update .env
nano ~/crm-website/backend/.env
# Change MONGO_URI to new connection string

# 3. Restart backend
pm2 restart crm-backend

# 4. Test
# Done!
```

**No data migration needed** - just change the connection string!

---

## 💰 Your Monthly Costs

- **Hostinger VPS KVM 2:** $8-12/month ✅ (already purchased)
- **MongoDB Atlas:** Free ✅ (already set up)
- **AWS S3:** $1-2/month ✅ (already configured)
- **Domain:** $1/month (optional)
- **SSL:** Free (Let's Encrypt)

**Total: ~$9-15/month** (mostly just your VPS!)

---

## ✅ Deployment Checklist

- [ ] Connected to Hostinger VPS
- [ ] System updated
- [ ] Node.js, PM2, Nginx installed
- [ ] MongoDB connection tested
- [ ] Hostinger IP whitelisted in MongoDB
- [ ] Code cloned/uploaded
- [ ] Backend .env configured
- [ ] Backend running with PM2
- [ ] Frontend .env configured
- [ ] Frontend built (dist folder created)
- [ ] Nginx configured
- [ ] Firewall configured
- [ ] Application accessible via browser
- [ ] All features tested
- [ ] SSL configured (if domain)

---

## 🎉 Success!

Once everything is working:
1. ✅ Your CRM is live!
2. ✅ Accessible at http://your_hostinger_ip
3. ✅ All features working
4. ✅ Images uploading to S3
5. ✅ Data saving to MongoDB

**Next steps:**
- Test all features thoroughly
- Create admin user
- Add test data
- Monitor for 24 hours
- Get domain name (optional)
- Setup SSL (optional)
- Switch to company MongoDB (when ready)

---

## 📞 Need Help?

**Check logs first:**
```bash
pm2 logs crm-backend
tail -f /var/log/nginx/error.log
```

**Common issues are in the Troubleshooting section above!**

**Hostinger Support:**
- Live chat in hPanel
- Support tickets
- Knowledge base

---

**You're all set! Your Hostinger VPS is perfect for this CRM system.** 🚀

**Time to deploy:** 30-45 minutes
**Difficulty:** Beginner-friendly
**Success rate:** High (you have everything ready!)

**Good luck! 🎊**


---

## 📊 MongoDB Compass Quick Reference

### Connection String Format:
```
mongodb+srv://username:password@cluster.mongodb.net/database_name
```

### Get Connection String:
1. Open MongoDB Compass
2. Saved Connections → "..." menu
3. "Copy Connection String"

### View Your CRM Data:
1. Connect in Compass
2. Click `crm-database`
3. Browse collections:
   - `users` - User accounts
   - `services` - Services
   - `plans` - Plans
   - `invoices` - Invoices
   - `payments` - Payments
   - `subscriptions` - Subscriptions

### Common Queries in Compass:

**Find all admins:**
```json
{ "role": "admin" }
```

**Find pending payments:**
```json
{ "status": "pending" }
```

**Find active subscriptions:**
```json
{ "status": "active" }
```

**Find user by email:**
```json
{ "email": "user@example.com" }
```

### Export Data:
1. Select collection
2. "..." menu → "Export Collection"
3. Choose JSON or CSV
4. Save file

### Backup Database:
1. Export each collection
2. Save JSON files
3. Store securely
4. Can import later if needed

### Monitor Database Size:
1. Click database name
2. See "Storage Size" at top
3. Monitor as data grows

---

## 🔗 Useful Links

### MongoDB:
- **Atlas Dashboard:** https://cloud.mongodb.com
- **Compass Download:** https://www.mongodb.com/try/download/compass
- **Documentation:** https://docs.mongodb.com

### Hostinger:
- **hPanel:** https://hpanel.hostinger.com
- **Support:** Live chat in hPanel
- **Knowledge Base:** https://support.hostinger.com

### AWS S3:
- **Console:** https://console.aws.amazon.com/s3
- **Documentation:** https://docs.aws.amazon.com/s3

---

## 📝 Post-Deployment Checklist

After successful deployment:

### Immediate:
- [ ] Application loads at http://your_hostinger_ip
- [ ] Can login
- [ ] Dashboard displays
- [ ] Can create service
- [ ] Can create plan
- [ ] Can upload image (test S3)
- [ ] Check PM2 logs: `pm2 logs crm-backend`
- [ ] Check Nginx logs: `tail -f /var/log/nginx/error.log`

### First 24 Hours:
- [ ] Monitor server resources: `htop`
- [ ] Check disk space: `df -h`
- [ ] Monitor PM2: `pm2 monit`
- [ ] Test all features
- [ ] Create test data
- [ ] Verify MongoDB Compass shows data

### First Week:
- [ ] Create admin user
- [ ] Add real services
- [ ] Create plans
- [ ] Test invoice generation
- [ ] Test payment workflow
- [ ] Monitor performance

### When Ready:
- [ ] Get domain name (optional)
- [ ] Setup SSL/HTTPS (optional)
- [ ] Switch to company MongoDB (optional)
- [ ] Setup automated backups
- [ ] Configure monitoring

---

## 🎊 Congratulations!

If you've reached this point and everything is working:

✅ Your CRM is deployed!
✅ Running on Hostinger VPS
✅ Connected to MongoDB Atlas
✅ Images uploading to AWS S3
✅ All features working
✅ MongoDB Compass connected

**You're LIVE!** 🚀

---

**Need help?** Check the troubleshooting section or contact support.

**Want to improve?** Consider adding domain, SSL, and monitoring.

**Ready to use?** Start creating services, plans, and managing your business!

---

*Deployment guide last updated: November 17, 2025*
*Customized for: Hostinger VPS KVM 2 + MongoDB Atlas + AWS S3*
