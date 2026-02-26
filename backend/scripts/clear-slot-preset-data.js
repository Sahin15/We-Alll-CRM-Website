/**
 * Clear Preset Data from Existing Slots
 * This script removes preset title, assignedTo, and dueDate from all existing slots
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGO_URI environment variable is not set');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const clearSlotPresetData = async () => {
  try {
    await connectDB();

    // Import Slot model
    const Slot = (await import('../src/models/slotModel.js')).default;

    console.log('🔍 Finding all slots with preset data...');

    // Find all slots
    const slots = await Slot.find({});
    console.log(`📊 Found ${slots.length} total slots`);

    let updatedCount = 0;

    for (const slot of slots) {
      let needsUpdate = false;
      const updates = {};

      // Clear title if it contains "Work Assignment"
      if (slot.title && slot.title.includes('Work Assignment')) {
        updates.title = '';
        needsUpdate = true;
      }

      // Clear description if it contains "Auto-generated"
      if (slot.description && slot.description.includes('Auto-generated')) {
        updates.description = '';
        needsUpdate = true;
      }

      // Clear assignedTo if slot is available (not actually assigned)
      if (slot.assignmentStatus === 'available' && slot.assignedTo) {
        updates.assignedTo = null;
        needsUpdate = true;
      }

      // Clear dueDate if slot is available (not actually assigned)
      if (slot.assignmentStatus === 'available' && slot.dueDate) {
        updates.dueDate = null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Slot.findByIdAndUpdate(slot._id, updates);
        updatedCount++;
        console.log(`✅ Updated Slot ${slot.slotNumber}: ${slot.slotIdentifier}`);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} slots`);
    console.log(`📊 ${slots.length - updatedCount} slots were already clean`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing slot preset data:', error);
    process.exit(1);
  }
};

clearSlotPresetData();
