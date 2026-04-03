import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
import '../src/models/workItemModel.js';
import '../src/models/slotModel.js';
import '../src/models/projectModel.js';
import '../src/models/userModel.js';

const WorkItem = mongoose.model('WorkItem');
const Slot = mongoose.model('Slot');
const Project = mongoose.model('Project');
const User = mongoose.model('User');

async function fixWebsiteDesignSlot() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      
      return;
    }
    await mongoose.connect(mongoUri);
    

    // Find the "website design" work item
    const workItem = await WorkItem.findOne({ 
      title: /website design/i,
      isDeleted: { $ne: true }
    })
    .populate('project', 'name')
    .populate('assignedTo', 'name')
    .populate('slotAssignment.assignedSlot', 'slotNumber slotIdentifier');

    if (!workItem) {
      
      return;
    }

    
    
    
    
    
    
    
    
    
    

    if (!workItem.project) {
      
      return;
    }

    // Get admin user for assignment
    const adminUser = await User.findOne({ role: 'superadmin' });
    if (!adminUser) {
      
      return;
    }

    // Find slot 1 for this project
    const slot1 = await Slot.findOne({ 
      project: workItem.project._id,
      slotNumber: 1
    });

    if (!slot1) {
      
      return;
    }

    
    
    
    
    
    
    
    

    // Check if projects match
    if (slot1.project.toString() !== workItem.project._id.toString()) {
      
      
      
      return;
    }

    // If slot is not available, release it first
    if (!slot1.isAvailable) {
      `);
      if (slot1.currentWorkItem) {
        
      }
      
      await slot1.releaseSlot(adminUser._id, 'Reassigning to different work item');
      
    }

    // Get admin user for assignment (already fetched above, this is redundant now)
    // const adminUser = await User.findOne({ role: 'superadmin' });
    // if (!adminUser) {
    //   
    //   return;
    // }

    
    
    // First, clear the invalid slot assignment
    
    workItem.slotAssignment = {
      assignedSlot: null,
      slotNumber: null,
      slotIdentifier: null,
      slotType: null,
      assignedAt: null,
      assignedBy: null
    };
    await workItem.save();
    

    // Reload the work item to get fresh data
    const freshWorkItem = await WorkItem.findById(workItem._id);
    
    // Now assign to slot 1
    
    : ${freshWorkItem.project}`);
    
    await freshWorkItem.assignToSlot(slot1._id, adminUser._id);
    

    

    // Verify the assignment
    const updatedWorkItem = await WorkItem.findById(freshWorkItem._id)
      .populate('slotAssignment.assignedSlot', 'slotNumber slotIdentifier');

    
    
    
    

  } catch (error) {
    
  } finally {
    await mongoose.connection.close();
    
  }
}

fixWebsiteDesignSlot();
