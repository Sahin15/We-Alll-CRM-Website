import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveRequest from '../src/models/leaveRequestModel.js';
import User from '../src/models/userModel.js';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const checkLeaveYears = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check all leave requests
    const allLeaves = await LeaveRequest.find({}).populate('employee', 'name email');
    console.log(`\n📊 Total leave requests: ${allLeaves.length}`);

    // Check leaveYear field
    const leavesWithoutYear = allLeaves.filter(leave => !leave.leaveYear);
    const leavesWithYear = allLeaves.filter(leave => leave.leaveYear);

    console.log(`\n📅 Leave Year Analysis:`);
    console.log(`   ✅ With leaveYear: ${leavesWithYear.length}`);
    console.log(`   ❌ Without leaveYear: ${leavesWithoutYear.length}`);

    if (leavesWithoutYear.length > 0) {
      console.log(`\n🔍 Leaves without leaveYear:`);
      leavesWithoutYear.forEach((leave, index) => {
        const startYear = new Date(leave.startDate).getFullYear();
        console.log(`   ${index + 1}. ${leave.employee?.name || 'Unknown'} - ${leave.leaveType} - ${leave.startDate} (should be ${startYear})`);
      });
    }

    // Check current year leaves
    const currentYear = new Date().getFullYear();
    const currentYearLeaves = allLeaves.filter(leave => 
      leave.leaveYear === currentYear || 
      new Date(leave.startDate).getFullYear() === currentYear
    );

    console.log(`\n📊 ${currentYear} Leave Analysis:`);
    console.log(`   Total ${currentYear} leaves: ${currentYearLeaves.length}`);
    
    const approvedCurrentYear = currentYearLeaves.filter(leave => leave.status === 'approved');
    console.log(`   Approved ${currentYear} leaves: ${approvedCurrentYear.length}`);

    if (approvedCurrentYear.length > 0) {
      console.log(`\n✅ Approved ${currentYear} leaves by employee:`);
      const employeeLeaves = {};
      
      approvedCurrentYear.forEach(leave => {
        const employeeName = leave.employee?.name || 'Unknown';
        if (!employeeLeaves[employeeName]) {
          employeeLeaves[employeeName] = { count: 0, days: 0, leaves: [] };
        }
        employeeLeaves[employeeName].count++;
        employeeLeaves[employeeName].days += leave.numberOfDays;
        employeeLeaves[employeeName].leaves.push({
          type: leave.leaveType,
          days: leave.numberOfDays,
          date: leave.startDate,
          year: leave.leaveYear
        });
      });

      Object.entries(employeeLeaves).forEach(([name, data]) => {
        console.log(`   ${name}: ${data.count} requests, ${data.days} days total`);
        data.leaves.forEach(leave => {
          console.log(`     - ${leave.type}: ${leave.days} days (${leave.date}) [Year: ${leave.year || 'MISSING'}]`);
        });
      });
    }

    console.log('\n✅ Leave year check completed!');
    
  } catch (error) {
    console.error('❌ Error checking leave years:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

// Run the check
checkLeaveYears();