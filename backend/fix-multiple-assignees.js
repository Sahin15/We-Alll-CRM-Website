import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkItem from './src/models/workItemModel.js';
import Slot from './src/models/slotModel.js';
import Project from './src/models/projectModel.js';
import User from './src/models/userModel.js';

dotenv.config();

const fixMultipleAssignees = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find the projects
    const projects = await Project.find({
      name: { $in: ['J J AABHUSHAN', 'Anney Gomes'] }
    });

    if (projects.length === 0) {
      console.log('❌ Projects not found');
      process.exit(1);
    }

    console.log(`\n📋 Found ${projects.length} projects:`);
    projects.forEach(p => console.log(`  - ${p.name} (${p._id})`));

    for (const project of projects) {
      console.log(`\n🔧 Processing project: ${project.name}`);

      // Get all work items for this project with multiple assignees
      const workItems = await WorkItem.find({
        project: project._id,
        assignedToMultiple: { $exists: true, $ne: [] }
      }).populate('assignedToMultiple', 'name email');

      console.log(`  Found ${workItems.length} work items with multiple assignees`);

      for (const workItem of workItems) {
        // Check if work item is already assigned to a slot
        if (workItem.slotAssignment?.assignedSlot) {
          console.log(`  ✓ ${workItem.title} - Already in slot`);
          continue;
        }

        // Get first available slot for current month
        const currentPeriod = Slot.getCurrentPeriodIdentifier();
        const availableSlot = await Slot.findOne({
          project: project._id,
          'period.periodIdentifier': currentPeriod,
          assignmentStatus: 'available',
          'completionStatus.isCompleted': { $ne: true }
        }).sort({ slotNumber: 1 });

        if (!availableSlot) {
          console.log(`  ⚠ ${workItem.title} - No available slots`);
          continue;
        }

        // Assign work item to slot
        availableSlot.assignmentStatus = 'assigned';
        availableSlot.assignedWorkItem = workItem._id;
        availableSlot.assignedToMultiple = workItem.assignedToMultiple;
        availableSlot.assignedTo = workItem.assignedToMultiple[0];
        availableSlot.dueDate = workItem.dueDate;
        availableSlot.assignedAt = new Date();
        availableSlot.assignedBy = workItem.createdBy;
        await availableSlot.save();

        // Update work item with slot assignment
        workItem.slotAssignment = {
          assignedSlot: availableSlot._id,
          slotNumber: availableSlot.slotNumber,
          slotIdentifier: availableSlot.slotIdentifier,
          slotType: availableSlot.slotType,
          assignedAt: new Date(),
          assignedBy: workItem.createdBy
        };
        await workItem.save();

        const assigneeNames = workItem.assignedToMultiple.map(a => a.name).join(', ');
        console.log(`  ✅ ${workItem.title} - Assigned to slot ${availableSlot.slotNumber} (${assigneeNames})`);
      }
    }

    console.log('\n✅ Fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixMultipleAssignees();
