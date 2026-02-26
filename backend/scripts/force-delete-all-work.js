import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function forceDeleteAllWork() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const projectId = '699ee1f6003fab70208e62bc';

    // Get all work items first
    const WorkItem = mongoose.model('WorkItem', new mongoose.Schema({}, { strict: false }));
    const workItems = await WorkItem.find({ project: projectId });
    
    console.log(`📦 Found ${workItems.length} work items for project ${projectId}\n`);
    
    if (workItems.length > 0) {
      workItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.title} (ID: ${item._id})`);
        console.log(`   - assignedTo: ${item.assignedTo}`);
        console.log(`   - slotAssignment:`, item.slotAssignment);
      });
      
      console.log('\n🗑️  Deleting all work items...');
      const result = await WorkItem.deleteMany({ project: projectId });
      console.log(`✅ Deleted ${result.deletedCount} work items`);
    } else {
      console.log('No work items found to delete');
    }

    // Reset all slots
    const Slot = mongoose.model('Slot', new mongoose.Schema({}, { strict: false }));
    const slotUpdate = await Slot.updateMany(
      { project: projectId },
      {
        $set: {
          assignmentStatus: 'available',
          assignedWorkItem: null,
          assignedTo: null,
          assignedAt: null,
          assignedBy: null,
          dueDate: null
        }
      }
    );

    console.log(`\n🔄 Reset ${slotUpdate.modifiedCount} slots to available status`);
    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

forceDeleteAllWork();
