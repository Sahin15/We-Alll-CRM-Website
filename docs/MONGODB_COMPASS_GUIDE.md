# 🧭 MongoDB Compass Guide for Your CRM

Complete guide to using MongoDB Compass with your CRM system.

---

## 📖 What is MongoDB Compass?

**MongoDB Compass** is a free GUI (Graphical User Interface) for MongoDB that lets you:
- ✅ View your database visually
- ✅ Browse collections and documents
- ✅ Run queries without code
- ✅ Export/import data
- ✅ Monitor performance
- ✅ Create backups

**You already have it installed!** 🎉

---

## 🔌 Connecting to Your Database

### Step 1: Get Your Connection String

**From MongoDB Atlas:**
1. Go to https://cloud.mongodb.com
2. Click your cluster
3. Click "Connect"
4. Choose "Connect using MongoDB Compass"
5. Copy the connection string

**From Compass (if already connected):**
1. Open MongoDB Compass
2. Look at "Saved Connections"
3. Click "..." menu next to your connection
4. Click "Copy Connection String"

**Connection string format:**
```
mongodb+srv://username:password@cluster.mongodb.net/crm-database
```

### Step 2: Connect in Compass

1. Open MongoDB Compass
2. Paste connection string in the box
3. Click "Connect"
4. Wait a few seconds
5. You're in! ✅

---

## 📊 Understanding Your CRM Database

### Database Structure:

```
crm-database/
├── users              # All users (admin, clients)
├── services           # Your services
├── plans              # Your plans
├── invoices           # All invoices
├── payments           # Payment records
├── subscriptions      # Active subscriptions
├── notifications      # System notifications
├── leads              # Lead management
└── ...more collections
```

### What Each Collection Contains:

#### `users` Collection
**What it stores:** All user accounts
**Fields:**
- `name` - User's full name
- `email` - Login email
- `password` - Hashed password
- `role` - "admin" or "client"
- `department` - User's department
- `profilePicture` - S3 URL
- `isActive` - true/false
- `createdAt` - Registration date

