import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';

dotenv.config({ path: './backend/.env' });

const testGetProjects = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test the same query that getProjects uses
    const query = {}; // Empty query for superadmin
    
    console.log('📋 Testing query:', query);
    
    const projects = await Project.find(query)
      .populate({
        path: "client",
        select: "name email",
        options: { strictPopulate: false }
      })
      .populate({
        path: "department",
        select: "name",
        options: { strictPopulate: false }
      })
      .populate({
        path: "projectHead",
        select: "name email",
        options: { strictPopulate: false }
      })
      .populate({
        path: "assignedUsers",
        select: "name email role",
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 });

    console.log(`\n📊 Found ${projects.length} projects\n`);

    if (projects.length > 0) {
      projects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.name}`);
        console.log(`   ID: ${project._id}`);
        console.log(`   Department: ${project.department?.name || 'None'}`);
        console.log(`   Client: ${project.client?.name || 'None'}`);
        console.log(`   Status: ${project.status}`);
        console.log(`   Project Head: ${project.projectHead?.name || 'Not Assigned'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No projects found!');
      
      // Check if there are ANY projects at all
      const allProjects = await Project.find({});
      console.log(`\nTotal projects in DB (without populate): ${allProjects.length}`);
      
      if (allProjects.length > 0) {
        console.log('\n❌ Projects exist but populate is failing!');
        console.log('First project raw data:');
        console.log(JSON.stringify(allProjects[0], null, 2));
      }
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

testGetProjects();
