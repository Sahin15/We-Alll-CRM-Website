/**
 * Check Slot Assignment Status
 * This script checks if slots are properly assigned with assignedTo and dueDate
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

const checkSlotAssignment = async () => {
  try {
    await connectDB();

    // Import Slot model
    const Slot = (await import('../src/models/slotModel.js')).default;

    console.log('🔍 Checking slot assignments...\n');

    // Find all assigned slots
    const assignedSlots = await Slot.find({ 
      assignmentStatus: 'assigned' 
    })
    .populate('assignedTo', 'name email')
    .populate('assignedWorkItem', 'title status')
    .limit(10);

    console.log(`📊 Found ${assignedSlots.length} assigned slots\n`);

    if (assignedSlots.length === 0) {
      console.log('⚠️  No assigned slots found. Try assigning work to a slot first.');
    } else {
      assignedSlots.forEach((slot, index) => {
        console.log(`\n--- Slot ${index + 1} ---`);
        console.log(`Slot Number: ${slot.slotNumber}`);
        console.log(`Slot ID: ${slot._id}`);
        console.log(`Title: ${slot.title || '(empty)'}`);
        console.log(`Assignment Status: ${slot.assignmentStatus}`);
        console.log(`Assigned To: ${slot.assignedTo ? slot.assignedTo.name : '(null)'}`);
        console.log(`Due Date: ${slot.dueDate ? new Date(slot.dueDate).toLocaleDateString() : '(null)'}`);
        console.log(`Assigned Work Item: ${slot.assignedWorkItem ? slot.assignedWorkItem.title : '(null)'}`);
      });
    }

    console.log('\n✅ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking slot assignment:', error);
    process.exit(1);
  }
};

checkSlotAssignment();
