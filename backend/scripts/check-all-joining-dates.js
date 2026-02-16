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
    
    console.log('🔍 CHECKING ALL EMPLOYEES JOINING DATES');
    console.log('='.repeat(80));
    
    // Find all employees
    const employees = await User.find({
      role: { $in: ['employee', 'hod', 'hr'] }
    }).select('name email role joiningDate createdAt').sort({ createdAt: -1 });
    
    console.log(`📊 Found ${employees.length} employees\n`);
    
    const missingJoiningDate = [];
    const recentJoiners = [];
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    for (const employee of employees) {
      const hasJoiningDate = employee.joiningDate != null;
      const createdDate = new Date(employee.createdAt);
      const createdYear = createdDate.getFullYear();
      const createdMonth = createdDate.getMonth() + 1;
      
      if (!hasJoiningDate) {
        missingJoiningDate.push({
          name: employee.name,
          email: employee.email,
          role: employee.role,
          createdAt: createdDate
        });
        
        console.log(`⚠️  ${employee.name}`);
        console.log(`   Email: ${employee.email}`);
        console.log(`   Role: ${employee.role}`);
        console.log(`   Joining Date: NOT SET`);
        console.log(`   Account Created: ${createdDate.toLocaleDateString('en-GB')}`);
        console.log(`   Suggestion: Set joining date to ${createdDate.toLocaleDateString('en-GB')}`);
        console.log('');
      } else {
        const joiningDate = new Date(employee.joiningDate);
        const joiningYear = joiningDate.getFullYear();
        const joiningMonth = joiningDate.getMonth() + 1;
        
        // Check if joined in current year
        if (joiningYear === currentYear) {
          recentJoiners.push({
            name: employee.name,
            email: employee.email,
            joiningDate: joiningDate,
            joiningMonth: joiningMonth
          });
          
          // Calculate expected leaves
          const monthsWorked = currentMonth - joiningMonth + 1;
          const expectedLeaves = Math.min(monthsWorked * 2, 24);
          
          console.log(`✅ ${employee.name}`);
          console.log(`   Email: ${employee.email}`);
          console.log(`   Role: ${employee.role}`);
          console.log(`   Joining Date: ${joiningDate.toLocaleDateString('en-GB')}`);
          console.log(`   Joined in: ${joiningDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`);
          console.log(`   Months worked: ${monthsWorked}`);
          console.log(`   Expected earned leaves: ${expectedLeaves}`);
          console.log('');
        }
      }
    }
    
    console.log('='.repeat(80));
    console.log('\n📋 SUMMARY:\n');
    
    if (missingJoiningDate.length > 0) {
      console.log(`⚠️  ${missingJoiningDate.length} employee(s) missing joining date:\n`);
      missingJoiningDate.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name} (${emp.email})`);
        console.log(`   Created: ${emp.createdAt.toLocaleDateString('en-GB')}`);
      });
      console.log('\n💡 Action Required:');
      console.log('   Update joining dates in the database for accurate leave calculations');
      console.log('   You can use the User Management panel or run update scripts');
    } else {
      console.log('✅ All employees have joining dates set!');
    }
    
    if (recentJoiners.length > 0) {
      console.log(`\n📅 ${recentJoiners.length} employee(s) joined in ${currentYear}:\n`);
      recentJoiners.forEach((emp, index) => {
        const monthsWorked = currentMonth - emp.joiningMonth + 1;
        const expectedLeaves = Math.min(monthsWorked * 2, 24);
        console.log(`${index + 1}. ${emp.name}`);
        console.log(`   Joined: ${emp.joiningDate.toLocaleDateString('en-GB')}`);
        console.log(`   Expected leaves: ${expectedLeaves}`);
      });
    }
    
    console.log('\n📝 Note:');
    console.log('   - Employees earn 2 leaves per month starting from their joining month');
    console.log('   - If they join mid-month, they still get the full month\'s leaves');
    console.log('   - Maximum 24 leaves per year');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
