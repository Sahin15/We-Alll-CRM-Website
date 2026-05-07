/**
 * Quick test: verify employee status actually saves to MongoDB
 * Run: node test-status-save.js <employeeId> <newStatus>
 * Example: node test-status-save.js 6650abc123def456 inactive
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/userModel.js';

dotenv.config();

const [,, employeeId, newStatus] = process.argv;

if (!employeeId || !newStatus) {
  console.error('Usage: node test-status-save.js <employeeId> <newStatus>');
  console.error('Valid statuses: active, inactive, terminated, offboarded');
  process.exit(1);
}

const validStatuses = ['active', 'inactive', 'terminated', 'offboarded'];
if (!validStatuses.includes(newStatus)) {
  console.error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Read current state
    const before = await User.findById(employeeId).select('name status statusChangedAt');
    if (!before) {
      console.error(`❌ User ${employeeId} not found`);
      process.exit(1);
    }
    console.log(`\nBEFORE: ${before.name} → status: "${before.status}"`);

    // Apply the change
    before.status = newStatus;
    before.statusChangedAt = new Date();
    await before.save();
    console.log(`\nSAVED: status set to "${newStatus}"`);

    // Re-read from DB to confirm
    const after = await User.findById(employeeId).select('name status statusChangedAt');
    console.log(`\nAFTER (re-read from DB): ${after.name} → status: "${after.status}"`);

    if (after.status === newStatus) {
      console.log('\n✅ SUCCESS: Status saved and persisted correctly');
    } else {
      console.log(`\n❌ FAILURE: Expected "${newStatus}" but DB has "${after.status}"`);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run();
