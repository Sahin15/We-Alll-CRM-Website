import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';
import Slot from '../src/models/slotModel.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const projectIdToDelete = '69b7eaf9d0a634d1f99b37aa';
    
    console.log(`Deleting project: ${projectIdToDelete}`);
    
    // First, delete all work items associated with this project
    const workItemsDeleted = await WorkItem.deleteMany({ project: projectIdToDelete });
    console.log(`Deleted ${workItemsDeleted.deletedCount} work items`);
    
    // Delete all slots associated with this project
    const slotsDeleted = await Slot.deleteMany({ project: projectIdToDelete });
    console.log(`Deleted ${slotsDeleted.deletedCount} slots`);
    
    // Finally, delete the project itself
    const projectDeleted = await Project.findByIdAndDelete(projectIdToDelete);
    console.log(`Deleted project: ${projectDeleted.name}`);
    
    console.log('\n✅ Successfully deleted the recently created Kolkata Digital project');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
