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
    
    await mongoose.connect(process.env.MONGODB_URI);
    

    // Get all work items
    const allWorkItems = await WorkItem.find({})
      .populate('project', 'name')
      .populate('assignedTo', 'name')
      .lean();

    

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

    
    
    if (testWorkItems.length === 0) {
      
      await mongoose.connection.close();
      return;
    }

    // Display test work items
    testWorkItems.forEach((item, index) => {
      
      
      
      
      
      
      
    });

    // Confirm deletion
    
    

    // Get IDs of test work items
    const testWorkItemIds = testWorkItems.map(item => item._id);

    // Track affected projects for progress recalculation
    const affectedProjects = new Set();
    testWorkItems.forEach(item => {
      if (item.project?._id) {
        affectedProjects.add(item.project._id.toString());
      }
    });

    

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
          
        }
      }
    }

    

    // Delete test work items
    const deleteResult = await WorkItem.deleteMany({
      _id: { $in: testWorkItemIds }
    });

    

    // Update project progress for affected projects
    
    let projectsUpdated = 0;
    
    for (const projectId of affectedProjects) {
      try {
        const project = await Project.findById(projectId);
        if (project && project.slotConfiguration?.enableSlotSystem) {
          await project.recalculateSlotProgress();
          projectsUpdated++;
        }
      } catch (projectError) {
        
      }
    }

    

    
    
    
    
    

    await mongoose.connection.close();
    
  } catch (error) {
    
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
deleteTestWorkItems();
