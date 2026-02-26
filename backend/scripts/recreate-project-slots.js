import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }));
const Slot = mongoose.model('Slot', new mongoose.Schema({}, { strict: false }));

async function recreateProjectSlots() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const projectId = '699ee1f6003fab70208e62bc';
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      console.log('❌ Project not found!');
      return;
    }

    console.log('📋 Project:', project.name);
    console.log('🔧 Slot System Enabled:', project.slotConfiguration?.enableSlotSystem);
    
    if (!project.slotConfiguration?.enableSlotSystem) {
      console.log('❌ Slot system is not enabled for this project');
      return;
    }

    // Delete existing slots
    const deletedCount = await Slot.deleteMany({ project: projectId });
    console.log(`\n🗑️  Deleted ${deletedCount.deletedCount} existing slots`);

    // Create 10 slots
    const numberOfSlots = 10;
    const slotNamingPattern = project.slotConfiguration?.slotNamingPattern || 'Slot {number}';
    
    console.log(`\n📦 Creating ${numberOfSlots} slots...\n`);

    const slots = [];
    for (let i = 1; i <= numberOfSlots; i++) {
      const slotIdentifier = slotNamingPattern.replace('{number}', i);
      
      const slot = await Slot.create({
        project: projectId,
        client: project.client,
        slotNumber: i,
        slotIdentifier: slotIdentifier,
        slotType: 'work',
        title: `Work for ${slotIdentifier}`,
        description: `Work slot ${i} for project ${project.name}`,
        workType: 'Other',
        priority: 'Medium',
        assignmentStatus: 'available',
        createdBy: project.createdBy || project.projectHead,
        slotConfiguration: {
          isRequired: true,
          canBeSkipped: false,
          requiresApproval: false,
          weight: 1.0
        },
        completionStatus: {
          isCompleted: false,
          requiresApproval: false
        }
      });

      slots.push(slot);
      console.log(`  ✅ Created: ${slot.slotIdentifier} (ID: ${slot._id})`);
    }

    console.log(`\n✅ Successfully created ${slots.length} slots for project: ${project.name}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

recreateProjectSlots();
