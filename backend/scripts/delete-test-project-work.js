/**
 * Delete All Work Items for Test Project
 * This script deletes all work items for a specific project to start fresh
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGO_URI environment variable is not set');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const deleteTestProjectWork = async () => {
  try {
    await connectDB();

    // Import models
    const WorkItem = (await import('../src/models/workItemModel.js')).default;
    const Project = (await import('../src/models/projectModel.js')).default;
    const Slot = (await import('../src/models/slotModel.js')).default;

    console.log('🔍 Finding test project...\n');

    // Find project by name (you can change this to match your test project)
    const testProject = await Project.findOne({ 
      name: { $regex: /test/i } 
    }).sort({ createdAt: -1 });

    if (!testProject) {
      console.log('⚠️  No test project found. Looking for all projects...\n');
      const allProjects = await Project.find().select('name _id').limit(10);
      console.log('Available projects:');
      allProjects.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} (ID: ${p._id})`);
      });
      console.log('\n💡 Update the script with the correct project ID or name');
      process.exit(0);
    }

    console.log(`📋 Found project: ${testProject.name}`);
    console.log(`🆔 Project ID: ${testProject._id}\n`);

    // Find all work items for this project
    const workItems = await WorkItem.find({ project: testProject._id });
    console.log(`📊 Found ${workItems.length} work items to delete\n`);

    if (workItems.length === 0) {
      console.log('✅ No work items to delete. Project is already clean.');
      process.exit(0);
    }

    // Delete all work items
    let deletedCount = 0;
    let slotsClearedCount = 0;

    for (const workItem of workItems) {
      console.log(`🗑️  Deleting: ${workItem.title}`);
      
      // If work item has slot assignment, clear the slot
      if (workItem.slotAssignment && workItem.slotAssignment.assignedSlot) {
        try {
          const slot = await Slot.findById(workItem.slotAssignment.assignedSlot);
          if (slot) {
            slot.assignmentStatus = 'available';
            slot.assignedWorkItem = null;
            slot.assignedTo = null;
            slot.dueDate = null;
            slot.assignedAt = null;
            slot.assignedBy = null;
            await slot.save();
            slotsClearedCount++;
            console.log(`   ✓ Cleared slot ${slot.slotNumber}`);
          }
        } catch (slotError) {
          console.log(`   ⚠️  Could not clear slot: ${slotError.message}`);
        }
      }
      
      // Delete the work item
      await WorkItem.findByIdAndDelete(workItem._id);
      deletedCount++;
    }

    console.log('\n✅ Cleanup complete!');
    console.log(`   - Deleted ${deletedCount} work items`);
    console.log(`   - Cleared ${slotsClearedCount} slots`);
    console.log(`\n🎉 Project "${testProject.name}" is now clean and ready for testing!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting work items:', error);
    process.exit(1);
  }
};

deleteTestProjectWork();
