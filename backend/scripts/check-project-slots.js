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

async function checkProjectSlots() {
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
    console.log('🔧 Slot Configuration:');
    console.log('  - enableSlotSystem:', project.slotConfiguration?.enableSlotSystem);
    console.log('  - numberOfSlots:', project.slotConfiguration?.numberOfSlots);
    console.log('  - slotNamingPattern:', project.slotConfiguration?.slotNamingPattern);
    
    const slots = await Slot.find({ project: projectId }).sort({ slotNumber: 1 });
    console.log(`\n📦 Slots in database: ${slots.length}`);
    
    if (slots.length === 0) {
      console.log('\n⚠️  NO SLOTS FOUND! Slots need to be created.');
      console.log('💡 Slots should be created when project is created with slot system enabled.');
    } else {
      slots.forEach(slot => {
        console.log(`  - Slot ${slot.slotNumber}: ${slot.slotIdentifier} (${slot.assignmentStatus})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkProjectSlots();
