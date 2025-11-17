# 📋 CRM Deployment Checklist

Use this checklist to ensure a smooth deployment process.

---

## 🎯 Pre-Deployment

### Infrastructure:
- [ ] Server purchased/created (DigitalOcean, AWS, etc.)
- [ ] Server specs: Minimum 2GB RAM, 1 CPU, 25GB SSD
- [ ] Operating System: Ubuntu 22.04 LTS
- [ ] SSH access configured
- [ ] Domain name purchased (optional but recommended)
- [ ] Domain DNS pointed to server IP

### Database:
- [ ] MongoDB Atlas account created (OR)
- [ ] MongoDB installed on server
- [ ] Database user created
- [ ] Database connection string obtained
- [ ] IP whitelist configured (0.0.0.0/0 for Atlas)

### AWS S3:
- [ ] S3 bucket created (`crm-payment-proofs`)
- [ ] Bucket permissions configured (public read)
- [ ] IAM user created with S3 access
- [ ] Access Key ID obtained
- [ ] Secret Access Key obtained
- [ ] Test upload successful

### Code:
- [ ] Latest code pulled from repository
- [ ] All dependencies listed in package.json
- [ ] No hardcoded credentials in code
- [ ] .env.example files updated
- [ ] README updated with deployment notes

---

## 🔧 Server Setup

### Initial Configuration:
- [ ] Server updated: `sudo apt update && sudo apt upgrade -y`
- [ ] Node.js 20.x installed
- [ ] npm installed and working
- [ ] PM2 installed globally (for simple deployment)
- [ ] Nginx installed
- [ ] Git installed
- [ ] Build tools installed: `build-essential`

### Security:
- [ ] Firewall enabled (UFW)
- [ ] Ports opened: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- [ ] SSH key authentication configured
- [ ] Root login disabled (optional)
- [ ] fail2ban installed (optional)
- [ ] Regular security updates enabled

---

## 📦 Application Deployment

### Backend:
- [ ] Code cloned/uploaded to server
- [ ] Dependencies installed: `npm install --production`
- [ ] .env file created with production values
- [ ] MongoDB connection tested
- [ ] AWS S3 connection tested
- [ ] Backend starts without errors: `npm start`
- [ ] PM2 process created: `pm2 start src/server.js --name crm-backend`
- [ ] PM2 startup configured: `pm2 startup` and `pm2 save`
- [ ] Backend accessible on port 5000

### Frontend:
- [ ] Dependencies installed: `npm install`
- [ ] .env file created with production API URL
- [ ] Build successful: `npm run build`
- [ ] dist folder created
- [ ] Static files accessible

---

## 🌐 Web Server Configuration

### Nginx:
- [ ] Nginx configuration file created
- [ ] Backend proxy configured (port 5000)
- [ ] Frontend static files configured
- [ ] Client max body size set (10M for uploads)
- [ ] Gzip compression enabled
- [ ] Configuration tested: `sudo nginx -t`
- [ ] Nginx restarted: `sudo systemctl restart nginx`
- [ ] Nginx enabled on boot: `sudo systemctl enable nginx`

### DNS (if using domain):
- [ ] A record points to server IP
- [ ] www subdomain configured (optional)
- [ ] DNS propagation complete (check with `dig yourdomain.com`)

---

## 🔒 SSL/HTTPS Setup

### Let's Encrypt (if using domain):
- [ ] Certbot installed
- [ ] SSL certificate obtained: `sudo certbot --nginx -d yourdomain.com`
- [ ] HTTPS working
- [ ] HTTP redirects to HTTPS
- [ ] Auto-renewal tested: `sudo certbot renew --dry-run`
- [ ] Frontend .env updated with https:// URL
- [ ] Frontend rebuilt with new URL

---

## ✅ Testing

### Backend API:
- [ ] Health check endpoint working: `/api/health`
- [ ] Authentication working (login/register)
- [ ] Services CRUD working
- [ ] Plans CRUD working
- [ ] Invoices CRUD working
- [ ] Payments CRUD working
- [ ] Subscriptions CRUD working
- [ ] Notifications working
- [ ] File uploads working (S3)
- [ ] Email notifications working (if configured)

### Frontend:
- [ ] Application loads without errors
- [ ] Login page accessible
- [ ] Can login with test account
- [ ] Dashboard loads
- [ ] All pages accessible
- [ ] Company switcher works
- [ ] Notifications bell works
- [ ] Profile picture upload works
- [ ] Forms submit correctly
- [ ] Data displays correctly
- [ ] No console errors

### Integration:
- [ ] Create service → Success
- [ ] Create plan → Success
- [ ] Create invoice → Success
- [ ] Submit payment → Success
- [ ] Verify payment → Success
- [ ] Upload profile picture → Success
- [ ] Company switching updates data
- [ ] Notifications appear
- [ ] PDF generation works

