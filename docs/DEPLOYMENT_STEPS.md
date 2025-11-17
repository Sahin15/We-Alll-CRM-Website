# 🚀 Hostinger VPS Deployment - Complete Step-by-Step Plan

**Your Current Status:** ✅ Local development working, data migrated to Atlas

**Next:** Deploy to Hostinger VPS

---

## 📋 **PREPARATION (Do This First)**

### ✅ **What You Need:**

1. **Hostinger VPS Details:**
   - [ ] IP Address: `_________________`
   - [ ] Root Password: `_________________`
   - [ ] SSH Access: Working

2. **MongoDB Atlas:**
   - [x] Database: crm-database ✅
   - [x] Data imported ✅
   - [ ] Hostinger IP whitelisted (will do in Step 6)

3. **AWS S3:**
   - [x] Bucket: wealll-crm-aws ✅
   - [x] Region: eu-north-1 ✅
   - [x] Credentials ready ✅

---

## 🎯 **STEP 1: Get Hostinger VPS IP Address**

### **What to do:**

1. Go to https://hpanel.hostinger.com
2. Login to your account
3. Click **VPS** in the menu
4. Find your VPS
5. **Copy the IP address**

**Write it here:** `_________________`

### **Verification:**
- [ ] I have my Hostinger VPS IP address

---

## 🎯 **STEP 2: Update Frontend Production URL**

### **What to do:**

**On your local computer:**

1. Open file: `frontend-new/.env.production`

2. Find this line:
   ```
   VITE_API_URL=http://YOUR_HOSTINGER_IP/api
   ```

3. Replace `YOUR_HOSTINGER_IP` with your actual IP:
   ```
   VITE_API_URL=http://123.45.67.89/api
   ```
   (Use your actual IP!)

4. **Save the file**

### **Verification:**
- [ ] .env.production file updated with my Hostinger IP
- [ ] File saved

---

## 🎯 **STEP 3: Connect to Hostinger VPS**

### **Option A: Using hPanel Terminal (Easiest)**

1. In hPanel → VPS → Your VPS
2. Click **"Browser Terminal"** button
3. Terminal opens in browser
4. You're logged in as root!

### **Option B: Using SSH from Windows**

1. Open PowerShell or CMD
2. Type:
   ```bash
   ssh root@YOUR_HOSTINGER_IP
   ```
3. Enter password when prompted
4. You're in!

### **What you should see:**
```
root@vps-xxxxx:~#
```

### **Verification:**
- [ ] Connected to Hostinger VPS
- [ ] See root prompt

---

## 🎯 **STEP 4: Update System**

### **Commands to run:**

```bash
# Update package list
apt update

# Upgrade packages (takes 5-10 minutes)
apt upgrade -y
```

**Wait for it to complete...**

**If it asks about kernel update:**
```bash
reboot
```

**Then reconnect after 1 minute:**
```bash
ssh root@YOUR_HOSTINGER_IP
```

### **Verification:**
- [ ] System updated
- [ ] Reconnected if rebooted

---

## 🎯 **STEP 5: Install Node.js, PM2, Nginx, Git**

### **Commands to run (copy/paste one by one):**

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js
node --version
npm --version

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git

# Install build tools
apt install -y build-essential
```

### **Verify installations:**
```bash
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo "Nginx: $(nginx -v)"
```

### **Verification:**
- [ ] Node.js installed (v20.x.x)
- [ ] npm installed (10.x.x)
- [ ] PM2 installed
- [ ] Nginx installed
- [ ] Git installed

---

## 🎯 **STEP 6: Whitelist Hostinger IP in MongoDB Atlas**

### **Get your VPS IP:**

```bash
curl ifconfig.me
```

**Copy this IP!**

### **Add to MongoDB Atlas:**

1. Go to https://cloud.mongodb.com
2. Login
3. Click **"Network Access"** (left sidebar)
4. Click **"Add IP Address"**
5. **Option A:** Enter your Hostinger VPS IP
6. **Option B:** Click **"Allow Access from Anywhere"** (0.0.0.0/0) - easier
7. Click **"Confirm"**
8. **Wait 2 minutes** for changes to apply

### **Verification:**
- [ ] Hostinger IP added to MongoDB Atlas
- [ ] Waited 2 minutes

---

## 🎯 **STEP 7: Upload Code to Hostinger**

### **Option A: Using Git (If code is on GitHub)**

```bash
cd ~
git clone https://github.com/yourusername/crm-website.git
cd crm-website
ls -la
```

### **Option B: Using FileZilla/WinSCP**

1. Download FileZilla: https://filezilla-project.org/
2. Connect to Hostinger:
   - Host: YOUR_HOSTINGER_IP
   - Username: root
   - Password: YOUR_PASSWORD
   - Port: 22
3. Upload your `crm-website` folder to `/root/`
4. In terminal:
   ```bash
   cd ~/crm-website
   ls -la
   ```

### **Verification:**
- [ ] Code uploaded to Hostinger
- [ ] Can see files in ~/crm-website
- [ ] backend and frontend-new folders present

---

## 🎯 **STEP 8: Setup Backend**

### **Commands:**

```bash
# Navigate to backend
cd ~/crm-website/backend

