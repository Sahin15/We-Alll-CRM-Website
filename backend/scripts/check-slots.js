import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';
import Client from '../src/models/clientModel.js';
import User from '../src/models/userModel.js';

const checkSlots = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check total slots
    const slots = await Slot.find({})
      .populate('project', 'name')
      .populate('client', 'name')
      .populate('assignedTo', 'name email');

    console.log('📊 Total Slots:', slots.length);
    console.log('');

    if (slots.length === 0) {
      console.log('❌ No slots found in database');
      console.log('');
      console.log('This is why the Content Calendar appears empty.');
      console.log('');
      console.log('To fix this:');
      console.log('1. Go to Content Calendar');
      console.log('2. Click "Create Slot" button');
      console.log('3. Select a project');
      console.log('4. Fill in the slot details');
      console.log('5. Submit the form');
      console.log('');
      
      // Check if there are projects available
      const projects = await Project.find({});
      console.log('📋 Available Projects:', projects.length);
      if (projects.length > 0) {
        console.log('');
        console.log('Projects you can create slots for:');
        projects.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} (ID: ${p._id})`);
        });
      }
    } else {
      console.log('✅ Slots found:');
      console.log('');
      slots.forEach((slot, i) => {
        console.log(`${i + 1}. ${slot.postType} - ${slot.brief?.substring(0, 50)}...`);
        console.log(`   Project: ${slot.project?.name || 'N/A'}`);
        console.log(`   Assigned To: ${slot.assignedTo?.name || 'Unassigned'}`);
        console.log(`   Status: ${slot.designStatus} / ${slot.postingStatus}`);
        console.log(`   Posting Date: ${new Date(slot.postingDate).toLocaleDateString()}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Connection closed');
  }
};

checkSlots();
