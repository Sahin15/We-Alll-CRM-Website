import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../src/models/projectModel.js';
import User from '../src/models/userModel.js';
import Department from '../src/models/departmentModel.js';

const testHoPAssignment = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a project with a department
    const project = await Project.findOne({ department: { $exists: true, $ne: null } })
      .populate('department', 'name')
      .populate('projectHead', 'name email');

    if (!project) {
      console.log('❌ No project with department found');
      return;
    }

    console.log('📋 Project:', project.name);
    console.log('🏢 Department:', project.department?.name);
    console.log('👤 Current Project Head:', project.projectHead?.name || 'None');
    console.log('');

    // Find users in the same department
    const departmentUsers = await User.find({
      department: project.department._id,
      role: { $ne: 'client' }
    }).select('name email role designation');

    console.log(`👥 Available users in ${project.department.name}:`);
    departmentUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.designation || user.role}`);
    });
    console.log('');

    // Find HoD of the department
    const hod = await User.findOne({
      headOfDepartment: project.department._id,
      isHeadOfDepartment: true
    }).select('name email role');

    if (hod) {
      console.log('👔 Head of Department:', hod.name, `(${hod.email})`);
    } else {
      console.log('⚠️  No HoD assigned to this department');
    }
    console.log('');

    console.log('✅ Test data ready!');
    console.log('');
    console.log('To test HoP assignment:');
    console.log('1. Log in as HoD or Admin');
    console.log(`2. Navigate to project: ${project.name}`);
    console.log('3. Go to the "Team" tab');
    console.log('4. Click "Assign Project Head" button');
    console.log('5. Select a user from the dropdown');
    console.log('6. Click "Assign Project Head"');
    console.log('');
    console.log('Expected behavior:');
    console.log('- Modal should show available users from the department');
    console.log('- After assignment, the Project Head section should update');
    console.log('- The assigned user should see the project in their dashboard');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  }
};

testHoPAssignment();
