import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';

const resetAllProjectSlots = async () => {
  try {
    console.log('🔄 Starting Complete Slot System Reset...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find all slot-based projects
    const slotProjects = await Project.find({ 
      'slotManagement.enabled': true 
    }).select('name slotManagement');

    console.log(`📊 Found ${slotProjects.length} slot-based projects\n`);

    if (slotProjects.length === 0) {
      console.log('⚠️  No slot-based projects found. Exiting...');
      return;
    }

    let totalSlotsDeleted = 0;
    let totalSlotsCreated = 0;
    let totalWorkItemsUpdated = 0;

    // Step 2: Process each project
    for (const project of slotProjects) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Processing: ${project.name}`);
      console.log(`${'='.repeat(60)}`);

      const oldSlots = project.slotManagement?.slots || [];
      const slotCount = project.slotManagement?.slotCount || 0;

      console.log(`   Old slots: ${oldSlots.length}`);
      console.log(`   Configured slot count: ${slotCount}`);

      // Step 3: Get all work items for this project
      const workItems = await WorkItem.find({ 
        project: project._id,
        isDeleted: { $ne: true }
      }).select('title slot');

      console.log(`   Work items: ${workItems.length}`);

      // Step 4: Clear old slot assignments from work items
      if (workItems.length > 0) {
        const updateResult = await WorkItem.updateMany(
          { project: project._id },
          { $unset: { slot: "" } }
        );
        console.log(`   ✅ Cleared slot assignments from ${updateResult.modifiedCount} work items`);
        totalWorkItemsUpdated += updateResult.modifiedCount;
      }

      // Step 5: Delete old slots
      if (oldSlots.length > 0) {
        totalSlotsDeleted += oldSlots.length;
        console.log(`   🗑️  Deleted ${oldSlots.length} old slots`);
      }

      // Step 6: Create new slots with proper IDs
      const newSlots = [];
      
      if (slotCount > 0) {
        for (let i = 1; i <= slotCount; i++) {
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

        console.log(`   ✨ Created ${newSlots.length} new slots with proper IDs`);
        totalSlotsCreated += newSlots.length;

        // Display new slot IDs
        console.log(`\n   📋 New Slot IDs:`);
        newSlots.forEach(slot => {
          console.log(`      Slot ${slot.slotNumber}: ${slot._id}`);
        });
      }

      // Step 7: Update project with new slots
      project.slotManagement.slots = newSlots;
      project.slotManagement.lastUpdated = new Date();
      await project.save();

      console.log(`   ✅ Project updated successfully`);
    }

    // Step 8: Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 RESET COMPLETE!');
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Projects processed: ${slotProjects.length}`);
    console.log(`   Old slots deleted: ${totalSlotsDeleted}`);
    console.log(`   New slots created: ${totalSlotsCreated}`);
    console.log(`   Work items cleared: ${totalWorkItemsUpdated}`);

    console.log(`\n✅ All projects now have fresh slots with proper MongoDB IDs`);
    console.log(`✅ All work items have been unassigned from old slots`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Restart your backend server`);
    console.log(`   2. Refresh your frontend`);
    console.log(`   3. Reassign work items to the new slots`);

  } catch (error) {
    console.error('\n❌ Error during slot reset:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

// Run the script
resetAllProjectSlots();
