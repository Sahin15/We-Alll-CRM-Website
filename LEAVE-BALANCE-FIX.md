# Leave Balance Fix - February 2026

## Problem Summary

Employees who joined in February 2026 (like Sangita Dutta who joined on 16/02/2026) are showing **4 earned leaves** instead of the correct **2 earned leaves**.

### Root Causes

1. **Missing Joining Dates**: 21 out of 23 employees don't have their `joiningDate` field set in the database
2. **Incorrect Calculation Logic**: The old leave calculation didn't consider employee joining dates
3. **Server Not Updated**: Production server running old code without the fixes

## Current Situation

### Sangita Dutta Example
- **Joining Date**: 16/02/2026 (February 16, 2026)
- **Current Date**: 16/02/2026 (February 16, 2026)
- **Showing**: 4 earned leaves (INCORRECT - includes January when she hadn't joined)
- **Should Show**: 2 earned leaves (only February)

### Why 4 Leaves?
The old calculation: `currentMonth × 2 = 2 × 2 = 4 leaves`
- January: 2 leaves ❌ (employee hadn't joined)
- February: 2 leaves ✓
- **Total: 4 leaves** (WRONG)

### Why Should Be 2 Leaves?
The new calculation considers joining date:
- January: 0 leaves (not joined yet)
- February: 2 leaves (joined this month)
- **Total: 2 leaves** (CORRECT)

## Solution Applied

### 1. Fixed Leave Calculation Logic

Updated `backend/src/models/leaveRequestModel.js`:

```javascript
// New logic considers joining date
leaveRequestSchema.statics.calculateEarnedLeaves = function(year, joiningDate) {
  // If employee joined this year
  if (joiningYear === currentYear) {
    // Calculate months from joining month to current month (inclusive)
    const monthsWorked = currentMonth - joiningMonth + 1;
    return Math.min(monthsWorked * 2, 24);
  }
  // ... other cases
}
```

**Rules:**
- Employees earn 2 leaves per month starting from their joining month
- If they join mid-month, they still get the full month's leaves
- Maximum 24 leaves per year
- Past months before joining = 0 leaves

### 2. Created Diagnostic Scripts

**Check specific employee:**
```bash
node backend/scripts/check-sangita-leaves.js
```

**Check all employees:**
```bash
node backend/scripts/check-all-joining-dates.js
```

**Verify leave balances:**
```bash
node backend/scripts/verify-leave-balances.js
```

### 3. Created Fix Scripts

**Set joining date for Sangita:**
```bash
node backend/scripts/set-sangita-joining-date.js
```

**Set joining dates for all employees:**
```bash
node backend/scripts/set-all-joining-dates.js
```

## Deployment Steps

### Step 1: Pull Latest Code on Production Server

```bash
ssh root@srv1126122
cd ~/crm-website
git pull origin main
```

### Step 2: Set Joining Dates for All Employees

```bash
# Check which employees are missing joining dates
node backend/scripts/check-all-joining-dates.js

# Set joining dates (uses account creation date)
node backend/scripts/set-all-joining-dates.js
```

This will set joining dates for 21 employees who don't have one.

### Step 3: Install Dependencies and Restart

```bash
# Install any new dependencies
cd backend && npm install && cd ..

# Restart backend
pm2 restart crm-backend

# Check logs
pm2 logs crm-backend --lines 20
```

### Step 4: Verify the Fix

```bash
# Check Sangita's leave balance
node backend/scripts/check-sangita-leaves.js

# Verify all leave balances
node backend/scripts/verify-leave-balances.js
```

**Expected Results:**
- Sangita Dutta: 2 earned leaves (joined Feb 2026)
- Mustafizur Rahman: 2 earned leaves (joined Feb 2026)
- Easha Chattopadhyay: 2 earned leaves (joined Feb 2026)
- Rajat Biswas: 2 earned leaves (joined Feb 2026)
- Snigdha Payra: 2 earned leaves (joined Feb 2026)
- Suman Das: 4 earned leaves (joined Jan 2026)
- Others who joined Nov 2025: 6 earned leaves (Nov, Dec, Jan = 3 months × 2)

## Verification Checklist

After deployment, verify:

- [ ] Code pulled successfully
- [ ] Joining dates set for all employees
- [ ] Backend restarted
- [ ] Sangita Dutta shows 2 earned leaves (not 4)
- [ ] Other February joiners show 2 earned leaves
- [ ] January joiners show 4 earned leaves
- [ ] November 2025 joiners show 6 earned leaves
- [ ] No errors in PM2 logs

## Testing on Frontend

1. Login as Sangita Dutta
2. Go to "My Leaves" page
3. Check the leave balance card
4. Should show:
   - **Earned This Year**: 2 days
   - **Used**: 0 days
   - **Remaining**: 2 days

## Employees Affected

### February 2026 Joiners (Should show 2 leaves)
1. Sangita Dutta - 16/02/2026
2. Mustafizur Rahman Choudhury - 16/02/2026
3. Easha Chattopadhyay - 16/02/2026
4. Rajat Biswas - 09/02/2026
5. Snigdha Payra - 05/02/2026

### January 2026 Joiners (Should show 4 leaves)
1. Suman Das - 16/01/2026

### November 2025 Joiners (Should show 6 leaves)
1. Test - 25/11/2025
2. Hiya Sarkar - 24/11/2025
3. HR - 24/11/2025
4. Monoj Hati - 24/11/2025
5. Shubhra Karmakar - 24/11/2025
6. Jit Sarkar - 24/11/2025
7. Rahul Shaw - 24/11/2025
8. Angshu Biswas - 24/11/2025
9. Devjani Naskar - 24/11/2025
10. Trishika Karmakar - 24/11/2025
11. Nabanita Mondal - 24/11/2025
12. Anney Gomes - 24/11/2025
13. Priyotosh Sarkar - 24/11/2025
14. Sneha Sarkar - 24/11/2025
15. Rakesh Das - 24/11/2025

## Technical Details

### Database Changes
- Field: `User.joiningDate`
- Type: Date
- Purpose: Track when employee joined the company
- Used by: Leave calculation logic

### Calculation Formula

```
If employee joined this year:
  monthsWorked = currentMonth - joiningMonth + 1
  earnedLeaves = min(monthsWorked × 2, 24)

If employee joined before this year:
  earnedLeaves = min(currentMonth × 2, 24)

If employee hasn't joined yet:
  earnedLeaves = 0
```

### Example Calculations (as of Feb 16, 2026)

| Employee | Joining Date | Months Worked | Calculation | Earned Leaves |
|----------|--------------|---------------|-------------|---------------|
| Sangita | 16/02/2026 | 1 (Feb) | 1 × 2 | 2 |
| Suman | 16/01/2026 | 2 (Jan, Feb) | 2 × 2 | 4 |
| Rahul | 24/11/2025 | 3 (Nov, Dec, Jan) | 3 × 2 | 6 |

Note: Current month (February) is counted because they joined before or during it.

## Rollback Procedure

If issues occur, rollback:

```bash
# Revert to previous commit
git log --oneline -5
git reset --hard <previous-commit-hash>

# Rebuild and restart
pm2 restart crm-backend
```

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs crm-backend`
2. Verify joining dates: `node backend/scripts/check-all-joining-dates.js`
3. Check leave balances: `node backend/scripts/verify-leave-balances.js`

---

**Last Updated**: February 16, 2026  
**Status**: Ready for deployment  
**Commits**: 
- `c911c92` - Fix leave calculation for mid-month joiners
- `7551249` - Add scripts to check and set joining dates
