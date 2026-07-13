/**
 * One-time / manual HoD reconciliation script.
 *
 * Usage:
 *   node scripts/sync-hod-assignments.js
 *   node scripts/sync-hod-assignments.js --dry-run
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncHoDAssignments } from '../src/services/hodSyncService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dryRun = process.argv.includes('--dry-run');

try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(dryRun ? '[dry-run] HoD sync plan:' : 'Running HoD sync...');

  const result = await syncHoDAssignments({ dryRun });

  console.log(`Users to update: ${result.userUpdates.length}`);
  console.log(`Departments to update: ${result.departmentUpdates.length}`);
  console.log(`Issues: ${result.issues.length}`);

  if (result.userUpdates.length) {
    console.log('\nUser updates:');
    for (const row of result.userUpdates) {
      console.log(' ', JSON.stringify(row));
    }
  }

  if (result.departmentUpdates.length) {
    console.log('\nDepartment updates:');
    for (const row of result.departmentUpdates) {
      console.log(' ', JSON.stringify(row));
    }
  }

  if (result.issues.length) {
    console.log('\nIssues:');
    for (const row of result.issues) {
      console.log(' ', row.code, '-', row.message, row.context || '');
    }
  }

  if (!dryRun) {
    console.log(`\nApplied: ${result.usersUpdated} users, ${result.departmentsUpdated} departments`);
  }

  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error('HoD sync failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
