import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Department from '../src/models/departmentModel.js';
import Project from '../src/models/projectModel.js';
import User from '../src/models/userModel.js';
import Client from '../src/models/clientModel.js';

dotenv.config({ path: './backend/.env' });

const checkDepartmentProjects = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Development department (Sahin's department)
    const dept = await Department.findOne({ name: 'Development' })
      .populate('projects')
      .populate('head', 'name email');

    if (!dept) {
      console.log('❌ Development department not found');
      process.exit(1);
    }

    console.log(`🏢 Department: ${dept.name}`);
    console.log(`   ID: ${dept._id}`);
    console.log(`   Head: ${dept.head?.name || 'None'}`);
    console.log(`   Projects in department.projects array: ${dept.projects?.length || 0}\n`);

    // Also check projects that reference this department
    const projectsInDept = await Project.find({ department: dept._id })
      .populate('projectHead', 'name email')
      .populate('client', 'name');

    console.log(`📊 Projects with department=${dept._id}: ${projectsInDept.length}\n`);

    if (projectsInDept.length > 0) {
      projectsInDept.forEach((project, index) => {
        console.log(`${index + 1}. ${project.name}`);
        console.log(`   ID: ${project._id}`);
        console.log(`   Client: ${project.client?.name || 'N/A'}`);
        console.log(`   Status: ${project.status}`);
        console.log(`   Project Head: ${project.projectHead?.name || 'Not Assigned'}`);
        console.log(`   Team Members: ${project.teamMembers?.length || 0}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No projects found for this department');
      console.log('\nTo fix this, you need to:');
      console.log('1. Create projects (as admin)');
      console.log('2. Assign them to the Development department');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkDepartmentProjects();
