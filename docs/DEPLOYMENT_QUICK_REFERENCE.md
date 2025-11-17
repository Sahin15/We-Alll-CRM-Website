# 🚀 Deployment Quick Reference Card

**Print this or keep it open while deploying!**

---

## 📋 **YOUR INFORMATION**

Fill this out before starting:

```
Hostinger VPS IP: _________________
Root Password: _________________
MongoDB URI: mongodb+srv://sahinmondal7_db_user:Sahin%40mongodb123@...
AWS Access Key: AKIATSRYUTOO7ERQHO6V
AWS Secret Key: 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
S3 Bucket: wealll-crm-aws
S3 Region: eu-north-1
```

---

## ⚡ **QUICK DEPLOYMENT COMMANDS**

### **1. Connect to VPS:**
```bash
ssh root@YOUR_IP
```

### **2. Update System:**
```bash
apt update && apt upgrade -y
```

### **3. Install Software:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git build-essential
npm install -g pm2
```

### **4. Upload Code:**
```bash
cd ~
git clone YOUR_REPO_URL crm-website
cd crm-website
```

### **5. Setup Backend:**
```bash
cd ~/crm-website/backend
npm install --production
nano .env  # Paste your .env content
pm2 start src/server.js --name crm-backend
pm2 save && pm2 startup
```

### **6. Build Frontend:**
```bash
cd ~/crm-website/frontend-new
npm install
npm run build
```

### **7. Configure Nginx:**
```bash
nano /etc/nginx/sites-available/crm  # Paste config
ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### **8. Enable Firewall:**
```bash
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw enable
```

### **9. Test:**
```
http://YOUR_IP
```

---

## 🔧 **USEFUL COMMANDS**

### **PM2:**
```bash
pm2 status              # Check status
pm2 logs crm-backend    # View logs
pm2 restart crm-backend # Restart
pm2 monit               # Monitor
```

### **Nginx:**
```bash
systemctl status nginx          # Check status
systemctl restart nginx         # Restart
nginx -t                        # Test config
tail -f /var/log/nginx/error.log # View errors
```

### **System:**
```bash
df -h           # Disk space
free -h         # Memory
htop            # Monitor (apt install htop)
curl ifconfig.me # Get IP
```

---

## 📝 **BACKEND .ENV TEMPLATE**

```env
MONGO_URI=mongodb+srv://sahinmondal7_db_user:Sahin%40mongodb123@wealll-crm.dkhsqtu.mongodb.net/crm-database?retryWrites=true&w=majority&appName=wealll-crm
PORT=5000
NODE_ENV=production
JWT_SECRET=CHANGE_THIS_TO_RANDOM_32_CHARS
JWT_EXPIRE=30d
AWS_ACCESS_KEY_ID=AKIATSRYUTOO7ERQHO6V
AWS_SECRET_ACCESS_KEY=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
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=wealll-crm-aws
```

---

## 🌐 **NGINX CONFIG TEMPLATE**

```nginx
server {
    listen 80;
    server_name YOUR_IP;
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        root /root/crm-website/frontend-new/dist;
        try_files $uri $uri/ /index.html;
    }
    
    client_max_body_size 10M;
}
```

---

## 🐛 **TROUBLESHOOTING**

| Problem | Solution |
|---------|----------|
| Can't connect to VPS | Check IP, password, firewall |
| Backend won't start | Check `pm2 logs crm-backend` |
| Frontend not loading | Check Nginx: `systemctl status nginx` |
| MongoDB error | Whitelist IP in Atlas, wait 2 min |
| Images won't upload | Check AWS credentials in .env |
| 502 Bad Gateway | Backend not running: `pm2 restart crm-backend` |

---

## ✅ **DEPLOYMENT CHECKLIST**

- [ ] VPS IP obtained
- [ ] Connected to VPS
- [ ] System updated
- [ ] Software installed (Node, PM2, Nginx, Git)
- [ ] MongoDB IP whitelisted
- [ ] Code uploaded
- [ ] Backend .env created
- [ ] Backend running with PM2
- [ ] Frontend built
- [ ] Nginx configured
- [ ] Firewall enabled
- [ ] Application accessible
- [ ] All features tested

---

## 📞 **EMERGENCY COMMANDS**

```bash
# Restart everything
pm2 restart all
systemctl restart nginx

# Check all logs
pm2 logs
tail -f /var/log/nginx/error.log

# Check what's using port 5000
lsof -i :5000

# Kill process on port 5000
kill -9 $(lsof -t -i:5000)

# Reboot server
reboot
```

---

**Keep this handy during deployment!** 📌
