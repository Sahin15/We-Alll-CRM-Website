/**
 * Migration script to fix missing editorName in existing edit history
 * This script populates editorName and editorEmail for all edits that don't have it
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkItem from '../src/models/workItemModel.js';
import User from '../src/models/userModel.js';

dotenv.config();

const fixMissingEditorNames = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Find all work items with edit history
    const workItems = await WorkItem.find({ 
      editHistory: { $exists: true, $ne: [] }
    }).populate('editHistory.editedBy', 'name email');

    console.log(`\n📋 Found ${workItems.length} work items with edit history`);

    let totalEditsFixed = 0;
    let totalEditsSkipped = 0;

    for (const workItem of workItems) {
      let itemUpdated = false;

      for (let i = 0; i < workItem.editHistory.length; i++) {
        const edit = workItem.editHistory[i];

        // Check if editorName is missing
        if (!edit.editorName) {
          console.log(`\n  Fixing edit ${i + 1} in work item: ${workItem.title}`);
          
          // Get the editor user
          const editor = await User.findById(edit.editedBy).select('name email');
          const editorName = editor?.name || editor?.email || 'Unknown User';
          const editorEmail = editor?.email || '';
          
          console.log(`  - Setting editorName to: "${editorName}"`);
          console.log(`  - Setting editorEmail to: "${editorEmail}"`);
          
          // Update the editorName and editorEmail
          edit.editorName = editorName;
          edit.editorEmail = editorEmail;
          itemUpdated = true;
          totalEditsFixed++;
        } else {
          totalEditsSkipped++;
        }
      }

      // Save the work item if any edits were updated
      if (itemUpdated) {
        await workItem.save();
        console.log(`  ✓ Saved work item: ${workItem.title}`);
      }
    }

    console.log(`\n✓ Migration complete!`);
    console.log(`  - Total edits fixed: ${totalEditsFixed}`);
    console.log(`  - Total edits skipped (already had editorName): ${totalEditsSkipped}`);
    console.log(`  - Total edits processed: ${totalEditsFixed + totalEditsSkipped}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixMissingEditorNames();
