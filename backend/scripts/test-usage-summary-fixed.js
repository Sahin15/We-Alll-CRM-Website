import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveRequest from '../src/models/leaveRequestModel.js';
import User from '../src/models/userModel.js';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const testUsageSummary = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get an employee who has approved leaves
    const approvedLeave = await LeaveRequest.findOne({ status: 'approved' }).populate('employee');
    const employeeId = approvedLeave.employee._id.toString();
    
    console.log(`\n🧪 Testing getLeaveUsageSummary for: ${approvedLeave.employee.name}`);
    console.log(`   Employee ID: ${employeeId}`);

    // Test the exact logic from getLeaveUsageSummary controller
    const year = 2026;
    
    // Get all approved leaves for the employee
    const approvedLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: 'approved',
      leaveYear: year
    }).sort({ startDate: 1 });

    console.log(`\n📊 Found ${approvedLeaves.length} approved leaves for ${year}`);
    
    approvedLeaves.forEach((leave, index) => {
      console.log(`${index + 1}. ${leave.leaveType} - ${leave.numberOfDays} days (${leave.startDate.toDateString()})`);
    });

    // Calculate cumulative usage
    let cumulativeUsed = 0;
    const leaveHistory = approvedLeaves
      .filter(leave => leave.leaveType !== 'unpaid') // Exclude unpaid leaves
      .map(leave => {
        cumulativeUsed += leave.numberOfDays;
        return {
          leaveId: leave._id,
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate,
          numberOfDays: leave.numberOfDays,
          usageRatio: `${cumulativeUsed}/24`,
          cumulativeUsed: cumulativeUsed
        };
      });

    console.log(`\n📈 Leave usage history:`);
    leaveHistory.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.leaveType} - ${entry.numberOfDays} days -> Usage: ${entry.usageRatio}`);
    });

    // Get current balance using the model method
    const balance = await LeaveRequest.getLeaveBalance(employeeId, year);
    
    console.log(`\n💰 Leave balance:`);
    console.log(`   Earned: ${balance.earned.earned}/24`);
    console.log(`   Used: ${balance.earned.used}/24`);
    console.log(`   Remaining: ${balance.earned.remaining}/24`);
    console.log(`   Current ratio: ${balance.earned.used}/24`);

    // Test with multiple employees
    console.log(`\n🧪 Testing with all employees who have approved leaves:`);
    
    const allApprovedLeaves = await LeaveRequest.find({ status: 'approved' }).populate('employee');
    const uniqueEmployees = [...new Set(allApprovedLeaves.map(l => l.employee._id.toString()))];
    
    for (const empId of uniqueEmployees) {
      const emp = allApprovedLeaves.find(l => l.employee._id.toString() === empId).employee;
      const empBalance = await LeaveRequest.getLeaveBalance(empId, year);
      
      console.log(`\n   ${emp.name}:`);
      console.log(`     Usage: ${empBalance.earned.used}/24`);
      console.log(`     Remaining: ${empBalance.earned.remaining}/24`);
    }

    console.log('\n✅ Usage summary test completed!');
    
  } catch (error) {
    console.error('❌ Error testing usage summary:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

// Run the test
testUsageSummary();