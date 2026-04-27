import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './src/models/projectModel.js';

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const projects = await Project.find().select('name _id').sort({ name: 1 });
    console.log(`\n📋 All Projects (${projects.length}):\n`);
    projects.forEach((p, i) => console.log(`${i + 1}. ${p.name}`));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
