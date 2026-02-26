import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const Slot = mongoose.model('Slot', new mongoose.Schema({}, { strict: false, collection: 'slots' }));

async function fixAllSlots() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all slots with empty or missing title/description
    const brokenSlots = await Slot.find({
      $or: [
        { title: { $in: ['', null] } },
        { description: { $in: ['', null] } },
        { title: { $exists: false } },
        { description: { $exists: false } }
      ]
    });

    console.log(`🔍 Found ${brokenSlots.length} slots with empty/missing title or description\n`);

    if (brokenSlots.length === 0) {
      console.log('✅ All slots are already properly configured!');
      return;
    }

    let fixed = 0;
    for (const slot of brokenSlots) {
      const updates = {};
      
      if (!slot.title || slot.title === '') {
        updates.title = `Work for ${slot.slotIdentifier || `Slot ${slot.slotNumber}`}`;
      }
      
      if (!slot.description || slot.description === '') {
        updates.description = `Work slot ${slot.slotNumber} for project`;
      }

      if (Object.keys(updates).length > 0) {
        await Slot.updateOne(
          { _id: slot._id },
          { $set: updates }
        );
        
        console.log(`✅ Fixed Slot ${slot.slotNumber} (${slot._id})`);
        console.log(`   - title: "${updates.title || slot.title}"`);
        console.log(`   - description: "${updates.description || slot.description}"`);
        fixed++;
      }
    }

    console.log(`\n✅ Fixed ${fixed} slots across all projects!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

fixAllSlots();
