import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';

dotenv.config({ path: './backend/.env' });

const debugProject = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the project directly
    const project = await Project.findById('692844a12595e0bb3ec84150');
    
    if (!project) {
      console.log('❌ Project not found!');
      mongoose.connection.close();
      return;
    }

    console.log('📋 Project found:');
    console.log(JSON.stringify(project, null, 2));
    
    // Now try the same query as getProjects
    console.log('\n\n🔍 Testing getProjects query:');
    const query = {};
    const projects = await Project.find(query);
    console.log(`Found ${projects.length} projects with empty query`);
    
    if (projects.length === 0) {
      // Check if there are ANY projects
      const count = await Project.countDocuments();
      console.log(`\n❌ Empty query found 0 projects, but countDocuments says: ${count}`);
      
      // Try without any conditions
      const allProjects = await Project.find({}).limit(5);
      console.log(`\nDirect find({}) returned: ${allProjects.length} projects`);
      
      if (allProjects.length > 0) {
        console.log('\nFirst project from direct query:');
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

debugProject();
