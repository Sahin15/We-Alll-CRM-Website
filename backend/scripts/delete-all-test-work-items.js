import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import WorkItem from '../src/models/workItemModel.js';
import Slot from '../src/models/slotModel.js';
import Project from '../src/models/projectModel.js';

const deleteTestWorkItems = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all work items
    const allWorkItems = await WorkItem.find({})
      .populate('project', 'name')
      .populate('assignedTo', 'name')
      .lean();

    console.log(`📊 Total work items in database: ${allWorkItems.length}\n`);

    // Identify test work items based on various criteria
    const testCriteria = [
      // Work items with "test" in title (case insensitive)
      (item) => item.title?.toLowerCase().includes('test'),
      // Work items with "demo" in title
      (item) => item.title?.toLowerCase().includes('demo'),
      // Work items with "sample" in title
      (item) => item.title?.toLowerCase().includes('sample'),
      // Work items with "trial" in title
      (item) => item.title?.toLowerCase().includes('trial'),
      // Work items with "example" in title
      (item) => item.title?.toLowerCase().includes('example'),
    ];

    const testWorkItems = allWorkItems.filter(item => 
      testCriteria.some(criteria => criteria(item))
    );

    console.log(`🎯 Found ${testWorkItems.length} test work items:\n`);
    
    if (testWorkItems.length === 0) {
      console.log('✨ No test work items found. Database is clean!');
      await mongoose.connection.close();
      return;
    }

    // Display test work items
    testWorkItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Project: ${item.project?.name || 'N/A'}`);
      console.log(`   Assigned to: ${item.assignedTo?.name || 'N/A'}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Type: ${item.type}`);
      console.log(`   ID: ${item._id}`);
      console.log('');
    });

    // Confirm deletion
    console.log(`⚠️  About to delete ${testWorkItems.length} test work items`);
    console.log('⚠️  This action cannot be undone!\n');

    // Get IDs of test work items
    const testWorkItemIds = testWorkItems.map(item => item._id);

    // Track affected projects for progress recalculation
    const affectedProjects = new Set();
    testWorkItems.forEach(item => {
      if (item.project?._id) {
        affectedProjects.add(item.project._id.toString());
      }
    });

    console.log('🗑️  Deleting test work items...');

    // Clear slot assignments for test work items
    let slotsCleared = 0;
    for (const workItem of testWorkItems) {
      if (workItem.slotAssignment?.assignedSlot) {
        try {
          const slot = await Slot.findById(workItem.slotAssignment.assignedSlot);
          if (slot && slot.assignedWorkItem?.toString() === workItem._id.toString()) {
            slot.assignmentStatus = 'available';
            slot.assignedWorkItem = null;
            slot.assignedTo = null;
            slot.dueDate = null;
            slot.assignedAt = null;
            slot.assignedBy = null;
            await slot.save();
            slotsCleared++;
          }
        } catch (slotError) {
          console.error(`   ⚠️  Error clearing slot for work item ${workItem._id}:`, slotError.message);
        }
      }
    }

    console.log(`   ✅ Cleared ${slotsCleared} slot assignments`);

    // Delete test work items
    const deleteResult = await WorkItem.deleteMany({
      _id: { $in: testWorkItemIds }
    });

    console.log(`   ✅ Deleted ${deleteResult.deletedCount} work items`);

    // Update project progress for affected projects
    console.log('\n📊 Updating project progress...');
    let projectsUpdated = 0;
    
    for (const projectId of affectedProjects) {
      try {
        const project = await Project.findById(projectId);
        if (project && project.slotConfiguration?.enableSlotSystem) {
          await project.recalculateSlotProgress();
          projectsUpdated++;
        }
      } catch (projectError) {
        console.error(`   ⚠️  Error updating project ${projectId}:`, projectError.message);
      }
    }

    console.log(`   ✅ Updated progress for ${projectsUpdated} projects`);

    console.log('\n✨ Test work items deleted successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Work items deleted: ${deleteResult.deletedCount}`);
    console.log(`   - Slots cleared: ${slotsCleared}`);
    console.log(`   - Projects updated: ${projectsUpdated}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
deleteTestWorkItems();
