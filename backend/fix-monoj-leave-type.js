/**
 * Fix: Update Monoj Hati's leave on 08/04/2026 from 'medical' to 'vacation'
 * Run: node fix-monoj-leave-type.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const User = (await import('./src/models/userModel.js')).default;
  const LeaveRequest = (await import('./src/models/leaveRequestModel.js')).default;

  const employee = await User.findOne({ name: /monoj.*hati/i });
  if (!employee) { console.error('❌ Monoj Hati not found'); process.exit(1); }
  console.log(`✅ Found: ${employee.name}`);

  // Show all leaves for Monoj in April 2026
  const leaves = await LeaveRequest.find({
    employee: employee._id,
    startDate: { $gte: new Date('2026-04-01'), $lte: new Date('2026-04-30') },
  }).populate('approvedBy', 'name');

  console.log(`\n📋 Monoj's April 2026 leaves (${leaves.length} found):`);
  leaves.forEach(l => {
    console.log(`  - ${l._id} | ${l.leaveType} | ${l.startDate.toISOString().split('T')[0]} | ${l.status}`);
  });

  // Update any medical leave on 08/04/2026 to vacation
  const result = await LeaveRequest.updateMany(
    {
      employee: employee._id,
      leaveType: 'medical',
      startDate: { $gte: new Date('2026-04-08'), $lte: new Date('2026-04-08T23:59:59Z') },
    },
    { $set: { leaveType: 'vacation' } }
  );
  console.log(`\n✅ Updated ${result.modifiedCount} leave(s) from medical → vacation on 08/04/2026`);

  // Also update 23/04/2026 if it's medical
  const result2 = await LeaveRequest.updateMany(
    {
      employee: employee._id,
      leaveType: 'medical',
      startDate: { $gte: new Date('2026-04-23'), $lte: new Date('2026-04-23T23:59:59Z') },
    },
    { $set: { leaveType: 'vacation' } }
  );
  console.log(`✅ Updated ${result2.modifiedCount} leave(s) from medical → vacation on 23/04/2026`);

  // Show final state
  const LeaveModel = (await import('./src/models/leaveRequestModel.js')).default;
  const balance = await LeaveModel.getLeaveBalance(employee._id, 2026);
  console.log(`\n📊 Final leave balance for ${employee.name}:`);
  console.log(`   Earned   : ${balance.earned.earned} days`);
  console.log(`   Used     : ${balance.earned.used} days`);
  console.log(`   Remaining: ${balance.earned.remaining} days`);

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
