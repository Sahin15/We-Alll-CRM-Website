import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

dotenv.config({ path: './backend/.env' });

const fixHoDData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all departments with heads
    const deptsWithHeads = await Department.find({ 
      head: { $exists: true, $ne: null },
      status: 'active'
    });
    
    console.log(`\n📊 Found ${deptsWithHeads.length} departments with heads\n`);

    for (const dept of deptsWithHeads) {
      console.log(`🏢 Processing: ${dept.name}`);
      console.log(`   Department ID: ${dept._id}`);
      console.log(`   Head ID: ${dept.head}`);
      
      const user = await User.findById(dept.head);
      
      if (!user) {
        console.log(`   ❌ Head user not found - skipping`);
        continue;
      }
      
      console.log(`   👤 Head user: ${user.name} (${user.email})`);
      
      // Check if user fields need updating
      const needsUpdate = !user.isHeadOfDepartment || 
                         user.headOfDepartment?.toString() !== dept._id.toString();
      
      if (needsUpdate) {
        console.log(`   🔧 Updating user fields...`);
        user.isHeadOfDepartment = true;
        user.headOfDepartment = dept._id;
        await user.save();
        console.log(`   ✅ User updated successfully`);
      } else {
        console.log(`   ✓ User fields already correct`);
      }
      
      console.log('');
    }

    console.log('✅ All HoD data synchronized!');
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixHoDData();
