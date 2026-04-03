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
      
      process.exit(1);
    }

    
    
    
    }`);
    :`);
    project.assignedUsers?.forEach((u, i) => {
      `);
    });

    // Find Sahin Mondal
    const sahin = await User.findOne({ name: /sahin mondal/i }).select('_id name email role');
    if (!sahin) {
      
    } else {
      
      
      
      

      // Check if Sahin is in assignedUsers
      const isAssigned = project.assignedUsers?.some(u => u._id.toString() === sahin._id.toString());
      const isProjectHead = project.projectHead?._id?.toString() === sahin._id.toString();

      
      
      

      // Simulate the query used in getProjectsForUser
      const queryResult = await Project.find({
        $or: [
          { assignedUsers: sahin._id },
          { projectHead: sahin._id }
        ]
      }).select('name _id');

       ===`);
      
      queryResult.forEach(p => `));
    }

    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
}).catch(err => {
  
  process.exit(1);
});
