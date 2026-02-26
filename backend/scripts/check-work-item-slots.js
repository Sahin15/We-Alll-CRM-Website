import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
console.log('🔍 MongoDB URI:', MONGODB_URI ? 'Found' : 'NOT FOUND');

const WorkItem = mongoose.model('WorkItem', new mongoose.Schema({}, { strict: false }));
const Slot = mongoose.model('Slot', new mongoose.Schema({}, { strict: false }));

async function checkWorkItemSlots() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const projectId = '699ee1f6003fab70208e62bc'; // Your test project ID
    
    console.log('\n📊 Checking work items for project:', projectId);
    console.log('='.repeat(60));

    // Get all work items for this project
    const workItems = await WorkItem.find({ project: projectId })
      .populate('assignedTo', 'name')
      .populate('slotAssignment.assignedSlot', 'slotNumber slotIdentifier');

    console.log(`\n📦 Found ${workItems.length} work items:\n`);

    workItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Assigned to: ${item.assignedTo?.name || 'Unassigned'}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Has slotAssignment: ${!!item.slotAssignment}`);
      
      if (item.slotAssignment) {
        console.log(`   Slot Assignment:`);
        console.log(`     - assignedSlot: ${item.slotAssignment.assignedSlot}`);
        console.log(`     - slotNumber: ${item.slotAssignment.slotNumber}`);
        console.log(`     - slotIdentifier: ${item.slotAssignment.slotIdentifier}`);
      } else {
        console.log(`   ⚠️  NO SLOT ASSIGNMENT`);
      }
      console.log('');
    });

    // Get all slots for this project
    console.log('\n📦 Checking slots for project:\n');
    const slots = await Slot.find({ project: projectId })
      .sort({ slotNumber: 1 })
      .populate('assignedWorkItem', 'title')
      .populate('assignedTo', 'name');

    console.log(`Found ${slots.length} slots:\n`);

    slots.forEach(slot => {
      console.log(`Slot ${slot.slotNumber}:`);
      console.log(`  Status: ${slot.assignmentStatus}`);
      console.log(`  Assigned Work Item: ${slot.assignedWorkItem?.title || 'None'}`);
      console.log(`  Assigned To: ${slot.assignedTo?.name || 'None'}`);
      console.log('');
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Check complete');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

checkWorkItemSlots();
