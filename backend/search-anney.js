import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './src/models/projectModel.js';

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const projects = await Project.find({ name: /anney/i }).select('name _id');
    console.log('Projects matching "anney":');
    if (projects.length === 0) {
      console.log('  No projects found');
    } else {
      projects.forEach(p => console.log(`  - ${p.name} (${p._id})`));
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
