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
    
    console.log('🔍 CHECKING FOR DUPLICATE ATTENDANCE RECORDS');
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
      console.log('   All employees have unique attendance records per day.');
    } else {
      console.log(`⚠️  Found ${duplicates.length} date(s) with duplicate records:\n`);
      
      for (const dup of duplicates) {
        const user = await User.findById(dup._id.employee);
        const userName = user ? user.name : 'Unknown User';
        const userEmail = user ? user.email : 'N/A';
        
        console.log(`Employee: ${userName} (${userEmail})`);
        console.log(`Date: ${dup._id.date}`);
        console.log(`Duplicate Count: ${dup.count} records`);
        console.log('Records:');
        
        dup.records.forEach((record, index) => {
          const clockInIST = new Date(record.clockIn).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour12: false
          });
          console.log(`  ${index + 1}. ID: ${record.id} | Clock-in: ${clockInIST} | Status: ${record.status}`);
        });
        console.log('');
      }
      
      console.log('='.repeat(80));
      console.log('\n🔧 TO FIX ALL DUPLICATES:');
      console.log('   Run: node backend/scripts/fix-all-duplicates.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