### Performance:
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Images load quickly
- [ ] No memory leaks
- [ ] CPU usage normal
- [ ] Disk space sufficient

---

## 📊 Monitoring Setup

### Application Monitoring:
- [ ] PM2 monitoring active: `pm2 monit`
- [ ] PM2 logs accessible: `pm2 logs`
- [ ] Error logging configured
- [ ] Access logs configured

### Server Monitoring:
- [ ] Disk space monitoring
- [ ] Memory usage monitoring
- [ ] CPU usage monitoring
- [ ] Network monitoring
- [ ] Uptime monitoring (UptimeRobot, Pingdom)

### Database Monitoring:
- [ ] MongoDB Atlas monitoring (if using Atlas)
- [ ] Database size tracking
- [ ] Query performance monitoring
- [ ] Backup status monitoring

---

## 💾 Backup Configuration

### Database Backups:
- [ ] Automated backups enabled (MongoDB Atlas OR)
- [ ] Manual backup script created
- [ ] Backup schedule configured (daily recommended)
- [ ] Backup restoration tested
- [ ] Backup storage location secured

### Code Backups:
- [ ] Git repository up to date
- [ ] .env files backed up securely (NOT in git)
- [ ] Server snapshots configured (DigitalOcean/AWS)

### S3 Backups:
- [ ] S3 versioning enabled (optional)
- [ ] S3 lifecycle policies configured (optional)

---

## 📝 Documentation

### Internal Documentation:
- [ ] Server credentials documented (securely)
- [ ] Database credentials documented (securely)
- [ ] AWS credentials documented (securely)
- [ ] Deployment process documented
- [ ] Troubleshooting guide created
- [ ] Contact information for support

### User Documentation:
- [ ] User guide created (optional)
- [ ] Admin guide created (optional)
- [ ] FAQ created (optional)

---

## 🚀 Post-Deployment

### Immediate (Day 1):
- [ ] Monitor logs for errors
- [ ] Check server resources
- [ ] Test all critical features
- [ ] Verify backups working
- [ ] Check SSL certificate expiry date

### Short-term (Week 1):
- [ ] Monitor application performance
- [ ] Gather user feedback
- [ ] Fix any reported bugs
- [ ] Optimize slow queries
- [ ] Review security logs

### Long-term (Month 1):
- [ ] Review server costs
- [ ] Analyze usage patterns
- [ ] Plan for scaling if needed
- [ ] Update documentation
- [ ] Schedule regular maintenance

---

## 🔄 Maintenance Schedule

### Daily:
- [ ] Check application logs
- [ ] Monitor server resources
- [ ] Verify backups completed

### Weekly:
- [ ] Review error logs
- [ ] Check disk space
- [ ] Test backup restoration
- [ ] Review security alerts

### Monthly:
- [ ] Update system packages
- [ ] Update Node.js dependencies
- [ ] Review and rotate logs
- [ ] Test disaster recovery plan
- [ ] Review and update documentation

### Quarterly:
- [ ] Security audit
- [ ] Performance optimization
- [ ] Cost optimization review
- [ ] Backup strategy review

---

## 🆘 Emergency Contacts

### Critical Issues:
- **Server Provider Support:** [Your provider's support]
- **MongoDB Support:** [Atlas support or your DBA]
- **AWS Support:** [AWS support]
- **Domain Registrar:** [Your registrar's support]

### Team Contacts:
- **Developer:** [Your contact]
- **System Admin:** [If different]
- **Database Admin:** [If different]

---

## 📞 Troubleshooting Quick Reference

### Application Won't Start:
```bash
# Check PM2 logs
pm2 logs crm-backend

# Check if port is in use
sudo lsof -i :5000

# Restart application
pm2 restart crm-backend
```

### Database Connection Failed:
```bash
# Test MongoDB connection
mongosh "your_connection_string"

# Check MongoDB Atlas IP whitelist
# Verify credentials in .env
```

### Nginx Errors:
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Out of Disk Space:
```bash
# Check disk usage
df -h

# Clean PM2 logs
pm2 flush

# Clean old logs
sudo journalctl --vacuum-time=7d

# Clean apt cache
sudo apt clean
```

---

## ✅ Deployment Complete!

Once all items are checked:
- [ ] **Deployment is complete**
- [ ] **Application is live**
- [ ] **Monitoring is active**
- [ ] **Backups are configured**
- [ ] **Documentation is updated**
- [ ] **Team is notified**

---

## 🎉 Congratulations!

Your CRM system is now deployed and running in production!

**Next Steps:**
1. Monitor for the first 24 hours
2. Gather user feedback
3. Plan for improvements
4. Celebrate your success! 🎊

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Server IP:** _______________
**Domain:** _______________
**MongoDB:** _______________
**Version:** _______________
