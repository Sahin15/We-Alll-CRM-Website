import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';

const verifySlotCleanup = async () => {
  try {
    console.log('🔍 Verifying Slot System Status\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if there's a separate Slot collection
    const collections = await mongoose.connection.db.listCollections().toArray();
    const slotCollection = collections.find(c => c.name.toLowerCase().includes('slot'));
    
    if (slotCollection) {
      console.log(`⚠️  Found separate slot collection: ${slotCollection.name}`);
      const count = await mongoose.connection.db.collection(slotCollection.name).countDocuments();
      console.log(`   Documents in collection: ${count}`);
      
      if (count > 0) {
        console.log(`\n   📋 Sample documents:`);
        const samples = await mongoose.connection.db.collection(slotCollection.name).find({}).limit(3).toArray();
        samples.forEach((doc, i) => {
          console.log(`   ${i + 1}.`, JSON.stringify(doc, null, 2));
        });
      }
    } else {
      console.log('✅ No separate slot collection found (slots are embedded in projects)\n');
    }

    // Check project slot status
    console.log('📊 Project Slot Status:\n');
    const projects = await Project.find({}).select('name slotManagement slotConfiguration');
    
    let enabledCount = 0;
    let disabledCount = 0;
    let withSlotsCount = 0;
    let withoutSlotsCount = 0;

    projects.forEach(project => {
      const isEnabled = project.slotManagement?.enabled || project.slotConfiguration?.enabled;
      const hasSlots = (project.slotManagement?.slots?.length > 0) || (project.slotConfiguration?.slots?.length > 0);
      
      if (isEnabled) enabledCount++;
      else disabledCount++;
      
      if (hasSlots) withSlotsCount++;
      else withoutSlotsCount++;
    });

    console.log(`   Total projects: ${projects.length}`);
    console.log(`   ✅ Enabled: ${enabledCount}`);
    console.log(`   ❌ Disabled: ${disabledCount}`);
    console.log(`   📦 With slots: ${withSlotsCount}`);
    console.log(`   📭 Without slots: ${withoutSlotsCount}`);

    // Check work items with slot assignments
    console.log('\n📋 Work Item Slot Assignments:\n');
    const workItemsWithSlots = await WorkItem.countDocuments({ 
      slot: { $exists: true, $ne: null },
      isDeleted: { $ne: true }
    });
    const totalWorkItems = await WorkItem.countDocuments({ isDeleted: { $ne: true } });
    
    console.log(`   Total work items: ${totalWorkItems}`);
    console.log(`   With slot assignments: ${workItemsWithSlots}`);
    console.log(`   Without slot assignments: ${totalWorkItems - workItemsWithSlots}`);

    if (workItemsWithSlots > 0) {
      console.log(`\n   📋 Sample work items with slots:`);
      const samples = await WorkItem.find({ 
        slot: { $exists: true, $ne: null },
        isDeleted: { $ne: true }
      }).limit(5).select('title slot project');
      
      for (const item of samples) {
        const project = await Project.findById(item.project).select('name');
        console.log(`      - "${item.title}" (Project: ${project?.name || 'Unknown'})`);
        console.log(`        Slot: ${JSON.stringify(item.slot)}`);
      }
    }

    // Summary
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 SUMMARY');
    console.log(`${'='.repeat(70)}`);
    
    if (enabledCount === projects.length && withSlotsCount === projects.length) {
      console.log('✅ All projects have slots enabled and configured');
      console.log('✅ Slot system is ready to use');
    } else {
      console.log('⚠️  Some projects may need slot configuration');
    }
    
    if (workItemsWithSlots === 0) {
      console.log('✅ No old slot assignments found - clean slate');
    } else {
      console.log(`⚠️  ${workItemsWithSlots} work items still have slot assignments`);
      console.log('   These may need to be reassigned to new slots');
    }

    console.log('\n💡 Recommendations:');
    if (disabledCount > 0) {
      console.log(`   - ${disabledCount} projects have slots disabled`);
    }
    if (withoutSlotsCount > 0) {
      console.log(`   - ${withoutSlotsCount} projects have no slots configured`);
    }
    if (workItemsWithSlots > 0) {
      console.log(`   - Consider reassigning ${workItemsWithSlots} work items to new slots`);
    }
    if (enabledCount === projects.length && workItemsWithSlots === 0) {
      console.log('   ✅ System is clean and ready - no action needed!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

verifySlotCleanup();
