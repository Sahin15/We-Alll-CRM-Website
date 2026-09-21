#!/bin/bash
# Run on UAT VPS: bash deploy/diagnose-uat-vps.sh
# Prints why uat.wealll.cloud may still serve an old frontend build.

set -euo pipefail

APP_DIR="/root/crm-website-uat"
EXPECTED_ROOT="/var/www/crm-uat/frontend/dist"

echo "========== UAT deploy diagnostics =========="
echo ""

echo "1) nginx root for uat.wealll.cloud"
sudo nginx -T 2>/dev/null | awk '
  /server_name/ && $0 ~ /uat\.wealll\.cloud/ { in_uat=1 }
  in_uat && /root / { print; in_uat=0 }
' || echo "   (could not read nginx -T)"

echo ""
echo "2) App directory + git"
if [ ! -d "$APP_DIR/.git" ]; then
  echo "   ERROR: $APP_DIR is not a git repo"
else
  cd "$APP_DIR"
  echo "   path: $(pwd)"
  echo "   branch: $(git branch --show-current)"
  echo "   commit: $(git log -1 --oneline)"
  if grep -q 'openEntryModal' frontend/src/components/projects/workspace/MonthlyGoalsSection.jsx 2>/dev/null; then
    echo "   source: MonthlyGoalsSection.jsx HAS latest goals/objectives fix"
  else
    echo "   source: MonthlyGoalsSection.jsx MISSING latest fix — git sync failed"
  fi
fi

echo ""
echo "3) Built files on disk (what nginx should serve)"
if [ -f "$EXPECTED_ROOT/sw.js" ]; then
  echo "   sw.js mtime: $(stat -c '%y' "$EXPECTED_ROOT/sw.js")"
  ls -1 "$EXPECTED_ROOT/assets/js/project-workspace-"*.js 2>/dev/null || echo "   no project-workspace chunk"
  if grep -q "Add Objective for" "$EXPECTED_ROOT/assets/js/project-workspace-"*.js 2>/dev/null; then
    echo "   bundle: contains 'Add Objective for' (NEW build)"
  else
    echo "   bundle: OLD build (missing 'Add Objective for')"
  fi
else
  echo "   ERROR: $EXPECTED_ROOT/sw.js not found — frontend never built here"
fi

echo ""
echo "4) PM2 UAT API"
pm2 describe crm-uat-api 2>/dev/null | grep -E 'status|cwd|script path' || echo "   crm-uat-api not running in PM2"

echo ""
echo "========== end diagnostics =========="
