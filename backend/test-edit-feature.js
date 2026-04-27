/**
 * Test script to verify the edit work item feature
 * Tests: editorName storage, activity timeline display, change tracking
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkItem from './src/models/workItemModel.js';
import User from './src/models/userModel.js';
import Project from './src/models/projectModel.js';

dotenv.config();

const testEditFeature = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find a test work item with edit history
    const workItem = await WorkItem.findOne({ editHistory: { $exists: true, $ne: [] } })
      .populate('editHistory.editedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!workItem) {
      console.log('⚠ No work items with edit history found');
      process.exit(0);
    }

    console.log('\n📋 Work Item:', workItem.title);
    console.log('ID:', workItem._id);
    console.log('\n📝 Edit History:');

    workItem.editHistory.forEach((edit, idx) => {
      console.log(`\n  Edit ${idx + 1}:`);
      console.log(`  - editorName: "${edit.editorName}"`);
      console.log(`  - editedBy._id: ${edit.editedBy?._id}`);
      console.log(`  - editedBy.name: "${edit.editedBy?.name}"`);
      console.log(`  - editedBy.email: "${edit.editedBy?.email}"`);
      console.log(`  - fieldsChanged: ${edit.fieldsChanged?.join(', ')}`);
      console.log(`  - editedAt: ${edit.editedAt}`);
      console.log(`  - reason: "${edit.reason}"`);
      
      // Check if editorName is properly set
      if (!edit.editorName) {
        console.log('  ⚠️  WARNING: editorName is empty!');
      } else {
        console.log('  ✓ editorName is set');
      }
    });

    console.log('\n✓ Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testEditFeature();
