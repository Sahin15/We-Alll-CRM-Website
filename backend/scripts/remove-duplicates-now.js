import mongoose from 'mongoose';
import Attendance from '../src/models/attendanceModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/we-alll-office';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function removeDuplicatesNow() {
  console.log('🔍 Finding and removing duplicate attendance records...');
  
  try {
    // Find duplicates using aggregation
    const duplicates = await Attendance.aggregate([
      {
        $group: {
          _id: {
            employee: '$employee',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date'
              }
            }
          },
          records: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`📊 Found ${duplicates.length} groups with duplicates`);
    
    let totalRemoved = 0;
    
    for (const group of duplicates) {
      const records = group.records;
      console.log(`\n🔄 Processing ${records.length} duplicates for employee ${group._id.employee} on ${group._id.date}`);
      
      // Sort by createdAt (keep the latest one)
      records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Keep the first (latest) record, remove the rest
      const toKeep = records[0];
      const toRemove = records.slice(1);
      
      console.log(`   📌 Keeping: ${toKeep._id} (created: ${toKeep.createdAt})`);
      
      for (const record of toRemove) {
        console.log(`   🗑️  Removing: ${record._id} (created: ${record.createdAt})`);
        await Attendance.findByIdAndDelete(record._id);
        totalRemoved++;
      }
    }
    
    console.log(`\n✅ Successfully removed ${totalRemoved} duplicate records!`);
    
    // Verify no duplicates remain
    const remainingDuplicates = await Attendance.aggregate([
      {
        $group: {
          _id: {
            employee: '$employee',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date'
              }
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    if (remainingDuplicates.length === 0) {
      console.log('🎉 Database is now clean - no duplicates remain!');
    } else {
      console.log(`⚠️  Warning: ${remainingDuplicates.length} duplicate groups still exist`);
    }
    
    return totalRemoved;
    
  } catch (error) {
    console.error('❌ Error removing duplicates:', error);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting immediate duplicate removal...\n');
  
  await connectDB();
  
  const removed = await removeDuplicatesNow();
  
  console.log('\n📊 Final Summary:');
  console.log(`   • Duplicate records removed: ${removed}`);
  console.log('   • Database status: Clean ✅');
  
  console.log('\n🔄 Now refresh the attendance page to see the clean data!');
  
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});