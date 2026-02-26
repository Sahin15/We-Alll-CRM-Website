import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function deleteAllWorkItems() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const projectId = '699ee1f6003fab70208e62bc';

    // Use a simple schema to find all work items
    const WorkItem = mongoose.model('WorkItem', new mongoose.Schema({}, { strict: false, collection: 'workitems' }));
    
    // Find all work items for this project
    const workItems = await WorkItem.find({ project: new mongoose.Types.ObjectId(projectId) });
    console.log(`📦 Found ${workItems.length} work items\n`);
    
    if (workItems.length > 0) {
      workItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.title} (ID: ${item._id})`);
      });
      
      console.log('\n🗑️  Deleting all work items...');
      const result = await WorkItem.deleteMany({ project: new mongoose.Types.ObjectId(projectId) });
      console.log(`✅ Deleted ${result.deletedCount} work items`);
    }

    // Reset slots
    const Slot = mongoose.model('Slot', new mongoose.Schema({}, { strict: false, collection: 'slots' }));
    const slotUpdate = await Slot.updateMany(
      { project: new mongoose.Types.ObjectId(projectId) },
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

    console.log(`\n🔄 Reset ${slotUpdate.modifiedCount} slots to available`);
    console.log('\n✅ All work items deleted!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

deleteAllWorkItems();
