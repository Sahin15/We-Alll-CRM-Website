import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';
import User from '../src/models/userModel.js';

const testSlotAccess = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Kaustav (HoP)
    const kaustav = await User.findOne({ email: 'kaustavmukherjee2013@gmail.com' });
    if (!kaustav) {
      console.log('❌ Kaustav not found');
      return;
    }

    console.log('👤 User: Kaustav Mukherjee');
    console.log('   ID:', kaustav._id.toString());
    console.log('   Role:', kaustav.role);
    console.log('');

    // Find projects Kaustav has access to
    const accessibleProjects = await Project.find({
      $or: [
        { projectHead: kaustav._id },
        { assignedUsers: kaustav._id }
      ]
    });

    console.log('📋 Accessible Projects:', accessibleProjects.length);
    accessibleProjects.forEach(p => {
      console.log(`   - ${p.name} (${p._id})`);
    });
    console.log('');

    const projectIds = accessibleProjects.map(p => p._id);

    // Find slots from accessible projects
    const slots = await Slot.find({
      project: { $in: projectIds }
    }).populate('project', 'name');

    console.log('📊 Accessible Slots:', slots.length);
    if (slots.length > 0) {
      slots.forEach((slot, i) => {
        console.log(`${i + 1}. ${slot.postType} - ${slot.brief?.substring(0, 40)}...`);
        console.log(`   Project: ${slot.project?.name || 'N/A'}`);
        console.log(`   Posting Date: ${new Date(slot.postingDate).toLocaleDateString()}`);
        console.log('');
      });
    } else {
      console.log('   No slots found for accessible projects');
      console.log('');
      
      // Check all slots
      const allSlots = await Slot.find({}).populate('project', 'name');
      console.log('📊 Total Slots in Database:', allSlots.length);
      if (allSlots.length > 0) {
        console.log('');
        console.log('All slots (for debugging):');
        allSlots.forEach((slot, i) => {
          console.log(`${i + 1}. Project: ${slot.project?.name || 'N/A'} (${slot.project?._id || 'No ID'})`);
          console.log(`   Brief: ${slot.brief?.substring(0, 40)}...`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  }
};

testSlotAccess();
