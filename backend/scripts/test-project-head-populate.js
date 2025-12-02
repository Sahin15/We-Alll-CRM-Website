import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../src/models/projectModel.js';
import User from '../src/models/userModel.js';
import Client from '../src/models/clientModel.js';
import Department from '../src/models/departmentModel.js';

const testProjectHeadPopulate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find project with projectHead
    const projectId = '692844a12595e0bb3ec84150'; // gsdgfdsds project

    console.log('🔍 Testing getProjectById populate...\n');

    const project = await Project.findById(projectId)
      .populate("client", "name email")
      .populate("department", "name")
      .populate("projectHead", "name email designation")
      .populate("assignedUsers", "name email role");

    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log('📋 Project:', project.name);
    console.log('🏢 Department:', project.department?.name || 'Not assigned');
    console.log('');
    
    console.log('👤 Project Head Details:');
    if (project.projectHead) {
      console.log('  ✅ Project Head is populated!');
      console.log('  Name:', project.projectHead.name);
      console.log('  Email:', project.projectHead.email);
      console.log('  Designation:', project.projectHead.designation || 'N/A');
      console.log('  ID:', project.projectHead._id);
    } else {
      console.log('  ❌ Project Head is NULL or not populated');
      console.log('  Raw projectHead field:', project.projectHead);
    }
    console.log('');

    console.log('👥 Assigned Users:', project.assignedUsers?.length || 0);
    if (project.assignedUsers && project.assignedUsers.length > 0) {
      project.assignedUsers.forEach((user, i) => {
        console.log(`  ${i + 1}. ${user.name} (${user.email})`);
      });
    }
    console.log('');

    // Test the response format
    console.log('📤 Response format (as JSON):');
    const response = {
      _id: project._id,
      name: project.name,
      department: project.department,
      projectHead: project.projectHead,
      assignedUsers: project.assignedUsers,
    };
    console.log(JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  }
};

testProjectHeadPopulate();
