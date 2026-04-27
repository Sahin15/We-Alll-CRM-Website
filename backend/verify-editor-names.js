/**
 * Verify that editorName and editorEmail are properly stored
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkItem from './src/models/workItemModel.js';

dotenv.config();

const verifyEditorNames = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Find work items with edit history
    const workItems = await WorkItem.find({ 
      editHistory: { $exists: true, $ne: [] }
    });

    console.log(`📋 Found ${workItems.length} work items with edit history\n`);

    for (const workItem of workItems) {
      console.log(`Work Item: ${workItem.title}`);
      console.log(`ID: ${workItem._id}\n`);

      workItem.editHistory.forEach((edit, idx) => {
        console.log(`  Edit ${idx + 1}:`);
        console.log(`    - editorName: "${edit.editorName}"`);
        console.log(`    - editorEmail: "${edit.editorEmail}"`);
        console.log(`    - editedBy: ${edit.editedBy}`);
        console.log(`    - fieldsChanged: ${edit.fieldsChanged?.join(', ')}`);
        console.log(`    - editedAt: ${edit.editedAt}`);
        
        if (!edit.editorName) {
          console.log(`    ⚠️  WARNING: editorName is missing!`);
        } else {
          console.log(`    ✓ editorName is set`);
        }
        console.log();
      });
    }

    console.log('✓ Verification complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

verifyEditorNames();
