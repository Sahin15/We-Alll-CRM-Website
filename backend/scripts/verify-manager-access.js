/**
 * Verification Script for Manager Role Access
 * Checks if manager role is properly configured in all routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesDir = path.join(__dirname, '../src/routes');

console.log('=== Manager Role Access Verification ===\n');

// Critical routes that must have manager role
const criticalRoutes = [
  'departmentRoutes.js',
  'leaveRoutes.js',
  'salaryPreviewRoutes.js',
  'salarySlipRoutes.js',
  'salaryStructureRoutes.js',
  'salaryTemplateRoutes.js',
  'userRoutes.js',
  'attendanceRoutes.js',
  'adminDashboardRoutes.js',
  'invoiceRoutes.js',
  'paymentRoutes.js',
  'subscriptionRoutes.js'
];

let allPassed = true;

criticalRoutes.forEach(routeFile => {
  const filePath = path.join(routesDir, routeFile);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${routeFile} - File not found`);
    allPassed = false;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const hasManager = content.includes('"manager"');
  
  if (hasManager) {
    console.log(`✅ ${routeFile} - Has manager role`);
  } else {
    console.log(`❌ ${routeFile} - Missing manager role`);
    allPassed = false;
  }
});

console.log('\n=== Summary ===');
if (allPassed) {
  console.log('✅ All critical routes have manager role configured');
  console.log('\nNext steps:');
  console.log('1. Restart backend: pm2 restart backend');
  console.log('2. Rebuild frontend: cd frontend && npm run build');
  console.log('3. Clear browser cache');
  console.log('4. Test manager access');
} else {
  console.log('❌ Some routes are missing manager role');
  console.log('Please review the files marked with ❌ above');
}

process.exit(allPassed ? 0 : 1);
