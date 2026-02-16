import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Define User schema
const User = mongoose.model('User', new mongoose.Schema({ 
  name: String, 
  email: String 
}));

// Import the actual Attendance model
import('../src/models/attendanceModel.js').then(async ({ default: Attendance }) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔧 FIXING ALL DUPLICATE ATTENDANCE RECORDS');
    console.log('='.repeat(80));
    
    // Aggregate to find duplicates
    const duplicates = await Attendance.aggregate([
      {
        $group: {
          _id: {
            employee: '$employee',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date',
                timezone: 'Asia/Kolkata'
              }
            }
          },
          count: { $sum: 1 },
          records: { $push: { id: '$_id', clockIn: '$clockIn', status: '$status' } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { '_id.date': -1 }
      }
    ]);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate attendance records found!');
      console.log('   Nothing to fix.');
    } else {
      console.log(`⚠️  Found ${duplicates.length} date(s) with duplicate records\n`);
      
      let totalFixed = 0;
      let totalDeleted = 0;
      
      for (const dup of duplicates) {
        const user = await User.findById(dup._id.employee);
        const userName = user ? user.name : 'Unknown User';
        const userEmail = user ? user.email : 'N/A';
        
        console.log(`\n📝 Processing: ${userName} (${userEmail})`);
        console.log(`   Date: ${dup._id.date}`);
        console.log(`   Found ${dup.count} records`);
        
        // Sort records by clockIn time (earliest first)
        const sortedRecords = dup.records.sort((a, b) => 
          new Date(a.clockIn) - new Date(b.clockIn)
        );
        
        // Keep the first (earliest) record
        const keepRecord = sortedRecords[0];
        const deleteRecords = sortedRecords.slice(1);
        
        const keepClockIn = new Date(keepRecord.clockIn).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false
        });
        
        console.log(`   ✅ Keeping: ${keepRecord.id} (Clock-in: ${keepClockIn})`);
        
        // Delete duplicates
        for (const record of deleteRecords) {
          const deleteClockIn = new Date(record.clockIn).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour12: false
          });
          
          await Attendance.findByIdAndDelete(record.id);
          console.log(`   🗑️  Deleted: ${record.id} (Clock-in: ${deleteClockIn})`);
          totalDeleted++;
        }
        
        totalFixed++;
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('\n✅ FIX COMPLETE!');
      console.log(`   Fixed ${totalFixed} employee-date combination(s)`);
      console.log(`   Deleted ${totalDeleted} duplicate record(s)`);
      console.log('\n   All employees now have unique attendance records per day.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
