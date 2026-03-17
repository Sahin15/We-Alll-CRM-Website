import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const projects = await Project.find({ name: /kolkata digital/i })
      .sort({ createdAt: -1 })
      .select('_id name createdAt updatedAt');
    
    console.log('Kolkata Digital Projects:');
    projects.forEach((p, i) => {
      console.log(`${i + 1}. ID: ${p._id}`);
      console.log(`   Name: ${p.name}`);
      console.log(`   Created: ${p.createdAt}`);
      console.log(`   Updated: ${p.updatedAt}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
