import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';

const DEFAULT_SLOT_COUNT = 5;

const completeSlotSystemCleanup = async () => {
  try {
    console.log('🧹 Complete Slot System Cleanup and Reset\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Delete old slots collection
    console.log('Step 1: Removing old slots collection...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const slotCollection = collections.find(c => c.name === 'slots');
    
    if (slotCollection) {
      const oldSlotCount = await mongoose.connection.db.collection('slots').countDocuments();
      await mongoose.connection.db.collection('slots').drop();
      console.log(`   ✅ Deleted ${oldSlotCount} documents from old 'slots' collection\n`);
    } else {
      console.log('   ℹ️  No old slots collection found\n');
    }

    // Step 2: Clear work item slot assignments
    console.log('Step 2: Clearing work item slot assignments...');
    const clearResult = await WorkItem.updateMany(
      {},
      { $unset: { slot: "" } }
    );
    console.log(`   ✅ Cleared slot assignments from ${clearResult.modifiedCount} work items\n`);

    // Step 3: Setup new slot system for all projects
    console.log('Step 3: Setting up new slot system for all projects...\n');
    const projects = await Project.find({});
    
    let projectsUpdated = 0;
    let totalSlotsCreated = 0;

    for (const project of projects) {
      console.log(`   📦 ${project.name}`);

      // Create new slots with proper MongoDB IDs
      const newSlots = [];
      for (let i = 1; i <= DEFAULT_SLOT_COUNT; i++) {
        newSlots.push({
          _id: new mongoose.Types.ObjectId(),
          slotNumber: i,
          name: `Slot ${i}`,
          description: `Work slot ${i} for ${project.name}`,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Update project with new slot configuration
      await Project.findByIdAndUpdate(
        project._id,
        {
          $set: {
            'slotManagement.enabled': true,
            'slotManagement.slotCount': DEFAULT_SLOT_COUNT,
            'slotManagement.slots': newSlots,
            'slotManagement.lastUpdated': new Date(),
            'slotConfiguration.enabled': true,
            'slotConfiguration.slotCount': DEFAULT_SLOT_COUNT,
            'slotConfiguration.slots': newSlots,
            'slotConfiguration.lastUpdated': new Date()
          }
        },
        { new: true }
      );

      console.log(`      ✅ Created ${newSlots.length} slots`);
      projectsUpdated++;
      totalSlotsCreated += newSlots.length;
    }

    // Step 4: Verify cleanup
    console.log(`\n${'='.repeat(70)}`);
    console.log('Step 4: Verifying cleanup...\n');
    
    const remainingOldSlots = collections.find(c => c.name === 'slots');
    const updatedProjects = await Project.countDocuments({ 'slotManagement.enabled': true });
    const workItemsWithSlots = await WorkItem.countDocuments({ slot: { $exists: true, $ne: null } });

    console.log(`   Old slots collection: ${remainingOldSlots ? '❌ Still exists' : '✅ Removed'}`);
    console.log(`   Projects with slots enabled: ${updatedProjects}/${projects.length}`);
    console.log(`   Work items with old slot assignments: ${workItemsWithSlots}`);

    // Final Summary
    console.log(`\n${'='.repeat(70)}`);
    console.log('🎉 CLEANUP COMPLETE!');
    console.log(`${'='.repeat(70)}`);
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Old slots collection deleted`);
    console.log(`   ✅ Projects updated: ${projectsUpdated}`);
    console.log(`   ✅ New slots created: ${totalSlotsCreated}`);
    console.log(`   ✅ Slots per project: ${DEFAULT_SLOT_COUNT}`);
    console.log(`   ✅ Work items cleared: ${clearResult.modifiedCount}`);

    console.log(`\n✨ Slot system is now clean and ready to use!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Restart your backend server`);
    console.log(`   2. Refresh your frontend`);
    console.log(`   3. All projects now have ${DEFAULT_SLOT_COUNT} slots with proper IDs`);
    console.log(`   4. Assign work items to slots as needed`);

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

completeSlotSystemCleanup();
