import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';
import User from '../src/models/userModel.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    // Find the project
    const project = await Project.findOne({ name: /learning mern/i })
      .populate('projectHead', 'name email _id')
      .populate('assignedUsers', 'name email _id');

    if (!project) {
      console.log('Project "Learning MERN" not found!');
      process.exit(1);
    }

    console.log('=== Project Found ===');
    console.log(`ID: ${project._id}`);
    console.log(`Name: ${project.name}`);
    console.log(`Project Head: ${JSON.stringify(project.projectHead)}`);
    console.log(`Assigned Users (${project.assignedUsers?.length || 0}):`);
    project.assignedUsers?.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.name} (${u._id})`);
    });

    // Find Sahin Mondal
    const sahin = await User.findOne({ name: /sahin mondal/i }).select('_id name email role');
    if (!sahin) {
      console.log('\nUser "Sahin Mondal" not found!');
    } else {
      console.log(`\n=== Sahin Mondal ===`);
      console.log(`ID: ${sahin._id}`);
      console.log(`Name: ${sahin.name}`);
      console.log(`Role: ${sahin.role}`);

      // Check if Sahin is in assignedUsers
      const isAssigned = project.assignedUsers?.some(u => u._id.toString() === sahin._id.toString());
      const isProjectHead = project.projectHead?._id?.toString() === sahin._id.toString();

      console.log(`\n=== Membership Check ===`);
      console.log(`Is in assignedUsers: ${isAssigned}`);
      console.log(`Is projectHead: ${isProjectHead}`);

      // Simulate the query used in getProjectsForUser
      const queryResult = await Project.find({
        $or: [
          { assignedUsers: sahin._id },
          { projectHead: sahin._id }
        ]
      }).select('name _id');

      console.log(`\n=== Query Simulation (getProjectsForUser) ===`);
      console.log(`Projects found for Sahin: ${queryResult.length}`);
      queryResult.forEach(p => console.log(`  - ${p.name} (${p._id})`));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
