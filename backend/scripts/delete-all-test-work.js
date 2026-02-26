import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function deleteTestWork() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const projectId = '699ee1f6003fab70208e62bc'; // Test project ID

    // Delete all work items for this project
    const WorkItem = mongoose.model('WorkItem', new mongoose.Schema({}, { strict: false }));
    const result = await WorkItem.deleteMany({ project: projectId });
    
    console.log(`🗑️  Deleted ${result.deletedCount} work items for project ${projectId}`);

    // Reset all slots to available
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

    console.log(`🔄 Reset ${slotUpdate.modifiedCount} slots to available status`);
    console.log('✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

deleteTestWork();
