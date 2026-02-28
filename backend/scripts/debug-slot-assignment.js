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
      console.error('❌ MongoDB URI not found in environment variables');
      return;
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the "Create Website" project
    const project = await Project.findOne({ name: /create.*website/i });
    
    if (!project) {
      console.log('❌ Project "Create Website" not found');
      return;
    }

    console.log(`\n📁 Project: ${project.name} (ID: ${project._id})`);

    // Find all slots for this project
    const slots = await Slot.find({ project: project._id }).sort({ slotNumber: 1 });
    console.log(`\n🎯 Total Slots: ${slots.length}`);
    
    // Show first few slots
    console.log('\n📊 Slot Details:');
    slots.slice(0, 5).forEach(slot => {
      console.log(`  Slot ${slot.slotNumber}: ${slot.slotIdentifier} - Status: ${slot.assignmentStatus}`);
    });

    // Find work items for this project
    const workItems = await WorkItem.find({ 
      project: project._id,
      isDeleted: { $ne: true }
    })
    .populate('slotAssignment.assignedSlot', 'slotNumber slotIdentifier')
    .sort({ 'slotAssignment.slotNumber': 1 });

    console.log(`\n📝 Total Work Items: ${workItems.length}`);
    
    // Show ALL work items (with and without slot assignments)
    console.log('\n🔍 All Work Items:');
    workItems.forEach(item => {
      console.log(`  "${item.title}"`);
      console.log(`    - Status: ${item.status}`);
      console.log(`    - Assigned To: ${item.assignedTo?.name || 'Unassigned'}`);
      if (item.slotAssignment?.assignedSlot) {
        console.log(`    - slotAssignment.slotNumber: ${item.slotAssignment.slotNumber}`);
        console.log(`    - slotAssignment.assignedSlot.slotNumber: ${item.slotAssignment.assignedSlot?.slotNumber}`);
        console.log(`    - slotAssignment.slotIdentifier: ${item.slotAssignment.slotIdentifier}`);
        console.log(`    - Slot ID: ${item.slotAssignment.assignedSlot?._id}`);
      } else {
        console.log(`    - No slot assignment`);
      }
      console.log('');
    });

    // Check for mismatches
    console.log('\n⚠️  Checking for Mismatches:');
    let mismatchCount = 0;
    for (const item of workItems) {
      if (item.slotAssignment?.assignedSlot) {
        const denormalizedNumber = item.slotAssignment.slotNumber;
        const actualSlotNumber = item.slotAssignment.assignedSlot?.slotNumber;
        
        if (denormalizedNumber !== actualSlotNumber) {
          mismatchCount++;
          console.log(`  ❌ MISMATCH: "${item.title}"`);
          console.log(`     Denormalized: ${denormalizedNumber}, Actual: ${actualSlotNumber}`);
        }
      }
    }
    
    if (mismatchCount === 0) {
      console.log('  ✅ No mismatches found!');
    } else {
      console.log(`\n  Found ${mismatchCount} mismatches`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

debugSlotAssignment();