# Install dependencies (takes 2-3 minutes)
npm install --production

# Create .env file
nano .env
```

### **Paste this in .env file:**

```env
# MongoDB Atlas Connection
MONGO_URI=mongodb+srv://sahinmondal7_db_user:Sahin%40mongodb123@wealll-crm.dkhsqtu.mongodb.net/crm-database?retryWrites=true&w=majority&appName=wealll-crm

# Server Configuration
PORT=5000
NODE_ENV=production

# JWT Configuration - IMPORTANT: Change this!
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_32_CHARS_MINIMUM
JWT_EXPIRE=30d

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIATSRYUTOO7ERQHO6V
AWS_SECRET_ACCESS_KEY=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
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=wealll-crm-aws

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

### **Generate strong JWT_SECRET:**

```bash
openssl rand -base64 32
```

**Copy the output, then edit .env again:**
```bash
nano .env
```

**Replace JWT_SECRET with the generated string, then save**

### **Test backend:**

```bash
npm start
```

**Should see:**
```
✅ MongoDB connected successfully
📊 Database: crm-database
✅ Server is running on port 5000
```

**Press Ctrl+C to stop**

### **Start with PM2:**

```bash
pm2 start src/server.js --name crm-backend
pm2 save
pm2 startup
```

**Copy and run the command PM2 shows**

### **Check status:**

```bash
pm2 status
pm2 logs crm-backend
```

### **Verification:**
- [ ] Backend dependencies installed
- [ ] .env file created
- [ ] JWT_SECRET changed to random string
- [ ] Backend starts without errors
- [ ] PM2 running crm-backend
- [ ] PM2 startup configured

---

## 🎯 **STEP 9: Build Frontend**

### **Commands:**

```bash
# Navigate to frontend
cd ~/crm-website/frontend-new

# Install dependencies (takes 2-3 minutes)
npm install

# Verify .env.production
cat .env.production
```

**Should show:**
```
VITE_API_URL=http://YOUR_HOSTINGER_IP/api
```

**If not correct, edit it:**
```bash
nano .env.production
```

### **Build for production:**

```bash
npm run build
```

**This takes 2-3 minutes...**

### **Verify dist folder:**

```bash
ls -la dist/
```

**Should see index.html and assets folder**

### **Verification:**
- [ ] Frontend dependencies installed
- [ ] .env.production has correct IP
- [ ] Build completed successfully
- [ ] dist folder created with files

---

## 🎯 **STEP 10: Setup Nginx**

### **Create Nginx config:**

```bash
nano /etc/nginx/sites-available/crm
```

### **Paste this (replace YOUR_HOSTINGER_IP):**

```nginx
server {
    listen 80;
    server_name YOUR_HOSTINGER_IP;

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
        
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Frontend
    location / {
        root /root/crm-website/frontend-new/dist;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    client_max_body_size 10M;
}
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

### **Enable site:**

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/

# Remove default
rm /etc/nginx/sites-enabled/default

# Test config
nginx -t
```

**Should say "test is successful"**

### **Restart Nginx:**

```bash
systemctl restart nginx
systemctl enable nginx
systemctl status nginx
```

### **Verification:**
- [ ] Nginx config created
- [ ] Config test passed
- [ ] Nginx restarted
- [ ] Nginx enabled on boot

---

## 🎯 **STEP 11: Configure Firewall**

### **Commands:**

```bash
# Allow ports
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

**Type 'y' and press Enter**

### **Check status:**

```bash
ufw status
```

### **Verification:**
- [ ] Firewall enabled
- [ ] Ports 22, 80, 443 allowed

---

## 🎯 **STEP 12: TEST YOUR APPLICATION!** 🎉

### **Open browser:**

1. Go to: `http://YOUR_HOSTINGER_IP`
2. You should see your CRM login page!

