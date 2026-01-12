#!/usr/bin/env node

/**
 * Test Project Update Script
 * Tests the project update functionality with slot configuration
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const testProjectUpdate = async (projectId) => {
  try {
    console.log(`🧪 Testing project update for: ${projectId}\n`);
    
    // Get project before update
    const projectBefore = await Project.findById(projectId);
    if (!projectBefore) {
      console.log('❌ Project not found');
      return;
    }
    
    console.log('📋 Project Before Update:');
    console.log(`   Name: ${projectBefore.name}`);
    console.log(`   Slot System: ${projectBefore.slotConfiguration?.enableSlotSystem || false}`);
    console.log(`   Total Slots: ${projectBefore.slotConfiguration?.totalSlots || 0}`);
    
    // Count existing slots
    const slotsBefore = await Slot.countDocuments({ project: projectId });
    console.log(`   Existing Slots in DB: ${slotsBefore}`);
    
    // Simulate the update data that would come from frontend
    const updateData = {
      slotConfiguration: {
        enableSlotSystem: true,
        totalSlots: 15,
        slotType: 'generic',
        autoCreateSlots: true,
        allowDynamicSlots: true,
        slotNamingPattern: 'Slot {number}'
      },
      progressTracking: {
        calculationMethod: 'slot-based',
        totalSlots: 15,
        completedSlots: 0,
        progressPercentage: 0
      }
    };
    
    console.log('\n🔄 Simulating Update with Data:');
    console.log(JSON.stringify(updateData, null, 2));
    
    // Update the project
    Object.keys(updateData).forEach((k) => {
      projectBefore[k] = updateData[k];
    });
    
    await projectBefore.save();
    console.log('\n✅ Project document updated');
    
    // Now test the slot creation logic
    const newSlotConfig = projectBefore.slotConfiguration;
    
    if (newSlotConfig && newSlotConfig.enableSlotSystem) {
      const slotManagementService = (await import('../services/slotManagementService.js')).default;
      
      const existingSlots = await Slot.countDocuments({ project: projectId });
      const slotsNeeded = newSlotConfig.totalSlots - existingSlots;
      
      console.log(`\n🎰 Slot Creation Check:`);
      console.log(`   Existing slots: ${existingSlots}`);
      console.log(`   Required slots: ${newSlotConfig.totalSlots}`);
      console.log(`   Slots to create: ${slotsNeeded}`);
      
      if (slotsNeeded > 0) {
        console.log(`\n🚀 Creating ${slotsNeeded} slots...`);
        
        const result = await slotManagementService.createSlotsForProject(projectId, {
          count: slotsNeeded,
          startingSlotNumber: existingSlots + 1,
          slotType: newSlotConfig.slotType || 'generic',
          createdBy: projectBefore.createdBy
        });
        
        console.log(`✅ Created ${result.created.length} slots successfully!`);
        
        // Show created slots
        if (result.created.length > 0) {
          console.log('\n📋 Created Slots:');
          result.created.forEach((slot, index) => {
            console.log(`   ${index + 1}. ${slot.title} (Slot ${slot.slotNumber})`);
          });
        }
      } else {
        console.log('\n✅ No additional slots needed');
      }
    }
    
    // Verify final state
    const projectAfter = await Project.findById(projectId);
    const slotsAfter = await Slot.countDocuments({ project: projectId });
    
    console.log('\n📊 Final State:');
    console.log(`   Slot System: ${projectAfter.slotConfiguration?.enableSlotSystem}`);
    console.log(`   Configured Slots: ${projectAfter.slotConfiguration?.totalSlots}`);
    console.log(`   Actual Slots in DB: ${slotsAfter}`);
    console.log(`   Progress Method: ${projectAfter.progressTracking?.calculationMethod}`);
    
    const success = projectAfter.slotConfiguration?.enableSlotSystem && 
                   slotsAfter === projectAfter.slotConfiguration?.totalSlots;
    
    console.log(`\n${success ? '🎉 SUCCESS' : '❌ FAILED'}: Slot system ${success ? 'working correctly' : 'has issues'}`);
    
  } catch (error) {
    console.error('❌ Error testing project update:', error);
  }
};

const main = async () => {
  await connectDB();
  
  const projectId = process.argv[2];
  
  if (!projectId) {
    console.log('🧪 Test Project Update Script');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Usage:');
    console.log('   node scripts/test-project-update.js <project-id>');
    console.log('');
    console.log('💡 Example:');
    console.log('   node scripts/test-project-update.js 507f1f77bcf86cd799439011');
    console.log('');
    console.log('🔍 This script will:');
    console.log('   1. Show current project state');
    console.log('   2. Simulate a slot configuration update');
    console.log('   3. Test slot creation logic');
    console.log('   4. Verify final state');
    process.exit(0);
  }
  
  await testProjectUpdate(projectId);
  
  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
};

main().catch(console.error);