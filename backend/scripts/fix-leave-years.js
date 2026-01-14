import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveRequest from '../src/models/leaveRequestModel.js';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const fixLeaveYears = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all leaves without leaveYear field
    const leavesWithoutYear = await LeaveRequest.find({
      leaveYear: { $exists: false }
    }).lean();
    
    console.log(`\n📊 Found ${leavesWithoutYear.length} leaves without leaveYear field`);

    // Also check for leaves with null/undefined leaveYear
    const leavesWithNullYear = await LeaveRequest.find({
      $or: [
        { leaveYear: null },
        { leaveYear: undefined }
      ]
    }).lean();
    
    console.log(`📊 Found ${leavesWithNullYear.length} leaves with null/undefined leaveYear`);

    // Get all leaves to inspect
    const allLeaves = await LeaveRequest.find({}).lean();
    console.log(`\n📋 All leaves in database: ${allLeaves.length}`);
    
    allLeaves.forEach((leave, index) => {
      const startYear = new Date(leave.startDate).getFullYear();
      console.log(`${index + 1}. ID: ${leave._id}`);
      console.log(`   Start Date: ${leave.startDate}`);
      console.log(`   Start Year: ${startYear}`);
      console.log(`   LeaveYear field: ${leave.leaveYear} (${typeof leave.leaveYear})`);
      console.log(`   Has leaveYear field: ${'leaveYear' in leave}`);
      console.log(`   Status: ${leave.status}`);
      console.log('');
    });

    // Fix all leaves by setting leaveYear based on startDate
    console.log(`\n🔧 Fixing leaveYear for all leaves...`);
    
    let fixedCount = 0;
    
    for (const leave of allLeaves) {
      const startYear = new Date(leave.startDate).getFullYear();
      
      // Update the leave with the correct year
      const result = await LeaveRequest.updateOne(
        { _id: leave._id },
        { 
          $set: { 
            leaveYear: startYear 
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        fixedCount++;
        console.log(`✅ Fixed leave ${leave._id}: set leaveYear to ${startYear}`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total leaves processed: ${allLeaves.length}`);
    console.log(`   Leaves fixed: ${fixedCount}`);

    // Verify the fix
    console.log(`\n🔍 Verifying fix...`);
    const verifyLeaves = await LeaveRequest.find({}).lean();
    
    verifyLeaves.forEach((leave, index) => {
      console.log(`${index + 1}. ID: ${leave._id}`);
      console.log(`   LeaveYear: ${leave.leaveYear} (${typeof leave.leaveYear})`);
      console.log(`   Status: ${leave.status}`);
    });

    // Test the query that was failing
    console.log(`\n🧪 Testing the previously failing query...`);
    const testEmployee = verifyLeaves[0].employee;
    const testQuery = await LeaveRequest.find({
      employee: testEmployee,
      status: 'approved',
      leaveYear: 2026
    });
    
    console.log(`   Query result: ${testQuery.length} leaves found`);
    
    if (testQuery.length > 0) {
      console.log(`✅ Query is now working!`);
      testQuery.forEach((leave, index) => {
        console.log(`     ${index + 1}. ${leave.leaveType} - ${leave.numberOfDays} days`);
      });
    }

    console.log('\n✅ Leave year fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing leave years:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

// Run the fix
fixLeaveYears();