### **Test everything:**

- [ ] Login page loads
- [ ] Can login with your account
- [ ] Dashboard loads
- [ ] See your old data (services, plans, etc.)
- [ ] Can create new service
- [ ] Can upload profile picture
- [ ] Images upload to S3
- [ ] No errors in browser console (F12)

### **If it works:** 🎊 **CONGRATULATIONS! YOU'RE LIVE!**

---

## 🐛 **TROUBLESHOOTING**

### **If login page doesn't load:**

```bash
# Check Nginx
systemctl status nginx
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

### **If API doesn't work:**

```bash
# Check backend
pm2 status
pm2 logs crm-backend

# Restart backend
pm2 restart crm-backend
```

### **If MongoDB connection fails:**

```bash
# Check logs
pm2 logs crm-backend

# Verify:
# 1. Is Hostinger IP whitelisted in MongoDB Atlas?
# 2. Is MONGO_URI correct in .env?
# 3. Wait 2 minutes after whitelisting IP
```

### **If images don't upload:**

```bash
# Check AWS credentials in .env
cat ~/crm-website/backend/.env | grep AWS

# Verify S3 bucket permissions in AWS Console
```

---

## 📊 **POST-DEPLOYMENT CHECKLIST**

### **Immediate (First Hour):**
- [ ] Application accessible via IP
- [ ] All features working
- [ ] No errors in logs
- [ ] Can create/edit data
- [ ] Images uploading

### **First 24 Hours:**
- [ ] Monitor PM2: `pm2 monit`
- [ ] Check logs: `pm2 logs crm-backend`
- [ ] Monitor server: `htop` (install: `apt install htop`)
- [ ] Check disk space: `df -h`

### **First Week:**
- [ ] Test all features thoroughly
- [ ] Get user feedback
- [ ] Fix any bugs
- [ ] Monitor performance

---

## 🔐 **SECURITY CHECKLIST**

- [ ] JWT_SECRET changed to strong random string
- [ ] Hostinger IP whitelisted in MongoDB (not 0.0.0.0/0)
- [ ] Firewall enabled
- [ ] .env file not in git
- [ ] AWS credentials secure
- [ ] Regular backups configured

---

## 🎯 **OPTIONAL: Setup Domain & SSL**

### **If you have a domain name:**

1. **Point domain to Hostinger IP:**
   - Go to your domain registrar
   - Add A record: `@` → `YOUR_HOSTINGER_IP`
   - Add A record: `www` → `YOUR_HOSTINGER_IP`
   - Wait 1-24 hours for DNS propagation

2. **Update Nginx config:**
   ```bash
   nano /etc/nginx/sites-available/crm
   ```
   Change `server_name YOUR_HOSTINGER_IP;` to `server_name yourdomain.com www.yourdomain.com;`

3. **Install SSL:**
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

4. **Update frontend .env.production:**
   ```
   VITE_API_URL=https://yourdomain.com/api
   ```

5. **Rebuild frontend:**
   ```bash
   cd ~/crm-website/frontend-new
   npm run build
   systemctl restart nginx
   ```

---

## 📞 **NEED HELP?**

### **Check these first:**

1. **Backend logs:** `pm2 logs crm-backend`
2. **Nginx logs:** `tail -f /var/log/nginx/error.log`
3. **System resources:** `htop`
4. **Disk space:** `df -h`

### **Common commands:**

```bash
# Restart backend
pm2 restart crm-backend

# Restart Nginx
systemctl restart nginx

# View logs
pm2 logs crm-backend
tail -f /var/log/nginx/error.log

# Check status
pm2 status
systemctl status nginx

# Monitor resources
htop
```

---

## ✅ **DEPLOYMENT COMPLETE!**

**Your CRM is now live at:** `http://YOUR_HOSTINGER_IP`

**What you've accomplished:**
- ✅ Backend deployed and running
- ✅ Frontend built and served
- ✅ MongoDB Atlas connected
- ✅ AWS S3 working
- ✅ Nginx configured
- ✅ Firewall enabled
- ✅ PM2 managing backend
- ✅ Application accessible

**Next steps:**
- Test all features
- Monitor for 24 hours
- Get domain name (optional)
- Setup SSL (optional)
- Configure backups
- Enjoy your live CRM! 🎉

---

**Deployment Date:** _______________
**Hostinger IP:** _______________
**Status:** _______________

**Good luck! You've got this! 🚀**