**Example document:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin",
  "department": "Management",
  "isActive": true,
  "createdAt": "2024-11-17T10:00:00.000Z"
}
```

#### `services` Collection
**What it stores:** All services you offer
**Fields:**
- `name` - Service name
- `company` - "We Alll" or "Kolkata Digital"
- `category` - Service category
- `basePrice` - Price in INR
- `allowedBillingCycles` - ["monthly", "yearly", etc.]
- `features` - Array of features
- `isActive` - true/false
- `isPopular` - true/false

#### `plans` Collection
**What it stores:** Service bundles/packages
**Fields:**
- `name` - Plan name
- `company` - Company name
- `planType` - "basic", "standard", "premium"
- `includedServices` - Array of services
- `finalPrice` - Calculated price
- `isActive` - true/false
- `isPopular` - true/false

#### `invoices` Collection
**What it stores:** All invoices
**Fields:**
- `invoiceNumber` - Auto-generated (INV-001)
- `client` - User ID reference
- `subscription` - Subscription ID
- `items` - Array of line items
- `totalAmount` - Total in INR
- `status` - "draft", "sent", "paid", "overdue"
- `dueDate` - Payment due date

#### `payments` Collection
**What it stores:** Payment submissions
**Fields:**
- `client` - User ID
- `subscription` - Subscription ID
- `amount` - Amount paid
- `paymentMethod` - "bank", "upi", "cash"
- `paymentProof` - S3 URL of image
- `status` - "pending", "verified", "rejected"
- `verifiedBy` - Admin user ID
- `verifiedAt` - Verification timestamp

#### `subscriptions` Collection
**What it stores:** Active subscriptions
**Fields:**
- `subscriptionNumber` - Auto-generated (SUB-001)
- `client` - User ID
- `plan` - Plan ID
- `billingCycle` - "monthly", "yearly", etc.
- `status` - "active", "suspended", "cancelled"
- `startDate` - Subscription start
- `nextBillingDate` - Next payment due

---

## 🔍 Common Tasks in Compass

### 1. View All Users

1. Click `crm-database`
2. Click `users` collection
3. See all users listed
4. Click any user to see details

**Filter admins only:**
```json
{ "role": "admin" }
```

**Filter active users:**
```json
{ "isActive": true }
```

### 2. Find Specific User

**By email:**
```json
{ "email": "john@example.com" }
```

**By name (partial match):**
```json
{ "name": { "$regex": "John", "$options": "i" } }
```

### 3. View All Services

1. Click `services` collection
2. See all services

**Filter by company:**
```json
{ "company": "We Alll" }
```

**Filter active services:**
```json
{ "isActive": true }
```

**Filter by category:**
```json
{ "category": "SEO" }
```

### 4. View All Plans

1. Click `plans` collection
2. See all plans

**Filter popular plans:**
```json
{ "isPopular": true }
```

**Filter by type:**
```json
{ "planType": "premium" }
```

### 5. View Pending Payments

1. Click `payments` collection
2. Filter:
```json
{ "status": "pending" }
```

### 6. View Active Subscriptions

1. Click `subscriptions` collection
2. Filter:
```json
{ "status": "active" }
```

### 7. View Overdue Invoices

1. Click `invoices` collection
2. Filter:
```json
{ "status": "overdue" }
```

---

## 📤 Export Data

### Export Single Collection:

1. Click on collection (e.g., `users`)
2. Click "..." menu at top
3. Click "Export Collection"
4. Choose format:
   - **JSON** - For backups, imports
   - **CSV** - For Excel, reports
5. Choose location
6. Click "Export"

### Export Filtered Data:

1. Apply filter first (e.g., `{ "role": "admin" }`)
2. Click "Export Collection"
3. Only filtered data will be exported

### Export All Collections (Full Backup):

1. Export each collection one by one
2. Save all JSON files in a folder
3. Name folder: `crm-backup-2024-11-17`
4. Store securely

---

## 📥 Import Data

### Import to Collection:

1. Click on collection
2. Click "Add Data" → "Import File"
3. Choose JSON or CSV file
4. Map fields (if CSV)
5. Click "Import"

### Import Backup:

1. Create collections if they don't exist
2. Import each JSON file to its collection
3. Verify data imported correctly

---

## 🔧 Advanced Features

### 1. Schema Analysis

**What it does:** Shows data structure and types

**How to use:**
1. Click on collection
2. Click "Schema" tab
3. See field types, patterns, and statistics
4. Understand your data structure

### 2. Aggregation Pipeline

**What it does:** Complex queries and data transformations

**Example - Count users by role:**
1. Click `users` collection
2. Click "Aggregations" tab
3. Add stage: `$group`
```json
{
  "_id": "$role",
  "count": { "$sum": 1 }
}
```
4. Click "Run"
5. See results

### 3. Indexes

**What it does:** Speed up queries

**View indexes:**
1. Click on collection
2. Click "Indexes" tab
3. See existing indexes

**Create index:**
1. Click "Create Index"
2. Choose field (e.g., `email`)
3. Choose type (ascending)
4. Click "Create"

### 4. Explain Plan

**What it does:** Shows query performance

**How to use:**
1. Write a query
2. Click "Explain"
3. See execution time and strategy
4. Optimize if slow

---

## 🛠️ Useful Queries

### Find by Date Range:

**Invoices created this month:**
```json
{
  "createdAt": {
    "$gte": "2024-11-01T00:00:00.000Z",
    "$lte": "2024-11-30T23:59:59.999Z"
  }
}
```

### Find by Multiple Conditions:

**Active admin users:**
```json
{
  "role": "admin",
  "isActive": true
}
```

### Find with OR Condition:

**Pending or verified payments:**
```json
{
  "$or": [
    { "status": "pending" },
    { "status": "verified" }
  ]
}
```

### Find by Array Contains:

**Services with monthly billing:**
```json
{
  "allowedBillingCycles": "monthly"
}
```

### Find by Price Range:

**Services between ₹5000 and ₹15000:**
```json
{
  "basePrice": {
    "$gte": 5000,
    "$lte": 15000
  }
}
```

### Sort Results:

**Latest invoices first:**
1. Apply filter (or leave empty for all)
2. Click "Sort" dropdown
3. Choose field: `createdAt`
4. Choose order: Descending (1 to -1)

---

## 📊 Monitoring & Analytics

### Database Size:

1. Click database name (`crm-database`)
2. See "Storage Size" at top
3. Monitor as data grows

### Collection Stats:

1. Click on collection
2. See document count at top
3. See storage size

### Performance:

1. Click "Performance" tab (if available)
2. See slow queries
3. Optimize indexes

---

## 🔐 Security Best Practices

### DO:
- ✅ Use Compass to VIEW data
- ✅ Export backups regularly
- ✅ Monitor database size
- ✅ Check data integrity
- ✅ Debug issues

### DON'T:
- ❌ Manually edit production data (use CRM instead)
- ❌ Delete collections (unless you know what you're doing)
- ❌ Share connection string publicly
- ❌ Modify user passwords directly (they're hashed)
- ❌ Delete important documents

---

## 🐛 Troubleshooting

### Can't Connect to Database:

**Check:**
1. Is Hostinger VPS IP whitelisted in MongoDB Atlas?
2. Is connection string correct?
3. Is password correct?
4. Is internet connection working?

**Solution:**
- Go to MongoDB Atlas → Network Access
- Add Hostinger VPS IP
- OR use 0.0.0.0/0 (allow from anywhere)

### Database is Empty:

**This is normal!**
- Database starts empty after deployment
- Data appears when you use the CRM
- Create services, plans, etc. through the application

### Can't See Recent Data:

**Solution:**
- Click "Refresh" button (circular arrow icon)
- Or press F5
- Data updates in real-time

### Connection Timeout:

**Check:**
- Internet connection
- MongoDB Atlas status
- Firewall settings

---

## 💡 Tips & Tricks

### Quick Tips:

1. **Save Favorite Queries:**
   - Write query
   - Click "Save" icon
   - Name it (e.g., "Active Users")
   - Reuse anytime

2. **Keyboard Shortcuts:**
   - `Ctrl+F` - Find in documents
   - `Ctrl+R` - Refresh
   - `Ctrl+K` - Command palette

3. **Copy Document:**
   - Click document
   - Click "Copy" icon
   - Paste in text editor

4. **Clone Document:**
   - Click document
   - Click "Clone" icon
   - Modify and insert

5. **View as JSON:**
   - Click document
   - See formatted JSON
   - Easy to read

### Performance Tips:

1. **Use Indexes:**
   - Create indexes on frequently queried fields
   - Email, status, dates

2. **Limit Results:**
   - Use "Limit" option
   - Don't load thousands of documents at once

3. **Use Filters:**
   - Filter before viewing
   - Faster than loading all data

---

## 📚 Common Scenarios

### Scenario 1: Check if User Exists

1. Click `users` collection
2. Filter: `{ "email": "user@example.com" }`
3. If found, user exists
4. If empty, user doesn't exist

### Scenario 2: Find All Pending Payments

1. Click `payments` collection
2. Filter: `{ "status": "pending" }`
3. See all pending payments
4. Note payment IDs for verification

### Scenario 3: Export Monthly Report

1. Click `invoices` collection
2. Filter by date range (this month)
3. Export as CSV
4. Open in Excel
5. Create report

### Scenario 4: Backup Before Major Change

1. Export all collections
2. Save JSON files
3. Make changes in CRM
4. If issue, restore from backup

### Scenario 5: Check Subscription Status

1. Click `subscriptions` collection
2. Filter: `{ "client": "user_id_here" }`
3. See user's subscriptions
4. Check status and dates

---

## 🎓 Learning Resources

### MongoDB Compass:
- **Official Docs:** https://docs.mongodb.com/compass
- **Video Tutorials:** YouTube "MongoDB Compass Tutorial"
- **Community:** MongoDB Community Forums

### MongoDB Query Language:
- **Query Docs:** https://docs.mongodb.com/manual/tutorial/query-documents
- **Operators:** https://docs.mongodb.com/manual/reference/operator

---

## ✅ Quick Reference Card

### Connection:
```
mongodb+srv://user:pass@cluster.mongodb.net/crm-database
```

### Common Filters:
```json
{ "role": "admin" }                    // Find admins
{ "status": "pending" }                // Find pending
{ "isActive": true }                   // Find active
{ "company": "We Alll" }              // Find by company
{ "email": "user@example.com" }       // Find by email
```

### Common Actions:
- **View:** Click collection
- **Filter:** Enter JSON in filter bar
- **Export:** "..." menu → Export
- **Refresh:** Circular arrow icon
- **Search:** Ctrl+F

---

## 🎉 You're Ready!

You now know how to:
- ✅ Connect to your database
- ✅ View all your CRM data
- ✅ Run queries and filters
- ✅ Export data and backups
- ✅ Monitor your database
- ✅ Troubleshoot issues

**MongoDB Compass is your window into your CRM data!** 🪟

Use it alongside your CRM application for complete control and visibility.

---

*Guide last updated: November 17, 2025*
*For: CRM System with MongoDB Atlas*
