#!/bin/bash

# Duplicate Files Cleanup Script
# Removes old/duplicate files from frontend and backend

echo "========================================="
echo "🧹 Duplicate Files Cleanup Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
deleted_count=0

# Function to delete file safely
delete_file() {
    if [ -f "$1" ]; then
        rm "$1"
        echo -e "${GREEN}✓ Deleted:${NC} $1"
        ((deleted_count++))
    else
        echo -e "${YELLOW}⊘ Not found:${NC} $1"
    fi
}

echo "Creating backup directory..."
mkdir -p .cleanup_backup/frontend/pages
mkdir -p .cleanup_backup/frontend/api
mkdir -p .cleanup_backup/backend

echo ""
echo "Step 1: Backing up files..."
echo "-------------------------------------------"

# Backup frontend pages
[ -f "frontend/src/pages/calendar/ContentCalendar.jsx" ] && cp "frontend/src/pages/calendar/ContentCalendar.jsx" ".cleanup_backup/frontend/pages/"
[ -f "frontend/src/pages/employee/MySlots.jsx" ] && cp "frontend/src/pages/employee/MySlots.jsx" ".cleanup_backup/frontend/pages/"
[ -f "frontend/src/pages/employee/MyTasks.jsx" ] && cp "frontend/src/pages/employee/MyTasks.jsx" ".cleanup_backup/frontend/pages/"
[ -f "frontend/src/pages/employee/MyWork.jsx" ] && cp "frontend/src/pages/employee/MyWork.jsx" ".cleanup_backup/frontend/pages/"
[ -f "frontend/src/pages/projects/ProjectList_new.jsx" ] && cp "frontend/src/pages/projects/ProjectList_new.jsx" ".cleanup_backup/frontend/pages/"
[ -f "frontend/src/pages/dashboard/AdminDashboard.backup.jsx" ] && cp "frontend/src/pages/dashboard/AdminDashboard.backup.jsx" ".cleanup_backup/frontend/pages/"
[ -f "frontend/src/pages/employee/MyProfile.jsx" ] && cp "frontend/src/pages/employee/MyProfile.jsx" ".cleanup_backup/frontend/pages/"
[ -f "frontend/src/pages/employee/MyProfileEnhanced.jsx" ] && cp "frontend/src/pages/employee/MyProfileEnhanced.jsx" ".cleanup_backup/frontend/pages/"

# Backup API files
[ -f "frontend/src/api/taskApi.js" ] && cp "frontend/src/api/taskApi.js" ".cleanup_backup/frontend/api/"
[ -f "frontend/src/api/slotApi.js" ] && cp "frontend/src/api/slotApi.js" ".cleanup_backup/frontend/api/"
[ -f "frontend/src/api/workApi.js" ] && cp "frontend/src/api/workApi.js" ".cleanup_backup/frontend/api/"

# Backup backend files
[ -f "backend/src/controllers/taskController.js" ] && cp "backend/src/controllers/taskController.js" ".cleanup_backup/backend/"
[ -f "backend/src/controllers/slotController.js" ] && cp "backend/src/controllers/slotController.js" ".cleanup_backup/backend/"
[ -f "backend/src/routes/taskRoutes.js" ] && cp "backend/src/routes/taskRoutes.js" ".cleanup_backup/backend/"
[ -f "backend/src/routes/slotRoutes.js" ] && cp "backend/src/routes/slotRoutes.js" ".cleanup_backup/backend/"
[ -f "backend/src/routes/workRoutes.js" ] && cp "backend/src/routes/workRoutes.js" ".cleanup_backup/backend/"

echo -e "${GREEN}✓ Backup complete${NC}"

echo ""
echo "Step 2: Deleting duplicate frontend pages..."
echo "-------------------------------------------"

delete_file "frontend/src/pages/calendar/ContentCalendar.jsx"
delete_file "frontend/src/pages/employee/MySlots.jsx"
delete_file "frontend/src/pages/employee/MyTasks.jsx"
delete_file "frontend/src/pages/employee/MyWork.jsx"
delete_file "frontend/src/pages/projects/ProjectList_new.jsx"
delete_file "frontend/src/pages/dashboard/AdminDashboard.backup.jsx"
delete_file "frontend/src/pages/employee/MyProfile.jsx"
delete_file "frontend/src/pages/employee/MyProfileEnhanced.jsx"

echo ""
echo "Step 3: Deleting duplicate API files..."
echo "-------------------------------------------"

delete_file "frontend/src/api/taskApi.js"
delete_file "frontend/src/api/slotApi.js"
delete_file "frontend/src/api/workApi.js"

echo ""
echo "Step 4: Deleting duplicate backend files..."
echo "-------------------------------------------"

delete_file "backend/src/controllers/taskController.js"
delete_file "backend/src/controllers/slotController.js"
delete_file "backend/src/routes/taskRoutes.js"
delete_file "backend/src/routes/slotRoutes.js"
delete_file "backend/src/routes/workRoutes.js"

echo ""
echo "========================================="
echo "✅ Cleanup Complete!"
echo "========================================="
echo ""
echo "📊 Summary:"
echo "  - Files deleted: $deleted_count"
echo "  - Backups saved in: .cleanup_backup/"
echo ""
echo "⚠️  Next Steps:"
echo "  1. Check frontend/src/routes for old route references"
echo "  2. Check navigation/sidebar for old menu items"
echo "  3. Test the application: npm run dev"
echo "  4. Search for any remaining imports:"
echo "     grep -r 'ContentCalendar' frontend/src/"
echo "     grep -r 'MySlots' frontend/src/"
echo "     grep -r 'taskApi' frontend/src/"
echo ""
echo "🔄 To restore files if needed:"
echo "  cp .cleanup_backup/frontend/pages/* frontend/src/pages/..."
echo ""
