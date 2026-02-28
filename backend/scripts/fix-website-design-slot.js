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
      console.error('❌ MongoDB URI not found in environment variables');
      return;
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the "website design" work item
    const workItem = await WorkItem.findOne({ 
      title: /website design/i,
      isDeleted: { $ne: true }
    })
    .populate('project', 'name')
    .populate('assignedTo', 'name')
    .populate('slotAssignment.assignedSlot', 'slotNumber slotIdentifier');

    if (!workItem) {
      console.log('❌ Work item "website design" not found');
      return;
    }

    console.log(`\n📝 Found Work Item: "${workItem.title}"`);
    console.log(`   Work Item ID: ${workItem._id}`);
    console.log(`   Project: ${workItem.project?.name || 'No Project'}`);
    console.log(`   Project ID: ${workItem.project?._id || 'No Project ID'}`);
    console.log(`   Assigned To: ${workItem.assignedTo?.name || 'Unassigned'}`);
    console.log(`   Status: ${workItem.status}`);
    console.log(`   Current Slot Assignment:`);
    console.log(`     - slotNumber: ${workItem.slotAssignment?.slotNumber || 'None'}`);
    console.log(`     - slotIdentifier: ${workItem.slotAssignment?.slotIdentifier || 'None'}`);
    console.log(`     - assignedSlot ID: ${workItem.slotAssignment?.assignedSlot?._id || 'None'}`);

    if (!workItem.project) {
      console.log('\n❌ Work item has no project assigned. Cannot assign to slot.');
      return;
    }

    // Get admin user for assignment
    const adminUser = await User.findOne({ role: 'superadmin' });
    if (!adminUser) {
      console.log('\n❌ No admin user found for assignment');
      return;
    }

    // Find slot 1 for this project
    const slot1 = await Slot.findOne({ 
      project: workItem.project._id,
      slotNumber: 1
    });

    if (!slot1) {
      console.log('\n❌ Slot 1 not found for this project');
      return;
    }

    console.log(`\n🎯 Found Slot 1:`);
    console.log(`   Slot ID: ${slot1._id}`);
    console.log(`   Slot Number: ${slot1.slotNumber}`);
    console.log(`   Slot Identifier: ${slot1.slotIdentifier}`);
    console.log(`   Project ID: ${slot1.project}`);
    console.log(`   Status: ${slot1.assignmentStatus}`);
    console.log(`   Current Work Item: ${slot1.currentWorkItem || 'None'}`);
    console.log(`   Is Available: ${slot1.isAvailable}`);

    // Check if projects match
    if (slot1.project.toString() !== workItem.project._id.toString()) {
      console.log(`\n❌ Project mismatch!`);
      console.log(`   Work Item Project: ${workItem.project._id}`);
      console.log(`   Slot Project: ${slot1.project}`);
      return;
    }

    // If slot is not available, release it first
    if (!slot1.isAvailable) {
      console.log(`\n⚠️  Slot 1 is not available (status: ${slot1.assignmentStatus})`);
      if (slot1.currentWorkItem) {
        console.log(`   Currently assigned to work item: ${slot1.currentWorkItem}`);
      }
      console.log(`   Releasing slot...`);
      await slot1.releaseSlot(adminUser._id, 'Reassigning to different work item');
      console.log(`   ✅ Slot released`);
    }

    // Get admin user for assignment (already fetched above, this is redundant now)
    // const adminUser = await User.findOne({ role: 'superadmin' });
    // if (!adminUser) {
    //   console.log('\n❌ No admin user found for assignment');
    //   return;
    // }

    console.log(`\n🔄 Fixing slot assignment...`);
    
    // First, clear the invalid slot assignment
    console.log('   Step 1: Clearing invalid slot assignment data...');
    workItem.slotAssignment = {
      assignedSlot: null,
      slotNumber: null,
      slotIdentifier: null,
      slotType: null,
      assignedAt: null,
      assignedBy: null
    };
    await workItem.save();
    console.log('   ✅ Cleared invalid data');

    // Reload the work item to get fresh data
    const freshWorkItem = await WorkItem.findById(workItem._id);
    
    // Now assign to slot 1
    console.log('   Step 2: Assigning to Slot 1...');
    console.log(`   Work Item Project (fresh): ${freshWorkItem.project}`);
    console.log(`   Slot Project: ${slot1.project}`);
    await freshWorkItem.assignToSlot(slot1._id, adminUser._id);
    console.log('   ✅ Assigned to Slot 1');

    console.log('✅ Successfully assigned work item to Slot 1');

    // Verify the assignment
    const updatedWorkItem = await WorkItem.findById(freshWorkItem._id)
      .populate('slotAssignment.assignedSlot', 'slotNumber slotIdentifier');

    console.log(`\n✅ Verification:`);
    console.log(`   slotNumber: ${updatedWorkItem.slotAssignment?.slotNumber}`);
    console.log(`   slotIdentifier: ${updatedWorkItem.slotAssignment?.slotIdentifier}`);
    console.log(`   assignedSlot.slotNumber: ${updatedWorkItem.slotAssignment?.assignedSlot?.slotNumber}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

fixWebsiteDesignSlot();
