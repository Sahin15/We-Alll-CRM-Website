import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

dotenv.config({ path: './backend/.env' });

const checkHoDStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users who think they are HoD
    const usersWithHoDFlag = await User.find({ isHeadOfDepartment: true });
    console.log(`\n📊 Users with isHeadOfDepartment=true: ${usersWithHoDFlag.length}`);
    
    for (const user of usersWithHoDFlag) {
      console.log(`\n👤 User: ${user.name} (${user.email})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   headOfDepartment field: ${user.headOfDepartment}`);
      
      if (user.headOfDepartment) {
        const dept = await Department.findById(user.headOfDepartment);
        if (dept) {
          console.log(`   ✅ Department exists: ${dept.name}`);
          console.log(`   Department head field: ${dept.head}`);
          console.log(`   Match: ${dept.head?.toString() === user._id.toString() ? '✅ YES' : '❌ NO'}`);
        } else {
          console.log(`   ❌ Department not found`);
        }
      }
    }

    // Find all departments with heads
    console.log('\n\n📊 Departments with heads:');
    const deptsWithHeads = await Department.find({ head: { $exists: true, $ne: null } });
    
    for (const dept of deptsWithHeads) {
      console.log(`\n🏢 Department: ${dept.name}`);
      console.log(`   ID: ${dept._id}`);
      console.log(`   Head ID: ${dept.head}`);
      console.log(`   Status: ${dept.status}`);
      
      const user = await User.findById(dept.head);
      if (user) {
        console.log(`   ✅ Head user exists: ${user.name} (${user.email})`);
        console.log(`   User's headOfDepartment: ${user.headOfDepartment}`);
        console.log(`   User's isHeadOfDepartment: ${user.isHeadOfDepartment}`);
      } else {
        console.log(`   ❌ Head user not found`);
      }
    }

    mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkHoDStatus();
