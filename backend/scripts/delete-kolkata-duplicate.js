import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';
import Slot from '../src/models/slotModel.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const projectIdToDelete = '69b7eaf9d0a634d1f99b37aa';
    
    
    
    // First, delete all work items associated with this project
    const workItemsDeleted = await WorkItem.deleteMany({ project: projectIdToDelete });
    
    
    // Delete all slots associated with this project
    const slotsDeleted = await Slot.deleteMany({ project: projectIdToDelete });
    
    
    // Finally, delete the project itself
    const projectDeleted = await Project.findByIdAndDelete(projectIdToDelete);
    
    
    
    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
}).catch(err => {
  
  process.exit(1);
});
