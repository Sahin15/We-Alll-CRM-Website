import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

dotenv.config();

const assignHoD = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find Sahin Mondal
    const user = await User.findOne({ 
      $or: [
        { email: { $regex: /sahin/i } },
        { name: { $regex: /sahin/i } }
      ]
    });

    if (!user) {
      console.log('❌ User not found. Please check the email or name.');
      console.log('Available users:');
      const users = await User.find({}).select('name email');
      users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Find Development department
    const department = await Department.findOne({ 
      name: { $regex: /development/i } 
    });

    if (!department) {
      console.log('❌ Development department not found.');
      console.log('Available departments:');
      const depts = await Department.find({}).select('name');
      depts.forEach(d => console.log(`  - ${d.name}`));
      
      console.log('\n📝 Creating Development department...');
      const newDept = await Department.create({
        name: 'Development',
        description: 'Software development team',
        status: 'active'
      });
      console.log(`✅ Created department: ${newDept.name}`);
      
      // Assign HoD
      await assignHoDToDepartment(user, newDept);
    } else {
      console.log(`✅ Found department: ${department.name}`);
      await assignHoDToDepartment(user, department);
    }

    console.log('\n✅ Done! Sahin Mondal is now HoD of Development department.');
    console.log('\n📋 Next steps:');
    console.log('1. Logout from the app');
    console.log('2. Login again as Sahin Mondal');
    console.log('3. You should see the HoD section on the dashboard');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

const assignHoDToDepartment = async (user, department) => {
  // Update user
  user.isHeadOfDepartment = true;
  user.headOfDepartment = department._id;
  user.department = department._id;
  await user.save();
  console.log(`✅ Updated user: isHeadOfDepartment = true`);

  // Update department
  department.head = user._id;
  department.headAssignedBy = user._id; // Self-assigned for now
  department.headAssignedAt = new Date();
  
  // Add user to employees if not already there
  if (!department.employees.includes(user._id)) {
    department.employees.push(user._id);
  }
  
  await department.save();
  console.log(`✅ Updated department: head = ${user.name}`);
};

assignHoD();
