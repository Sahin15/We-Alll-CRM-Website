# 🔄 Work Assignment System Redesign - Status

## ✅ COMPLETED (Backend)

### 1. Database Model Updated
- ✅ Added universal fields: `title`, `description`, `workType`, `priority`, `status`, `dueDate`
- ✅ Added approval workflow: `approvalStatus`, `approvedBy`, `approvedAt`, `rejectionReason`
- ✅ Added flexible `metadata` field for department-specific data
- ✅ Added `attachments` array for file uploads
- ✅ Kept legacy fields for backward compatibility
- ✅ File: `backend/src/models/slotModel.js`

### 2. Controller Updated
- ✅ `createSlot` - Supports both new and legacy formats
- ✅ `updateSlotStatus` - Handles new status field with legacy mapping
- ✅ Backward compatible with existing digital marketing slots
- ✅ File: `backend/src/controllers/slotController.js`

### 3. Migration Script Created
- ✅ Script to migrate existing slots to new format
- ✅ File: `backend/scripts/migrateSlots.js`
- ⚠️ **ACTION REQUIRED**: Run migration on server

---

## 🚧 TODO (Frontend)

### 1. Update Slot Creation Form
**File**: `frontend/src/pages/calendar/ContentCalendar.jsx` or create new component

**Changes Needed**:
```jsx
// Instead of:
- Post Type dropdown
- Platforms checkboxes
- Content Bucket dropdown

// Use:
- Title input
- Description textarea
- Work Type dropdown (based on department/project)
- Priority dropdown
- Due Date picker
- Conditional fields based on work type
```

### 2. Update My Work Page
**File**: `frontend/src/pages/mywork/MyWork.jsx`

**Changes Needed**:
- Show `title` instead of `brief`
- Show `workType` badge
- Show `status` instead of `designStatus`
- Show `priority` indicator
- Filter by work type
- Universal design (not just social media)

### 3. Update Work Item Details
**File**: `frontend/src/components/slots/WorkItemDetails.jsx`

**Changes Needed**:
- Display universal fields
- Show department-specific metadata conditionally
- Update status dropdown to new values
- Add approval/rejection buttons for HoP/HoD
- Show approval workflow status

### 4. Update Calendar View
**File**: `frontend/src/pages/calendar/ContentCalendar.jsx`

**Changes Needed**:
- Rename "Content Calendar" → "Work Dashboard"
- Show all work types, not just social media
- Color code by work type
- Filter by department/work type
- Show `dueDate` instead of `postingDate`

### 5. Update API Calls
**File**: `frontend/src/api/slotApi.js`

**Changes Needed**:
- Update request payloads to use new fields
- Handle both old and new response formats
- Add approval/rejection endpoints

---

## 📋 Work Types by Department

### Digital Marketing
- Social Media Post
- Campaign
- Ad Creative
- Content Writing

### Development
- Feature Development
- Bug Fix
- Code Review
- Testing
- Deployment

### Graphics Design
- Logo Design
- Banner Design
- Brochure Design
- UI/UX Design
- Illustration

### Video Production
- Video Editing
- Animation
- Motion Graphics
- Filming
- Post Production

### General
- Research
- Documentation
- Meeting
- Training
- Other

---

## 🎯 New Status Flow

```
Pending → In Progress → Review → Approved → Completed
                          ↓
                      Revision (loops back)
```

**Old Status** (designStatus) → **New Status**:
- Planned → Pending
- In Design → In Progress
- Ready for Review → Review
- Approved → Approved
- Revision Needed → Revision

---

## 🚀 Deployment Steps

### On Server:

1. **Pull latest code**:
```bash
cd /root/We-Alll-CRM-Website
git pull origin main
```

2. **Run migration script**:
```bash
cd backend
node scripts/migrateSlots.js
```

3. **Restart backend**:
```bash
pm2 restart backend
```

4. **After frontend updates, rebuild**:
```bash
cd frontend
npm run build
pm2 restart frontend
```

---

## 📝 Key Benefits

1. ✅ **Universal**: Works for ALL departments
2. ✅ **Flexible**: Department-specific data in metadata
3. ✅ **Backward Compatible**: Existing slots still work
4. ✅ **Clear Workflow**: Approval/revision process
5. ✅ **Scalable**: Easy to add new work types

---

## ⚠️ Important Notes

- Backend is **READY** and **BACKWARD COMPATIBLE**
- Existing digital marketing slots will continue to work
- Frontend needs updates to use new fields
- Migration script should be run once on production
- Old API format still works (auto-converts to new format)

---

## 🎨 UI Mockup (New Work Assignment Form)

```
┌─────────────────────────────────────────┐
│  Create Work Assignment                 │
├─────────────────────────────────────────┤
│  Title: [_____________________________] │
│                                         │
│  Work Type: [Dropdown: Feature Dev ▼]  │
│                                         │
│  Description:                           │
│  [________________________________]     │
│  [________________________________]     │
│  [________________________________]     │
│                                         │
│  Assigned To: [Employee Dropdown ▼]    │
│                                         │
│  Priority: [Medium ▼]                  │
│                                         │
│  Due Date: [📅 Select Date]            │
│                                         │
│  --- Department Specific Fields ---    │
│  (Shown based on Work Type)            │
│                                         │
│  [Cancel]  [Create Assignment]         │
└─────────────────────────────────────────┘
```

---

**Next Step**: Update frontend components to use the new universal work assignment system!
