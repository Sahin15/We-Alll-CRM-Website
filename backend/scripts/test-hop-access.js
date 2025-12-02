import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../src/models/projectModel.js';
import User from '../src/models/userModel.js';

const testHoPAccess = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Kaustav (the HoP)
    const kaustav = await User.findOne({ email: 'kaustavmukherjee2013@gmail.com' });
    if (!kaustav) {
      console.log('❌ Kaustav not found');
      return;
    }

    console.log('👤 User: Kaustav Mukherjee');
    console.log('   ID:', kaustav._id.toString());
    console.log('   Role:', kaustav.role);
    console.log('   Is HoD:', kaustav.isHeadOfDepartment);
    console.log('');

    // Find the project
    const projectId = '692844a12595e0bb3ec84150';
    const project = await Project.findById(projectId);
    
    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    console.log('📋 Project:', project.name);
    console.log('   Project Head ID:', project.projectHead?.toString());
    console.log('   Assigned Users:', project.assignedUsers.map(u => u.toString()));
    console.log('');

    // Check access
    const projectHeadId = project.projectHead?.toString();
    const kaustavId = kaustav._id.toString();
    
    console.log('🔍 Access Check:');
    console.log('   Is HoP?', projectHeadId === kaustavId);
    console.log('   Is Assigned?', project.assignedUsers.some(u => u.toString() === kaustavId));
    console.log('');

    // Test query for getProjects
    console.log('📋 Testing getProjects query for regular employee:');
    const query = {
      $or: [
        { assignedUsers: kaustav._id },
        { projectHead: kaustav._id }
      ]
    };
    
    const projects = await Project.find(query);
    console.log('   Found projects:', projects.length);
    if (projects.length > 0) {
      projects.forEach(p => {
        console.log(`   - ${p.name} (${p._id})`);
      });
    }
    console.log('');

    if (projects.length === 0) {
      console.log('❌ ISSUE: Kaustav should see the project but query returns 0 results');
      console.log('');
      console.log('Debugging:');
      console.log('   Query:', JSON.stringify(query, null, 2));
      console.log('   Kaustav ID type:', typeof kaustav._id);
      console.log('   Project Head type:', typeof project.projectHead);
      console.log('   Are they equal?', project.projectHead.toString() === kaustav._id.toString());
    } else {
      console.log('✅ SUCCESS: Kaustav can see the project!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  }
};

testHoPAccess();
