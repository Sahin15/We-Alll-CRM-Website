/**
 * Complete Debug - Shows database, calculation, and what should happen
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';

async function debugCompleteFlow() {
  try {
    console.log('🔍 COMPLETE DEBUG - Finding the exact issue\n');
    console.log('═'.repeat(80));

    await mongoose.connect(MONGODB_URI);
    console.log('\n✅ Connected to MongoDB\n');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`📅 Today: ${today.toDateString()}\n`);

    // Find Rahul Shaw
    console.log('👤 Step 1: Finding Rahul Shaw...\n');
    
    const rahul = await mongoose.connection.db
      .collection('users')
      .findOne({ 
        $or: [
          { name: /rahul.*shaw/i },
          { email: /rahul.*shaw/i }
        ]
      });

    if (!rahul) {
      console.log('❌ Rahul Shaw NOT FOUND in database\n');
      
      // Show all users with Rahul
      const allRahuls = await mongoose.connection.db
        .collection('users')
        .find({ name: /rahul/i })
        .toArray();
      
      if (allRahuls.length > 0) {
        console.log('Found these users with "Rahul":');
        allRahuls.forEach(u => console.log(`  - ${u.name} (${u.email})`));
      }
      return;
    }

    console.log(`✅ Found: ${rahul.name} (${rahul.email})`);
    console.log(`   ID: ${rahul._id}\n`);

    // Find attendance record
    console.log('📋 Step 2: Finding attendance record...\n');
    
    const attendance = await mongoose.connection.db
      .collection('attendances')
      .findOne({
        employee: rahul._id,
        date: { $gte: today, $lt: tomorrow }
      });

    if (!attendance) {
      console.log('❌ NO ATTENDANCE RECORD for today\n');
      
      // Show recent records
      const recent = await mongoose.connection.db
        .collection('attendances')
        .find({ employee: rahul._id })
        .sort({ date: -1 })
        .limit(5)
        .toArray();
      
      if (recent.length > 0) {
        console.log('Recent attendance records:');
        recent.forEach(a => {
          console.log(`  ${a.date.toDateString()}: ${a.status}`);
        });
      }
      return;
    }

    console.log('✅ Found attendance record\n');
    console.log('─'.repeat(80));
    console.log('\n📊 CURRENT DATABASE VALUES:\n');
    console.log(`   Record ID: ${attendance._id}`);
    console.log(`   Date: ${attendance.date.toDateString()}`);
    console.log(`   Clock In (UTC): ${attendance.clockIn.toISOString()}`);
    console.log(`   Status in DB: "${attendance.status}"`);
    console.log(`   Manually Modified: ${attendance.isManuallyModified || false}`);
    
    if (attendance.clockOut) {
      console.log(`   Clock Out (UTC): ${attendance.clockOut.toISOString()}`);
    }

    // Calculate IST time
    console.log('\n─'.repeat(80));
    console.log('\n🔢 CALCULATION:\n');
    
    const clockInTime = new Date(attendance.clockIn);
    
    // Method 1: Using en-IN locale
    const istString1 = clockInTime.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    console.log(`   Method 1 (en-IN): ${istString1}`);
    
    // Method 2: Using en-US locale
    const istString2 = clockInTime.toLocaleString('en-US', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    console.log(`   Method 2 (en-US): ${istString2}`);
    
    // Parse and calculate
    const [hour, minute] = istString1.split(':').map(Number);
    const totalMinutes = hour * 60 + minute;
    
    console.log(`\n   Parsed Hour: ${hour}`);
    console.log(`   Parsed Minute: ${minute}`);
    console.log(`   Total Minutes: ${totalMinutes}`);
    
    // Determine status
    let shouldBe;
    if (totalMinutes >= 720) {
      shouldBe = 'half-day';
      console.log(`\n   Rule: ${totalMinutes} >= 720 → HALF-DAY`);
    } else if (totalMinutes > 630) {
      shouldBe = 'late';
      console.log(`\n   Rule: ${totalMinutes} > 630 → LATE`);
    } else {
      shouldBe = 'present';
      console.log(`\n   Rule: ${totalMinutes} <= 630 → PRESENT`);
    }

    console.log('\n─'.repeat(80));
    console.log('\n📊 COMPARISON:\n');
    console.log(`   Clock In Time (IST): ${hour}:${String(minute).padStart(2, '0')}`);
    console.log(`   Current Status: "${attendance.status}"`);
    console.log(`   Should Be: "${shouldBe}"`);
    console.log(`   Match: ${attendance.status === shouldBe ? '✅ CORRECT' : '❌ WRONG'}`);

    if (attendance.status !== shouldBe) {
      console.log('\n─'.repeat(80));
      console.log('\n🔧 FIX REQUIRED:\n');
      console.log(`   Need to change: "${attendance.status}" → "${shouldBe}"`);
      console.log('\n   MongoDB Command:');
      console.log(`   db.attendances.updateOne(`);
      console.log(`     { _id: ObjectId("${attendance._id}") },`);
      console.log(`     { $set: { status: "${shouldBe}" } }`);
      console.log(`   )\n`);
      
      // Actually fix it
      console.log('   Applying fix now...\n');
      
      const result = await mongoose.connection.db
        .collection('attendances')
        .updateOne(
          { _id: attendance._id },
          { 
            $set: { 
              status: shouldBe,
              isManuallyModified: true
            }
          }
        );
      
      if (result.modifiedCount > 0) {
        console.log('   ✅ DATABASE UPDATED SUCCESSFULLY!\n');
        
        // Verify the update
        const updated = await mongoose.connection.db
          .collection('attendances')
          .findOne({ _id: attendance._id });
        
        console.log('   Verification:');
        console.log(`   New status in DB: "${updated.status}"`);
        console.log(`   Expected: "${shouldBe}"`);
        console.log(`   Match: ${updated.status === shouldBe ? '✅ YES' : '❌ NO'}\n`);
      } else {
        console.log('   ❌ UPDATE FAILED - No records modified\n');
      }
    } else {
      console.log('\n✅ Status is already correct - no fix needed\n');
    }

    console.log('═'.repeat(80));
    console.log('\n📝 SUMMARY:\n');
    console.log(`   Employee: ${rahul.name}`);
    console.log(`   Clock In: ${hour}:${String(minute).padStart(2, '0')} IST`);
    console.log(`   Status: ${shouldBe}`);
    console.log(`   Database: ${attendance.status === shouldBe ? '✅ Correct' : '❌ Was wrong, now fixed'}`);
    console.log('\n🎉 DONE!\n');
    console.log('Next steps:');
    console.log('  1. Refresh the browser (Ctrl+F5)');
    console.log('  2. Clear browser cache if needed');
    console.log('  3. Check the attendance page\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

debugCompleteFlow();
