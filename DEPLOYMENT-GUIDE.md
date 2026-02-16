# Deployment Guide for Production Server

## Recent Fixes Applied

### 1. Clock-In Synchronization Issue (Fixed)
**Problem:** Clock-in button showing on server even after clocking in, but localhost works correctly.

**Root Cause:** 
- Backend attendance functions were using timezone-unaware date calculations
- Server and localhost in different timezones caused date range mismatches
- Frontend polling interval was too long (5 minutes)

**Fixes Applied:**
- ✅ All attendance functions now use IST timezone-aware date ranges (`getTodayRangeIST()`)
- ✅ Fixed functions: `getTodayAttendance`, `startBreak`, `endBreak`, `startOvertimeTimer`, `stopOvertimeTimer`, `getActiveOvertimeTimer`, `recalculateTodayStatus`, `fixTodayAttendance`, `manualAutoClockOut`
- ✅ Reduced frontend polling from 5 minutes to 30 seconds
- ✅ Added visibility change detection to refresh when user switches back to tab

### 2. Incorrect Leave Balance for New Employees (Fixed)
**Problem:** Employees who joined in February 2026 showing 4 earned leaves (as if they worked in January).

**Root Cause:**
- Leave calculation didn't consider employee joining date
- Calculated based on current month for all employees regardless of when they joined

**Fix Applied:**
- ✅ Modified `calculateEarnedLeaves()` to accept and consider joining date
- ✅ Employees now earn 2 leaves per month starting from their joining month
- ✅ Past years calculated pro-rata if employee joined mid-year
- ✅ Future years return 0 earned leaves

**Example:**
- Employee joined Feb 2026 → Earned leaves in Feb 2026 = 2 (1 month × 2)
- Employee joined Jan 2025 → Earned leaves in Feb 2026 = 4 (2 months × 2)
- Employee joined before 2026 → Earned leaves in Feb 2026 = 4 (2 months × 2)

---

## Deployment Steps for Production Server

### Step 1: Connect to Server
```bash
ssh root@srv1126122
cd ~/crm-website
```

### Step 2: Backup Current State (Optional but Recommended)
```bash
# Create a backup branch
git branch backup-$(date +%Y%m%d-%H%M%S)
```

### Step 3: Pull Latest Changes
```bash
# Stash any local changes
git stash

# Pull latest code
git pull origin main

# If there are conflicts with package-lock.json, resolve them:
git checkout --theirs frontend/package-lock.json
git checkout --theirs backend/package-lock.json
git add frontend/package-lock.json backend/package-lock.json
```

### Step 4: Install Dependencies
```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
npm install

cd ..
```

### Step 5: Verify Leave Balances (Optional)
```bash
# Check if any employees have incorrect leave balances
node backend/scripts/verify-leave-balances.js
```

### Step 6: Build Frontend
```bash
cd frontend
npm run build
cd ..
```

### Step 7: Restart Backend
```bash
# Restart the backend server
pm2 restart crm-backend

# Check status
pm2 status

# View logs to ensure no errors
pm2 logs crm-backend --lines 50
```

### Step 8: Verify Deployment
1. Open the website: https://wealll.cloud
2. Test clock-in functionality:
   - Clock in from one browser/device
   - Open another browser/device and verify it shows clocked-in state
   - Should not show "Clock In" button after already clocked in
3. Check leave balances:
   - Go to My Leaves page
   - Verify employees who joined in February show correct earned leaves (2 leaves, not 4)

---

## Troubleshooting

### Issue: "Already up to date" but changes not applied
```bash
# Force pull
git fetch origin
git reset --hard origin/main
```

### Issue: PM2 not restarting properly
```bash
# Stop and start instead of restart
pm2 stop crm-backend
pm2 start crm-backend

# Or delete and restart
pm2 delete crm-backend
pm2 start backend/src/server.js --name crm-backend
```

### Issue: Frontend not updating
```bash
# Clear build cache and rebuild
cd frontend
rm -rf dist
npm run build
cd ..
```

### Issue: Database connection errors
```bash
# Check MongoDB status
systemctl status mongod

# Restart MongoDB if needed
systemctl restart mongod
```

---

## Verification Commands

### Check Current Git Status
```bash
git status
git log --oneline -5
```

### Check PM2 Status
```bash
pm2 status
pm2 logs crm-backend --lines 20
```

### Test Attendance API
```bash
# Get today's attendance (replace TOKEN with actual JWT token)
curl -H "Authorization: Bearer TOKEN" https://wealll.cloud/api/attendance/today
```

### Check Leave Balances
```bash
node backend/scripts/verify-leave-balances.js
```

---

## Rollback Procedure (If Needed)

If something goes wrong, you can rollback:

```bash
# Find the backup branch or previous commit
git log --oneline -10

# Rollback to previous commit
git reset --hard <commit-hash>

# Rebuild and restart
cd frontend && npm run build && cd ..
pm2 restart crm-backend
```

---

## Post-Deployment Checklist

- [ ] Code pulled successfully from GitHub
- [ ] Dependencies installed (frontend & backend)
- [ ] Frontend built successfully
- [ ] Backend restarted via PM2
- [ ] Website accessible at https://wealll.cloud
- [ ] Clock-in/out working correctly across devices
- [ ] Leave balances showing correctly for new employees
- [ ] No errors in PM2 logs
- [ ] Database connection working

---

## Support

If you encounter any issues during deployment:
1. Check PM2 logs: `pm2 logs crm-backend`
2. Check MongoDB status: `systemctl status mongod`
3. Verify environment variables: `cat backend/.env`
4. Contact development team with error logs

---

**Last Updated:** February 16, 2026
**Commits Included:**
- `1f09498` - Fix clock-in sync issue between localhost and server
- `7c697fd` - Fix all attendance functions to use IST timezone
- `d7b9a9b` - Fix earned leave calculation and improve clock-in UI sync
