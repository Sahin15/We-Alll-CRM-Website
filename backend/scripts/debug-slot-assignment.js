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

const WorkItem = mongoose.model('WorkItem');
const Slot = mongoose.model('Slot');
const Project = mongoose.model('Project');

async function debugSlotAssignment() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      
      return;
    }
    await mongoose.connect(mongoUri);
    

    // Find the "Create Website" project
    const project = await Project.findOne({ name: /create.*website/i });
    
    if (!project) {
      
      return;
    }

    `);

    // Find all slots for this project
    const slots = await Slot.find({ project: project._id }).sort({ slotNumber: 1 });
    
    
    // Show first few slots
    
    slots.slice(0, 5).forEach(slot => {
      
    });

    // Find work items for this project
    const workItems = await WorkItem.find({ 
      project: project._id,
      isDeleted: { $ne: true }
    })
    .populate('slotAssignment.assignedSlot', 'slotNumber slotIdentifier')
    .sort({ 'slotAssignment.slotNumber': 1 });

    
    
    // Show ALL work items (with and without slot assignments)
    
    workItems.forEach(item => {
      
      
      
      if (item.slotAssignment?.assignedSlot) {
        
        
        
        
      } else {
        
      }
      
    });

    // Check for mismatches
    
    let mismatchCount = 0;
    for (const item of workItems) {
      if (item.slotAssignment?.assignedSlot) {
        const denormalizedNumber = item.slotAssignment.slotNumber;
        const actualSlotNumber = item.slotAssignment.assignedSlot?.slotNumber;
        
        if (denormalizedNumber !== actualSlotNumber) {
          mismatchCount++;
          
          
        }
      }
    }
    
    if (mismatchCount === 0) {
      
    } else {
      
    }

  } catch (error) {
    
  } finally {
    await mongoose.connection.close();
    
  }
}

debugSlotAssignment();
