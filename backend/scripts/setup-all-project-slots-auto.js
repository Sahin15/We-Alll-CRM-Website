import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';

// Configuration
const DEFAULT_SLOT_COUNT = 5; // Change this number if you want different slot count

const setupAllProjectSlots = async () => {
  try {
    console.log('🔄 Automatic Slot System Setup for All Projects\n');
    console.log(`📋 Configuration: ${DEFAULT_SLOT_COUNT} slots per project\n`);
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const projects = await Project.find({}).select('name slotManagement slotConfiguration');
    console.log(`📊 Found ${projects.length} projects\n`);

    let totalSlotsCreated = 0;
    let projectsUpdated = 0;
    let workItemsCleared = 0;

    for (const project of projects) {
      console.log(`📦 Processing: ${project.name}`);

      // Clear any old slot assignments from work items
      const clearResult = await WorkItem.updateMany(
        { project: project._id },
        { $unset: { slot: "" } }
      );
      workItemsCleared += clearResult.modifiedCount;

      // Create new slots with proper MongoDB IDs
      const newSlots = [];
      for (let i = 1; i <= DEFAULT_SLOT_COUNT; i++) {
        const newSlot = {
          _id: new mongoose.Types.ObjectId(),
          slotNumber: i,
          name: `Slot ${i}`,
          description: `Work slot ${i} for ${project.name}`,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        newSlots.push(newSlot);
      }

      // Update both slotManagement and slotConfiguration
      project.slotManagement = {
        enabled: true,
        slotCount: DEFAULT_SLOT_COUNT,
        slots: newSlots,
        lastUpdated: new Date()
      };

      project.slotConfiguration = {
        enabled: true,
        slotCount: DEFAULT_SLOT_COUNT,
        slots: newSlots,
        lastUpdated: new Date()
      };

      await project.save();

      console.log(`   ✅ Created ${newSlots.length} slots with proper IDs`);
      console.log(`   📋 Slot IDs:`);
      newSlots.forEach(slot => {
        console.log(`      Slot ${slot.slotNumber}: ${slot._id}`);
      });
      console.log('');

      totalSlotsCreated += newSlots.length;
      projectsUpdated++;
    }

    console.log(`${'='.repeat(70)}`);
    console.log('🎉 SETUP COMPLETE!');
    console.log(`${'='.repeat(70)}`);
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Projects updated: ${projectsUpdated}`);
    console.log(`   ✅ Total slots created: ${totalSlotsCreated}`);
    console.log(`   ✅ Slots per project: ${DEFAULT_SLOT_COUNT}`);
    console.log(`   ✅ Work items cleared: ${workItemsCleared}`);

    console.log(`\n✨ All projects now have ${DEFAULT_SLOT_COUNT} slots with proper MongoDB IDs`);
    console.log(`✨ All work items have been unassigned from old slots`);
    
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Restart your backend server (if running)`);
    console.log(`   2. Refresh your frontend`);
    console.log(`   3. Work items can now be assigned to the new slots`);
    console.log(`   4. Each slot has a unique MongoDB ObjectId for proper tracking`);

  } catch (error) {
    console.error('\n❌ Error during setup:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

// Run the script
setupAllProjectSlots();
