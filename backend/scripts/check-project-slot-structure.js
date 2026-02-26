import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../src/models/projectModel.js';

const checkProjectSlotStructure = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const projects = await Project.find({}).select('name slotManagement slotConfiguration');

    console.log(`📊 Total projects: ${projects.length}\n`);

    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name}`);
      console.log(`   slotManagement:`, project.slotManagement ? 'EXISTS' : 'NOT SET');
      console.log(`   slotConfiguration:`, project.slotConfiguration ? 'EXISTS' : 'NOT SET');
      
      if (project.slotManagement) {
        console.log(`   - enabled:`, project.slotManagement.enabled);
        console.log(`   - slotCount:`, project.slotManagement.slotCount);
        console.log(`   - slots:`, project.slotManagement.slots?.length || 0);
      }
      
      if (project.slotConfiguration) {
        console.log(`   - enabled:`, project.slotConfiguration.enabled);
        console.log(`   - slotCount:`, project.slotConfiguration.slotCount);
        console.log(`   - slots:`, project.slotConfiguration.slots?.length || 0);
      }
      
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

checkProjectSlotStructure();
