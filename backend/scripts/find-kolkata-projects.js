import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const projects = await Project.find({ name: /kolkata digital/i })
      .sort({ createdAt: -1 })
      .select('_id name createdAt updatedAt');
    
    
    projects.forEach((p, i) => {
      
      
      
      
      
    });
    
    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
}).catch(err => {
  
  process.exit(1);
});
