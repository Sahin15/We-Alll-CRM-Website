# Sangita Leave Balance Issue - Root Cause Analysis

## Issue Report
**Employee**: Sangita Dutta  
**Joining Date**: 16/02/2026  
**Current Date**: 16/02/2026  
**Expected Earned Leaves**: 2 (only February)  
**Actual Showing**: 4 (includes January - INCORRECT)

---

## Root Cause Analysis

### Investigation Results

1. **Database Check** ✅
   - Sangita's joining date is NOW SET: 16/02/2026
   - Database calculation returns: **2 earned leaves** (CORRECT)
   
2. **Code Logic Check** ✅
   - Leave calculation logic is FIXED
   - Debug logs confirm: `monthsWorked: 1, earned: 2`
   - Local testing shows: **2 earned leaves** (CORRECT)

3. **Frontend Display** ❌
   - Production server shows: **4 earned leaves** (INCORRECT)
   - This indicates: **Production server running OLD CODE**

### Conclusion

**The production server has NOT been restarted with the new code!**

The fix is already in the codebase, but the production server is still running the old version that:
- Doesn't consider joining dates
- Calculates: `currentMonth × 2 = 2 × 2 = 4 leaves`

---

## Evidence

### Local Test Results (Correct)
```
📊 Leave Balance (from database):
   Earned This Year: 2 leaves ✅
   
[LEAVE_CALC] Current year calculation { 
  joiningMonth: 2, 
  currentMonth: 2, 
  monthsWorked: 1, 
  earned: 2 
}
```

### Production Server (Incorrect)
```
Showing: 4 earned leaves ❌
```

This mismatch proves the production server needs to be restarted.

---

## Solution

### Step 1: Verify Joining Dates Are Set

Run on production server:
```bash
node backend/scripts/check-sangita-leaves.js
```

Expected output:
- Joining Date: 16/02/2026 ✅
- Earned This Year: 2 leaves ✅

If joining date is NOT SET, run:
```bash
node backend/scripts/set-sangita-joining-date.js
```

### Step 2: Restart Backend Server

```bash
pm2 restart crm-backend
```

### Step 3: Clear Browser Cache

Have Sangita:
1. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
2. Or clear browser cache
3. Or open in incognito/private window

### Step 4: Verify Fix

1. Login as Sangita Dutta
2. Go to "My Leaves" page
3. Check "Earned This Year" value
4. Should show: **2 days** ✅

---

## Why This Happened

1. **Code was updated locally** ✅
2. **Code was pushed to GitHub** ✅
3. **Production server was NOT updated** ❌
4. **Production server was NOT restarted** ❌

The production server is still running the old code from before the joining date fix was applied.

---

## Technical Details

### Old Calculation (Production Server)
```javascript
// Doesn't consider joining date
const earnedLeaves = currentMonth * 2;
// February = month 2
// earnedLeaves = 2 * 2 = 4 ❌
```

### New Calculation (Local/Fixed)
```javascript
// Considers joining date
if (joiningMonth === currentMonth) {
  const monthsWorked = currentMonth - joiningMonth + 1;
  const earnedLeaves = monthsWorked * 2;
  // monthsWorked = 2 - 2 + 1 = 1
  // earnedLeaves = 1 * 2 = 2 ✅
}
```

---

## Verification Checklist

After restarting production server:

- [ ] Sangita Dutta: 2 earned leaves (joined Feb 2026)
- [ ] Mustafizur Rahman: 2 earned leaves (joined Feb 2026)
- [ ] Easha Chattopadhyay: 2 earned leaves (joined Feb 2026)
- [ ] Rajat Biswas: 2 earned leaves (joined Feb 2026)
- [ ] Snigdha Payra: 2 earned leaves (joined Feb 2026)
- [ ] Suman Das: 4 earned leaves (joined Jan 2026)
- [ ] November 2025 joiners: 6 earned leaves

---

## Additional Scripts Created

### Check Sangita's Leave Balance
```bash
node backend/scripts/check-sangita-leaves.js
```

### Set Sangita's Joining Date
```bash
node backend/scripts/set-sangita-joining-date.js
```

### Check All Employees' Joining Dates
```bash
node backend/scripts/check-all-joining-dates.js
```

### Set All Employees' Joining Dates
```bash
node backend/scripts/set-all-joining-dates.js
```

### Test API Endpoint (requires JWT token)
```bash
TOKEN="jwt-token-here" node backend/scripts/test-api-leave-balance.js
```

---

## Summary

**Problem**: Production server showing 4 earned leaves instead of 2  
**Root Cause**: Production server not restarted with new code  
**Solution**: Restart production backend server  
**Status**: Fix is ready, just needs deployment

The code is correct, the database is correct, but the production server needs to be restarted to load the new code.

---

**Last Updated**: February 16, 2026  
**Status**: Awaiting production server restart
