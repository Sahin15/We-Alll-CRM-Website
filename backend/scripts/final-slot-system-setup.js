import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';
import WorkItem from '../src/models/workItemModel.js';

const DEFAULT_SLOT_COUNT = 5;

const finalSlotSystemSetup = async () => {
  try {
    console.log('🚀 Final Slot System Setup\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Delete ALL old slots
    console.log('Step 1: Deleting all old slots...');
    const deleteResult = await Slot.deleteMany({});
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} old slots\n`);

    // Step 2: Clear work item slot references
    console.log('Step 2: Clearing work item slot references...');
    const clearResult = await WorkItem.updateMany(
      {},
      { $unset: { slot: "", slotId: "", assignedSlot: "" } }
    );
    console.log(`   ✅ Cleared ${clearResult.modifiedCount} work items\n`);

    // Step 3: Get all projects
    console.log('Step 3: Setting up slots for all projects...\n');
    const projects = await Project.find({});
    
    let projectsUpdated = 0;
    let totalSlotsCreated = 0;

    for (const project of projects) {
      console.log(`   📦 ${project.name}`);

      // Create new slots in the Slot collection
      const newSlots = [];
      for (let i = 1; i <= DEFAULT_SLOT_COUNT; i++) {
        const slot = new Slot({
          project: project._id,
          client: project.client,
          slotNumber: i,
          slotIdentifier: `Slot ${i}`,
          title: `Slot ${i} - ${project.name}`,
          description: `Work slot ${i} for ${project.name}`,
          slotType: 'work',
          workType: 'Other',
          priority: 'Medium',
          assignmentStatus: 'available',
          status: 'Pending',
          createdBy: project.createdBy || project.projectHead,
          slotConfiguration: {
            isRequired: false,
            canBeSkipped: true,
            requiresApproval: false,
            estimatedEffort: 8,
            weight: 1
          }
        });
        
        await slot.save();
        newSlots.push(slot);
      }

      // Update project configuration
      await Project.findByIdAndUpdate(
        project._id,
        {
          $set: {
            'slotConfiguration.enableSlotSystem': true,
            'slotConfiguration.totalSlots': DEFAULT_SLOT_COUNT,
            'slotConfiguration.slotType': 'generic',
            'slotConfiguration.autoCreateSlots': false,
            'progressTracking.calculationMethod': 'slot-based',
            'progressTracking.totalSlots': DEFAULT_SLOT_COUNT,
            'progressTracking.completedSlots': 0
          }
        }
      );

      console.log(`      ✅ Created ${newSlots.length} slots with IDs`);
      totalSlotsCreated += newSlots.length;
      projectsUpdated++;
    }

    // Step 4: Verify
    console.log(`\n${'='.repeat(70)}`);
    console.log('Step 4: Verifying setup...\n');
    
    const totalSlots = await Slot.countDocuments();
    const enabledProjects = await Project.countDocuments({ 'slotConfiguration.enableSlotSystem': true });
    const workItemsWithSlots = await WorkItem.countDocuments({ slot: { $exists: true, $ne: null } });

    console.log(`   Total slots in database: ${totalSlots}`);
    console.log(`   Projects with slots enabled: ${enabledProjects}/${projects.length}`);
    console.log(`   Work items with slot assignments: ${workItemsWithSlots}`);

    // Final Summary
    console.log(`\n${'='.repeat(70)}`);
    console.log('🎉 SETUP COMPLETE!');
    console.log(`${'='.repeat(70)}`);
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Old slots deleted: ${deleteResult.deletedCount}`);
    console.log(`   ✅ Projects updated: ${projectsUpdated}`);
    console.log(`   ✅ New slots created: ${totalSlotsCreated}`);
    console.log(`   ✅ Slots per project: ${DEFAULT_SLOT_COUNT}`);
    console.log(`   ✅ Work items cleared: ${clearResult.modifiedCount}`);

    console.log(`\n✨ Slot system is ready!`);
    console.log(`\n💡 What's been done:`);
    console.log(`   - All old slots have been deleted`);
    console.log(`   - ${totalSlotsCreated} new slots created with proper IDs`);
    console.log(`   - All ${projects.length} projects have slot system enabled`);
    console.log(`   - Each project has ${DEFAULT_SLOT_COUNT} slots`);
    console.log(`   - Work items are ready to be assigned to slots`);

    console.log(`\n🔄 Next steps:`);
    console.log(`   1. Restart your backend server`);
    console.log(`   2. Refresh your frontend`);
    console.log(`   3. Slots will appear in project work tabs`);
    console.log(`   4. Assign work items to slots as needed`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

finalSlotSystemSetup();
