import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/userModel.js';
import Project from './src/models/projectModel.js';

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Search for user
    const users = await User.find({ name: /anney/i }).select('name email _id');
    console.log('\n👤 Users matching "anney":');
    if (users.length === 0) {
      console.log('  No users found');
    } else {
      users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
      
      // For each user, find projects they're assigned to
      for (const user of users) {
        const projects = await Project.find({
          $or: [
            { assignedUsers: user._id },
            { projectHead: user._id },
            { 'teamMembers.user': user._id }
          ]
        }).select('name _id');
        
        console.log(`\n  Projects for ${user.name}:`);
        if (projects.length === 0) {
          console.log('    No projects found');
        } else {
          projects.forEach(p => console.log(`    - ${p.name}`));
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
