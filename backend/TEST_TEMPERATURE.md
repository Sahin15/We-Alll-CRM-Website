# Testing Lead Temperature Update

## Steps to Fix and Test:

### 1. **Restart Backend Server**
The model changes require a server restart:
```bash
cd backend
npm run dev
```

### 2. **Check Server Logs**
When you try to update temperature, watch the console for:
- "Updating temperature for lead: [id] to: [Hot/Warm/Cold]"
- Any error messages

### 3. **Test the API Directly** (Optional)
You can test using the test-api.http file or curl:

```http
### Update Lead Temperature
PUT http://localhost:5000/api/leads/YOUR_LEAD_ID/temperature
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "temperature": "Hot"
}
```

### 4. **Common Issues & Solutions:**

**Issue: "Failed to update lead temperature"**
- **Solution**: Make sure backend server is running
- Check browser console (F12) for actual error message
- Check backend console for detailed logs

**Issue: "Lead not found"**
- **Solution**: Verify the lead ID is correct
- Check if you're logged in with proper permissions

**Issue: "Invalid temperature value"**
- **Solution**: Only "Hot", "Warm", or "Cold" are valid (case-sensitive)

**Issue: Route not found (404)**
- **Solution**: Restart backend server to load new routes

### 5. **What Changed:**

**Backend Model:**
- Changed `followUps.type` to `followUps.followUpType` (to avoid Mongoose conflict)
- Added `temperature` field with enum validation

**Backend Routes:**
- Added `PUT /api/leads/:id/temperature` endpoint

**Frontend:**
- Added dropdown to "Mark Qualified" button
- Shows temperature badge on lead details
- Better error messages with console logging

### 6. **Verify It's Working:**

1. Go to any lead details page
2. Click "Mark Qualified" dropdown
3. Select "Hot Lead", "Warm Lead", or "Cold Lead"
4. You should see:
   - Success toast: "Lead marked as [temperature] and Qualified"
   - Temperature badge appears next to status
   - Status changes to "Qualified"

### 7. **If Still Not Working:**

Check browser console (F12 → Console tab) for error details:
```javascript
// You should see this log:
Temperature update error: [detailed error object]
```

Then check backend console for:
```
Updating temperature for lead: [id] to: [temperature]
```

This will tell us exactly where the issue is!
