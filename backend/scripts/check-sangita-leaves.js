import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import('../src/models/userModel.js').then(async ({ default: User }) => {
  const LeaveRequest = (await import('../src/models/leaveRequestModel.js')).default;
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔍 CHECKING SANGITA DUTTA LEAVE BALANCE');
    console.log('='.repeat(80));
    
    // Find Sangita Dutta
    const employee = await User.findOne({
      $or: [
        { name: /sangita.*dutta/i },
        { email: /sangita/i }
      ]
    }).select('name email role joiningDate');
    
    if (!employee) {
      console.log('❌ Sangita Dutta not found in database');
      return;
    }
    
    console.log('👤 Employee Found:');
    console.log(`   Name: ${employee.name}`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   Role: ${employee.role}`);
    console.log(`   Joining Date: ${employee.joiningDate ? employee.joiningDate.toLocaleDateString('en-GB') : 'Not set'}`);
    console.log('');
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentDate = new Date().getDate();
    
    console.log('📅 Current Date Info:');
    console.log(`   Year: ${currentYear}`);
    console.log(`   Month: ${currentMonth} (${new Date().toLocaleDateString('en-GB', { month: 'long' })})`);
    console.log(`   Date: ${currentDate}`);
    console.log('');
    
    if (employee.joiningDate) {
      const joiningDate = new Date(employee.joiningDate);
      const joiningYear = joiningDate.getFullYear();
      const joiningMonth = joiningDate.getMonth() + 1;
      const joiningDay = joiningDate.getDate();
      
      console.log('📅 Joining Date Info:');
      console.log(`   Year: ${joiningYear}`);
      console.log(`   Month: ${joiningMonth} (${joiningDate.toLocaleDateString('en-GB', { month: 'long' })})`);
      console.log(`   Date: ${joiningDay}`);
      console.log('');
      
      // Manual calculation
      console.log('🧮 Manual Calculation:');
      if (joiningYear === currentYear && joiningMonth === currentMonth) {
        console.log(`   Joined this month (${joiningDate.toLocaleDateString('en-GB', { month: 'long' })} ${currentYear})`);
        console.log(`   Days worked this month: ${currentDate - joiningDay + 1} days`);
        console.log(`   Should earn leaves: 0 (joined mid-month, leaves earned at month end)`);
      } else if (joiningYear === currentYear) {
        const monthsWorked = currentMonth - joiningMonth + 1;
        console.log(`   Joined in month ${joiningMonth}, current month ${currentMonth}`);
        console.log(`   Months worked: ${monthsWorked}`);
        console.log(`   Should earn: ${monthsWorked * 2} leaves (${monthsWorked} months × 2)`);
      }
      console.log('');
    }
    
    // Get leave balance using the model method
    const balance = await LeaveRequest.getLeaveBalance(employee._id, currentYear);
    
    console.log('📊 Leave Balance (from database):');
    console.log(`   Total Annual: ${balance.earned.total} leaves`);
    console.log(`   Earned This Year: ${balance.earned.earned} leaves`);
    console.log(`   Used: ${balance.earned.used} leaves`);
    console.log(`   Remaining: ${balance.earned.remaining} leaves`);
    console.log(`   Monthly Rate: ${balance.earned.monthlyRate} leaves/month`);
    console.log('');
    
    console.log('📋 Leave Breakdown by Category:');
    console.log(`   Personal: ${balance.personal.used}/${balance.personal.total} used`);
    console.log(`   Medical: ${balance.medical.used}/${balance.medical.total} used`);
    console.log(`   Vacation: ${balance.vacation.used}/${balance.vacation.total} used`);
    console.log(`   Unpaid: ${balance.unpaid.used} used (no limit)`);
    console.log('');
    
    // Check if there's a mismatch
    if (employee.joiningDate) {
      const joiningDate = new Date(employee.joiningDate);
      const joiningYear = joiningDate.getFullYear();
      const joiningMonth = joiningDate.getMonth() + 1;
      
      let expectedEarned = 0;
      if (joiningYear === currentYear && joiningMonth === currentMonth) {
        // Joined this month - should have 0 earned leaves
        expectedEarned = 0;
      } else if (joiningYear === currentYear) {
        // Joined earlier this year
        const monthsWorked = currentMonth - joiningMonth + 1;
        expectedEarned = Math.min(monthsWorked * 2, 24);
      } else if (joiningYear < currentYear) {
        // Joined before this year
        expectedEarned = Math.min(currentMonth * 2, 24);
      }
      
      if (balance.earned.earned !== expectedEarned) {
        console.log('⚠️  MISMATCH DETECTED!');
        console.log(`   Expected: ${expectedEarned} leaves`);
        console.log(`   Actual: ${balance.earned.earned} leaves`);
        console.log(`   Difference: ${balance.earned.earned - expectedEarned} leaves`);
        console.log('');
        console.log('💡 Possible Causes:');
        console.log('   1. Production server not updated with latest code');
        console.log('   2. Joining date not set correctly in database');
        console.log('   3. Calculation logic needs adjustment for mid-month joiners');
      } else {
        console.log('✅ Leave balance is correct!');
      }
    }
    
    console.log('');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
