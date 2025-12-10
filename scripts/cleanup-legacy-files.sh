#!/bin/bash

# Legacy System Cleanup Script
# This script helps clean up old task/slot system files
# Run with: bash scripts/cleanup-legacy-files.sh

echo "========================================="
echo "Legacy System Cleanup Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${YELLOW}Found:${NC} $1"
        return 0
    else
        echo -e "${GREEN}Not found (already removed):${NC} $1"
        return 1
    fi
}

# Function to backup file
backup_file() {
    if [ -f "$1" ]; then
        mkdir -p .legacy_backup
        cp "$1" ".legacy_backup/$(basename $1).backup"
        echo -e "${GREEN}Backed up:${NC} $1"
    fi
}

echo "Step 1: Checking for legacy backend files..."
echo "-------------------------------------------"

# Backend Controllers
echo ""
echo "Backend Controllers:"
check_file "backend/src/controllers/taskController.js"
check_file "backend/src/controllers/slotController.js"

# Backend Routes
echo ""
echo "Backend Routes:"
check_file "backend/src/routes/taskRoutes.js"
check_file "backend/src/routes/slotRoutes.js"
check_file "backend/src/routes/workRoutes.js"

# Backend Models (keep for now)
echo ""
echo "Backend Models (keeping for migration):"
check_file "backend/src/models/taskModel.js"
check_file "backend/src/models/slotModel.js"

echo ""
echo "Step 2: Checking for legacy frontend files..."
echo "-------------------------------------------"

# Frontend API files
echo ""
echo "Frontend API Files:"
check_file "frontend/src/api/taskApi.js"
check_file "frontend/src/api/slotApi.js"
check_file "frontend/src/api/workApi.js"

# Frontend Components
echo ""
echo "Frontend Components:"
check_file "frontend/src/components/work/WorkItemDetails.jsx"

echo ""
echo "Step 3: Checking server.js for old route registrations..."
echo "-------------------------------------------"

if grep -q "taskRoutes" backend/src/server.js; then
    echo -e "${YELLOW}Found taskRoutes registration in server.js${NC}"
else
    echo -e "${GREEN}No taskRoutes registration found${NC}"
fi

if grep -q "slotRoutes" backend/src/server.js; then
    echo -e "${YELLOW}Found slotRoutes registration in server.js${NC}"
else
    echo -e "${GREEN}No slotRoutes registration found${NC}"
fi

if grep -q 'app.use("/api/work"' backend/src/server.js; then
    echo -e "${YELLOW}Found /api/work route registration in server.js${NC}"
else
    echo -e "${GREEN}No /api/work route registration found${NC}"
fi

echo ""
echo "Step 4: Searching for references to old files..."
echo "-------------------------------------------"

echo ""
echo "Searching for taskController references..."
grep -r "taskController" backend/src/ --exclude-dir=node_modules 2>/dev/null | head -5

echo ""
echo "Searching for slotController references..."
grep -r "slotController" backend/src/ --exclude-dir=node_modules 2>/dev/null | head -5

echo ""
echo "Searching for taskApi references..."
grep -r "taskApi" frontend/src/ --exclude-dir=node_modules 2>/dev/null | head -5

echo ""
echo "Searching for slotApi references..."
grep -r "slotApi" frontend/src/ --exclude-dir=node_modules 2>/dev/null | head -5

echo ""
echo "========================================="
echo "Cleanup Summary"
echo "========================================="
echo ""
echo "⚠️  IMPORTANT: Before running cleanup, ensure:"
echo "   1. Data migration is complete"
echo "   2. New system tested in production"
echo "   3. Backup created"
echo "   4. Team notified"
echo ""
echo "To proceed with cleanup, run:"
echo "   bash scripts/cleanup-legacy-files.sh --execute"
echo ""
echo "To just add deprecation warnings, run:"
echo "   bash scripts/cleanup-legacy-files.sh --deprecate"
echo ""

# Check if --execute flag is provided
if [ "$1" == "--execute" ]; then
    echo ""
    echo "========================================="
    echo "EXECUTING CLEANUP"
    echo "========================================="
    echo ""
    
    read -p "Are you sure you want to delete legacy files? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Cleanup cancelled."
        exit 0
    fi
    
    echo ""
    echo "Creating backups..."
    mkdir -p .legacy_backup
    
    # Backup and remove backend files
    backup_file "backend/src/controllers/taskController.js"
    backup_file "backend/src/controllers/slotController.js"
    backup_file "backend/src/routes/taskRoutes.js"
    backup_file "backend/src/routes/slotRoutes.js"
    backup_file "backend/src/routes/workRoutes.js"
    
    # Backup and remove frontend files
    backup_file "frontend/src/api/taskApi.js"
    backup_file "frontend/src/api/slotApi.js"
    backup_file "frontend/src/api/workApi.js"
    
    echo ""
    echo "Removing legacy files..."
    
    rm -f backend/src/controllers/taskController.js
    rm -f backend/src/controllers/slotController.js
    rm -f backend/src/routes/taskRoutes.js
    rm -f backend/src/routes/slotRoutes.js
    rm -f backend/src/routes/workRoutes.js
    rm -f frontend/src/api/taskApi.js
    rm -f frontend/src/api/slotApi.js
    rm -f frontend/src/api/workApi.js
    
    echo -e "${GREEN}Cleanup complete!${NC}"
    echo ""
    echo "Backups saved in: .legacy_backup/"
    echo ""
    echo "Next steps:"
    echo "1. Remove old route registrations from server.js"
    echo "2. Search and remove any remaining imports"
    echo "3. Test the application"
    echo "4. Commit changes"
    
elif [ "$1" == "--deprecate" ]; then
    echo ""
    echo "========================================="
    echo "ADDING DEPRECATION WARNINGS"
    echo "========================================="
    echo ""
    echo "This would add deprecation warnings to legacy files."
    echo "Feature not yet implemented."
    echo "Manually add deprecation notices to the files listed above."
fi

echo ""
echo "For more information, see: CLEANUP_PLAN.md"
echo ""
