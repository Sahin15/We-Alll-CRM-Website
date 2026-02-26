import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const Slot = mongoose.model('Slot', new mongoose.Schema({}, { strict: false, collection: 'slots' }));

async function cleanupOldSlots() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const projectId = '699ee1f6003fab70208e62bc';
    
    // Find all slots for this project
    const allSlots = await Slot.find({ project: new mongoose.Types.ObjectId(projectId) });
    console.log(`📦 Found ${allSlots.length} total slots\n`);
    
    // Separate slots with empty title/description (OLD) vs proper ones (NEW)
    const oldSlots = [];
    const newSlots = [];
    
    allSlots.forEach(slot => {
      if (!slot.title || slot.title === '' || !slot.description || slot.description === '') {
        oldSlots.push(slot);
      } else {
        newSlots.push(slot);
      }
    });
    
    console.log(`🗑️  OLD slots (empty title/description): ${oldSlots.length}`);
    oldSlots.forEach(slot => {
      console.log(`   - Slot ${slot.slotNumber} (ID: ${slot._id}) - title: "${slot.title}", desc: "${slot.description}"`);
    });
    
    console.log(`\n✅ NEW slots (proper title/description): ${newSlots.length}`);
    newSlots.forEach(slot => {
      console.log(`   - Slot ${slot.slotNumber} (ID: ${slot._id}) - title: "${slot.title}"`);
    });
    
    if (oldSlots.length > 0) {
      console.log(`\n🗑️  Deleting ${oldSlots.length} old slots...`);
      const oldSlotIds = oldSlots.map(s => s._id);
      const result = await Slot.deleteMany({ _id: { $in: oldSlotIds } });
      console.log(`✅ Deleted ${result.deletedCount} old slots`);
    }
    
    console.log(`\n✅ Cleanup complete! ${newSlots.length} slots remaining.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

cleanupOldSlots();
