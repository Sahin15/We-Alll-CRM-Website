import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const Slot = mongoose.model('Slot', new mongoose.Schema({}, { strict: false }));

async function checkSlotFields() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const projectId = '699ee1f6003fab70208e62bc';
    const slotId = '69a01e4445406656fe7a358e'; // Slot 1 (new ID)
    
    const slot = await Slot.findById(slotId);
    
    if (!slot) {
      console.log('❌ Slot not found');
      return;
    }

    console.log('📦 Slot Details:');
    console.log('  ID:', slot._id);
    console.log('  slotNumber:', slot.slotNumber);
    console.log('  slotIdentifier:', slot.slotIdentifier);
    console.log('  title:', slot.title);
    console.log('  description:', slot.description);
    console.log('  workType:', slot.workType);
    console.log('  assignmentStatus:', slot.assignmentStatus);
    console.log('\n  title is empty?', !slot.title || slot.title === '');
    console.log('  description is empty?', !slot.description || slot.description === '');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkSlotFields();
