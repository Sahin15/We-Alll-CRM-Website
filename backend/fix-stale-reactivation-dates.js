/**
 * One-time fix: Clear stale reactivationDate from inactive employees
 * who were set inactive without a reactivation date but still have
 * an old date in the DB — causing the cron to auto-reactivate them.
 *
 * Run: node fix-stale-reactivation-dates.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const User = (await import('./src/models/userModel.js')).default;

  // Find inactive employees with a reactivationDate in the past (stale)
  const staleUsers = await User.find({
    status: 'inactive',
    reactivationDate: { $lte: new Date(), $ne: null },
  }).select('name email reactivationDate');

  if (staleUsers.length === 0) {
    console.log('✅ No stale reactivation dates found. All good!');
  } else {
    console.log(`\n⚠️  Found ${staleUsers.length} inactive employee(s) with stale reactivation dates:`);
    staleUsers.forEach(u => {
      console.log(`  - ${u.name} (${u.email}) — reactivationDate: ${u.reactivationDate}`);
    });

    const result = await User.updateMany(
      {
        status: 'inactive',
        reactivationDate: { $lte: new Date(), $ne: null },
      },
      { $set: { reactivationDate: null } }
    );
    console.log(`\n✅ Cleared stale reactivationDate from ${result.modifiedCount} employee(s)`);
  }

  await mongoose.disconnect();
  console.log('✅ Done!');
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
