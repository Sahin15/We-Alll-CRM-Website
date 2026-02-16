import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Import models
import('../src/models/userModel.js').then(async ({ default: User }) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔧 SET JOINING DATES FOR ALL EMPLOYEES');
    console.log('='.repeat(80));
    console.log('This script will set joining dates for employees who don\'t have one.');
    console.log('It will use the account creation date as the joining date.\n');
    
    // Find all employees without joining date
    const employees = await User.find({
      role: { $in: ['employee', 'hod', 'hr'] },
      joiningDate: { $exists: false }
    }).select('name email role createdAt').sort({ createdAt: -1 });
    
    if (employees.length === 0) {
      console.log('✅ All employees already have joining dates set!');
      rl.close();
      await mongoose.connection.close();
      process.exit(0);
      return;
    }
    
    console.log(`📊 Found ${employees.length} employee(s) without joining date:\n`);
    
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.name} (${emp.email})`);
      console.log(`   Created: ${new Date(emp.createdAt).toLocaleDateString('en-GB')}`);
    });
    
    console.log('\n' + '='.repeat(80));
    const answer = await question('\n⚠️  Do you want to set joining dates for these employees? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('\n❌ Operation cancelled');
      rl.close();
      await mongoose.connection.close();
      process.exit(0);
      return;
    }
    
    console.log('\n🔄 Setting joining dates...\n');
    
    let updatedCount = 0;
    
    for (const employee of employees) {
      // Set joining date to account creation date
      employee.joiningDate = employee.createdAt;
      await employee.save();
      
      console.log(`✅ ${employee.name}`);
      console.log(`   Joining Date set to: ${new Date(employee.joiningDate).toLocaleDateString('en-GB')}`);
      
      updatedCount++;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Successfully updated ${updatedCount} employee(s)!`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Deploy the updated leave calculation code to production');
    console.log('   2. Restart the backend server');
    console.log('   3. Verify leave balances using: node backend/scripts/verify-leave-balances.js');
    
    rl.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
