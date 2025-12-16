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

async function removeDuplicates() {
  console.log('🔍 Checking for duplicate attendance records...');
  
  try {
    // Find all attendance records grouped by employee and date
    const pipeline = [
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
    ];

    const duplicateGroups = await Attendance.aggregate(pipeline);
    
    console.log(`📊 Found ${duplicateGroups.length} groups with duplicates`);
    
    let totalDuplicatesRemoved = 0;
    
    for (const group of duplicateGroups) {
      const records = group.records;
      console.log(`\n🔄 Processing ${records.length} duplicates for employee ${group._id.employee} on ${group._id.date}`);
      
      // Sort by createdAt (keep the latest one)
      records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Keep the first (latest) record, remove the rest
      const recordsToKeep = records[0];
      const recordsToRemove = records.slice(1);
      
      console.log(`   📌 Keeping record: ${recordsToKeep._id} (created: ${recordsToKeep.createdAt})`);
      
      for (const record of recordsToRemove) {
        console.log(`   🗑️  Removing record: ${record._id} (created: ${record.createdAt})`);
        await Attendance.findByIdAndDelete(record._id);
        totalDuplicatesRemoved++;
      }
    }
    
    console.log(`\n✅ Successfully removed ${totalDuplicatesRemoved} duplicate records`);
    return totalDuplicatesRemoved;
    
  } catch (error) {
    console.error('❌ Error removing duplicates:', error);
    return 0;
  }
}

async function verifyNoDuplicates() {
  console.log('\n🔍 Verifying no duplicates remain...');
  
  try {
    const pipeline = [
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
    ];

    const remainingDuplicates = await Attendance.aggregate(pipeline);
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ No duplicates found - database is clean!');
      return true;
    } else {
      console.log(`❌ Still found ${remainingDuplicates.length} duplicate groups`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verifying duplicates:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting duplicate removal...\n');
  
  await connectDB();
  
  const duplicatesRemoved = await removeDuplicates();
  const isClean = await verifyNoDuplicates();
  
  console.log('\n📊 Final Summary:');
  console.log(`   • Total duplicates removed: ${duplicatesRemoved}`);
  console.log(`   • Database clean: ${isClean ? '✅ Yes' : '❌ No'}`);
  
  if (isClean) {
    console.log('\n🎉 Duplicate removal completed successfully!');
  } else {
    console.log('\n⚠️  Some duplicates may still exist. Please run the script again.');
  }
  
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});