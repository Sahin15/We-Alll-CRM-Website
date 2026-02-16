import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Define User schema first
const User = mongoose.model('User', new mongoose.Schema({ 
  name: String, 
  email: String 
}));

// Import the actual Attendance model
import('../src/models/attendanceModel.js').then(async ({ default: Attendance }) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔧 FIXING INCORRECT ATTENDANCE STATUSES');
    console.log('='.repeat(80));
    
    // The 5 records that need fixing (from verification script)
    const recordsToFix = [
      '6992b1ef144b6d0afc7f1fd2', // Suman Das - 16/2/2026 - 11:28 IST - present → late
      '69900fc2144b6d0afc7eb5fb', // Rahul Shaw - 14/2/2026 - 11:31 IST - present → late
      '698abc8e144b6d0afc7d87cf', // Kaustav Mukherjee - 10/2/2026 - 10:35 IST - present → late
      '698207ddcd9c1b54302ce2b1', // Rakesh Das - 3/2/2026 - 20:06 IST - half-day → absent
      '697cc060cd9c1b54302c0940', // Nabanita Mondal - 30/1/2026 - 19:59 IST - half-day → absent
    ];
    
    let fixed = 0;
    let failed = 0;
    
    for (const recordId of recordsToFix) {
      try {
        const record = await Attendance.findById(recordId).populate('employee', 'name email');
        
        if (!record) {
          console.log(`❌ Record ${recordId} not found`);
          failed++;
          continue;
        }
        
        const oldStatus = record.status;
        const correctStatus = record.calculateStatus();
        
        const clockInIST = new Date(record.clockIn).toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const dateIST = new Date(record.date).toLocaleDateString('en-IN', { 
          timeZone: 'Asia/Kolkata'
        });
        
        console.log(`\n🔧 Fixing Record:`);
        console.log(`   Employee: ${record.employee?.name || 'Unknown'}`);
        console.log(`   Date: ${dateIST}`);
        console.log(`   Clock-in: ${clockInIST} IST`);
        console.log(`   Old Status: ${oldStatus}`);
        console.log(`   New Status: ${correctStatus}`);
        
        // Update the status
        record.status = correctStatus;
        
        // Save (this will trigger the pre-save hook which will recalculate)
        await record.save();
        
        console.log(`   ✅ Fixed successfully`);
        fixed++;
        
      } catch (error) {
        console.error(`❌ Error fixing record ${recordId}:`, error.message);
        failed++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 FIX SUMMARY:');
    console.log(`   Total Records: ${recordsToFix.length}`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    if (fixed === recordsToFix.length) {
      console.log('\n✅ ALL RECORDS FIXED SUCCESSFULLY!');
      console.log('   Run verify-all-historical-data.js again to confirm.');
    } else {
      console.log('\n⚠️  Some records could not be fixed. Check errors above.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
