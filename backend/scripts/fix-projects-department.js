import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';
import Department from '../src/models/departmentModel.js';

dotenv.config({ path: './backend/.env' });

const fixProjectsDepartment = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all projects without department
    const projectsWithoutDept = await Project.find({ 
      $or: [
        { department: null },
        { department: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${projectsWithoutDept.length} projects without department\n`);

    if (projectsWithoutDept.length === 0) {
      console.log('✅ All projects have departments assigned!');
      mongoose.connection.close();
      return;
    }

    // Get the first department as default
    const defaultDept = await Department.findOne();
    
    if (!defaultDept) {
      console.log('❌ No departments found. Please create departments first.');
      mongoose.connection.close();
      return;
    }

    console.log(`🏢 Using "${defaultDept.name}" as default department\n`);

    // Update projects
    for (const project of projectsWithoutDept) {
      console.log(`Updating project: ${project.name}`);
      project.department = defaultDept._id;
      await project.save();
      
      // Add to department's projects array
      await Department.findByIdAndUpdate(defaultDept._id, {
        $addToSet: { projects: project._id }
      });
    }

    console.log(`\n✅ Updated ${projectsWithoutDept.length} projects`);
    console.log(`✅ All projects now have department: ${defaultDept.name}`);

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixProjectsDepartment();
