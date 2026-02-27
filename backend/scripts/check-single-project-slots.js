import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../src/models/projectModel.js';

const checkSingleProject = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    const project = await Project.findOne({}).select('name slotManagement slotConfiguration');
    
    console.log('Project:', project.name);
    console.log('\nslotManagement:', JSON.stringify(project.slotManagement, null, 2));
    console.log('\nslotConfiguration:', JSON.stringify(project.slotConfiguration, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

checkSingleProject();
