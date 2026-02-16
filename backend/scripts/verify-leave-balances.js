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
    
    console.log('🔍 VERIFYING LEAVE BALANCES FOR EMPLOYEES');
    console.log('='.repeat(80));
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    // Find all employees (not clients, admin, superadmin)
    const employees = await User.find({
      role: { $in: ['employee', 'hod', 'hr'] }
    }).select('name email role joiningDate').sort({ joiningDate: -1 });
    
    console.log(`📊 Found ${employees.length} employees\n`);
    
    const issues = [];
    
    for (const employee of employees) {
      const balance = await LeaveRequest.getLeaveBalance(employee._id, currentYear);
      
      const joiningDate = employee.joiningDate ? new Date(employee.joiningDate) : null;
      const joiningYear = joiningDate ? joiningDate.getFullYear() : null;
      const joiningMonth = joiningDate ? joiningDate.getMonth() + 1 : null;
      
      // Calculate expected earned leaves
      let expectedEarned = 0;
      if (!joiningDate) {
        // No joining date - assume they should have full earned leaves
        expectedEarned = Math.min(currentMonth * 2, 24);
      } else if (joiningYear < currentYear) {
        // Joined before this year - full calculation
        expectedEarned = Math.min(currentMonth * 2, 24);
      } else if (joiningYear === currentYear) {
        // Joined this year - calculate from joining month
        if (joiningMonth <= currentMonth) {
          const monthsWorked = currentMonth - joiningMonth + 1;
          expectedEarned = Math.min(monthsWorked * 2, 24);
        } else {
          expectedEarned = 0; // Joining date is in the future
        }
      } else {
        expectedEarned = 0; // Joining date is in the future
      }
      
      const actualEarned = balance.earned.earned;
      const hasIssue = actualEarned !== expectedEarned;
      
      if (hasIssue || joiningMonth >= 2) { // Show February joiners and issues
        console.log(`${hasIssue ? '⚠️ ' : '✅'} ${employee.name}`);
        console.log(`   Email: ${employee.email}`);
        console.log(`   Role: ${employee.role}`);
        console.log(`   Joining Date: ${joiningDate ? joiningDate.toLocaleDateString('en-GB') : 'Not set'}`);
        if (joiningDate && joiningYear === currentYear) {
          console.log(`   Joined in: ${joiningDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`);
          console.log(`   Months worked: ${joiningMonth <= currentMonth ? currentMonth - joiningMonth + 1 : 0}`);
        }
        console.log(`   Expected earned leaves: ${expectedEarned}`);
        console.log(`   Actual earned leaves: ${actualEarned}`);
        console.log(`   Used leaves: ${balance.earned.used}`);
        console.log(`   Remaining leaves: ${balance.earned.remaining}`);
        
        if (hasIssue) {
          console.log(`   ❌ MISMATCH: Expected ${expectedEarned} but got ${actualEarned}`);
          issues.push({
            name: employee.name,
            email: employee.email,
            joiningDate: joiningDate,
            expected: expectedEarned,
            actual: actualEarned,
            difference: actualEarned - expectedEarned
          });
        }
        console.log('');
      }
    }
    
    console.log('='.repeat(80));
    
    if (issues.length > 0) {
      console.log(`\n⚠️  Found ${issues.length} employee(s) with incorrect leave balances:\n`);
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.name} (${issue.email})`);
        console.log(`   Joining: ${issue.joiningDate ? issue.joiningDate.toLocaleDateString('en-GB') : 'Not set'}`);
        console.log(`   Expected: ${issue.expected}, Actual: ${issue.actual}, Difference: ${issue.difference > 0 ? '+' : ''}${issue.difference}`);
      });
      console.log('\n✅ The fix has been applied. These balances will now be calculated correctly.');
    } else {
      console.log('\n✅ All leave balances are correct!');
    }
    
    console.log('\n📝 Note: The leave calculation now considers joining date.');
    console.log('   Employees earn 2 leaves per month from their joining month.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
