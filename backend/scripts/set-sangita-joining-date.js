import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import('../src/models/userModel.js').then(async ({ default: User }) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔧 SETTING SANGITA DUTTA JOINING DATE');
    console.log('='.repeat(80));
    
    // Find Sangita Dutta
    const employee = await User.findOne({
      $or: [
        { name: /sangita.*dutta/i },
        { email: /sangitadutta/i }
      ]
    });
    
    if (!employee) {
      console.log('❌ Sangita Dutta not found in database');
      return;
    }
    
    console.log('👤 Employee Found:');
    console.log(`   Name: ${employee.name}`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   Current Joining Date: ${employee.joiningDate ? employee.joiningDate.toLocaleDateString('en-GB') : 'Not set'}`);
    console.log('');
    
    // Set joining date to February 16, 2026
    const joiningDate = new Date('2026-02-16');
    employee.joiningDate = joiningDate;
    
    await employee.save();
    
    console.log('✅ Joining date updated successfully!');
    console.log(`   New Joining Date: ${employee.joiningDate.toLocaleDateString('en-GB')}`);
    console.log('');
    
    // Verify the update
    const updated = await User.findById(employee._id);
    console.log('🔍 Verification:');
    console.log(`   Name: ${updated.name}`);
    console.log(`   Joining Date: ${updated.joiningDate.toLocaleDateString('en-GB')}`);
    console.log('');
    
    console.log('📝 Note: After this update, Sangita Dutta should show:');
    console.log('   - 0 earned leaves (joined mid-month, February not complete yet)');
    console.log('   - OR 2 earned leaves if we count the joining month');
    console.log('');
    console.log('💡 Run check-sangita-leaves.js to verify the leave balance');
    
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
