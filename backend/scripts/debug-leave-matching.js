import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveRequest from '../src/models/leaveRequestModel.js';
import User from '../src/models/userModel.js';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const debugLeaveMatching = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get approved leaves WITHOUT population to see raw data
    const rawApprovedLeaves = await LeaveRequest.find({
      status: 'approved'
    });

    console.log(`\n📊 Raw approved leaves: ${rawApprovedLeaves.length}`);
    
    rawApprovedLeaves.forEach((leave, index) => {
      console.log(`\n${index + 1}. Leave ID: ${leave._id}`);
      console.log(`   Raw employee field:`, leave.employee);
      console.log(`   Employee type:`, typeof leave.employee);
      console.log(`   Type: ${leave.leaveType}`);
      console.log(`   Status: ${leave.status}`);
      console.log(`   Year: ${leave.leaveYear} (type: ${typeof leave.leaveYear})`);
      console.log(`   Start Date Year: ${new Date(leave.startDate).getFullYear()}`);
    });

    // Get approved leaves with employee details
    const approvedLeaves = await LeaveRequest.find({
      status: 'approved'
    }).populate('employee', 'name email');

    console.log(`\n📊 Found ${approvedLeaves.length} approved leaves (all years):`);
    
    approvedLeaves.forEach((leave, index) => {
      console.log(`\n${index + 1}. Leave ID: ${leave._id}`);
      console.log(`   Employee: ${leave.employee?.name} (${leave.employee?._id})`);
      console.log(`   Employee field in DB:`, leave.employee);
      console.log(`   Raw employee field:`, leave.toObject().employee);
      console.log(`   Type: ${leave.leaveType}`);
      console.log(`   Days: ${leave.numberOfDays}`);
      console.log(`   Status: ${leave.status}`);
      console.log(`   Year: ${leave.leaveYear}`);
      console.log(`   Start Date: ${leave.startDate}`);
    });

    // Now filter for 2026
    const approved2026 = approvedLeaves.filter(leave => leave.leaveYear === 2026);
    console.log(`\n📅 Approved leaves for 2026: ${approved2026.length}`);

    // Also check by start date year
    const approvedByStartDate = approvedLeaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === 2026
    );
    console.log(`📅 Approved leaves by start date 2026: ${approvedByStartDate.length}`);

    // Test the query used in getLeaveUsageSummary for one employee
    if (approved2026.length > 0) {
      const testEmployee = approved2026[0].employee;
      console.log(`\n🔍 Testing query for ${testEmployee.name} (${testEmployee._id}):`);
      
      const testQuery = {
        employee: testEmployee._id,
        status: 'approved',
        leaveYear: 2026
      };
      
      console.log(`   Query:`, testQuery);
      console.log(`   Employee ID type:`, typeof testEmployee._id);
      console.log(`   Employee ID value:`, testEmployee._id);
      
      // Try with string conversion
      const queryWithString = {
        employee: testEmployee._id.toString(),
        status: 'approved',
        leaveYear: 2026
      };
      
      const stringResult = await LeaveRequest.find(queryWithString);
      console.log(`   String query result: ${stringResult.length} leaves found`);
      
      // Try direct query with the exact ObjectId from the leave record
      const firstLeave = rawApprovedLeaves[0];
      console.log(`\n🎯 Direct query test with first leave's employee ID:`);
      console.log(`   Leave employee field:`, firstLeave.employee);
      
      const directQuery = await LeaveRequest.find({
        employee: firstLeave.employee,
        status: 'approved',
        leaveYear: 2026
      });
      
      console.log(`   Direct query result: ${directQuery.length} leaves found`);
      
      // Try without leaveYear filter
      const queryWithoutYear = await LeaveRequest.find({
        employee: firstLeave.employee,
        status: 'approved'
      });
      
      console.log(`   Query without year: ${queryWithoutYear.length} leaves found`);
      
      // Try with just employee
      const queryJustEmployee = await LeaveRequest.find({
        employee: firstLeave.employee
      });
      
      // Test different year queries
      console.log(`\n🔍 Testing different year queries:`);
      
      const testYears = [2026, "2026", parseInt("2026"), Number(2026)];
      
      for (const year of testYears) {
        const yearQuery = await LeaveRequest.find({
          employee: firstLeave.employee,
          status: 'approved',
          leaveYear: year
        });
        console.log(`   leaveYear: ${year} (${typeof year}) -> ${yearQuery.length} results`);
      }
      
      // Test with $eq operator
      const eqQuery = await LeaveRequest.find({
        employee: firstLeave.employee,
        status: 'approved',
        leaveYear: { $eq: 2026 }
      });
      console.log(`   leaveYear: { $eq: 2026 } -> ${eqQuery.length} results`);
      
      // Test all leaves for this employee
      const allEmployeeLeaves = await LeaveRequest.find({
        employee: firstLeave.employee
      });
      console.log(`\n📋 All leaves for this employee: ${allEmployeeLeaves.length}`);
      // Check the exact field names and values
      console.log(`\n🔍 Detailed field inspection:`);
      const detailedLeave = allEmployeeLeaves[0];
      console.log(`   Leave object keys:`, Object.keys(detailedLeave.toObject()));
      console.log(`   leaveYear field exists:`, 'leaveYear' in detailedLeave);
      console.log(`   leaveYear value:`, JSON.stringify(detailedLeave.leaveYear));
      console.log(`   leaveYear === 2026:`, detailedLeave.leaveYear === 2026);
      console.log(`   leaveYear == 2026:`, detailedLeave.leaveYear == 2026);
      
      // Try querying by _id to make sure the record exists
      const byIdQuery = await LeaveRequest.findById(detailedLeave._id);
      console.log(`   Query by ID found:`, !!byIdQuery);
      if (byIdQuery) {
        console.log(`   ID query leaveYear:`, byIdQuery.leaveYear);
        console.log(`   ID query status:`, byIdQuery.status);
      }
      
      const queryResult = await LeaveRequest.find(testQuery);
      console.log(`   Result: ${queryResult.length} leaves found`);
      
      queryResult.forEach((leave, index) => {
        console.log(`     ${index + 1}. ${leave.leaveType} - ${leave.numberOfDays} days`);
      });

      // Test the exact query from getLeaveUsageSummary
      const exactQuery = await LeaveRequest.find({
        employee: testEmployee._id,
        status: 'approved',
        leaveYear: 2026
      }).sort({ startDate: 1 });
      
      console.log(`\n📋 Exact getLeaveUsageSummary query result: ${exactQuery.length} leaves`);
      
      // Calculate what the usage should be
      let cumulativeUsed = 0;
      const leaveHistory = exactQuery
        .filter(leave => leave.leaveType !== 'unpaid')
        .map(leave => {
          cumulativeUsed += leave.numberOfDays;
          return {
            leaveId: leave._id,
            leaveType: leave.leaveType,
            numberOfDays: leave.numberOfDays,
            usageRatio: `${cumulativeUsed}/24`,
            cumulativeUsed: cumulativeUsed
          };
        });
      
      console.log(`   Expected usage history:`, leaveHistory);
      console.log(`   Expected total used: ${cumulativeUsed}`);
      console.log(`   Expected ratio: ${cumulativeUsed}/24`);
    }

    console.log('\n✅ Debug completed!');
    
  } catch (error) {
    console.error('❌ Error in debug:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

// Run the debug
debugLeaveMatching();