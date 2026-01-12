#!/usr/bin/env node

/**
 * Test Slot Creation Script
 * Tests slot creation when project slot configuration is updated
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';
import Client from '../src/models/clientModel.js';

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

const testSlotCreation = async (projectId) => {
  try {
    console.log('🧪 Testing Slot Creation for Project...\n');
    
    // Get project details
    const project = await Project.findById(projectId)
      .populate('client', 'name')
      .lean();
    
    if (!project) {
      console.log('❌ Project not found');
      return;
    }
    
    console.log('📋 Project Information:');
    console.log(`   Name: ${project.name}`);
    console.log(`   Client: ${project.client?.name || 'N/A'}`);
    console.log(`   Status: ${project.status}`);
    
    // Check slot configuration
    const slotConfig = project.slotConfiguration;
    console.log('\n🎰 Slot Configuration:');
    console.log(`   Slot System Enabled: ${slotConfig?.enableSlotSystem || false}`);
    console.log(`   Total Slots: ${slotConfig?.totalSlots || 0}`);
    console.log(`   Slot Type: ${slotConfig?.slotType || 'N/A'}`);
    console.log(`   Auto Create: ${slotConfig?.autoCreateSlots || false}`);
    
    // Check existing slots
    const existingSlots = await Slot.find({ project: projectId })
      .select('slotNumber title assignmentStatus')
      .sort({ slotNumber: 1 })
      .lean();
    
    console.log('\n📊 Existing Slots:');
    console.log(`   Count: ${existingSlots.length}`);
    
    if (existingSlots.length > 0) {
      console.log('   Slot Details:');
      existingSlots.forEach((slot, index) => {
        console.log(`     ${index + 1}. Slot ${slot.slotNumber}: ${slot.title} (${slot.assignmentStatus})`);
      });
    } else {
      console.log('   No slots found');
    }
    
    // Check progress tracking
    const progressTracking = project.progressTracking;
    console.log('\n📈 Progress Tracking:');
    console.log(`   Calculation Method: ${progressTracking?.calculationMethod || 'manual'}`);
    console.log(`   Total Slots: ${progressTracking?.totalSlots || 0}`);
    console.log(`   Completed Slots: ${progressTracking?.completedSlots || 0}`);
    console.log(`   Progress Percentage: ${progressTracking?.progressPercentage || 0}%`);
    
    // Analysis
    console.log('\n🔍 Analysis:');
    const expectedSlots = slotConfig?.totalSlots || 0;
    const actualSlots = existingSlots.length;
    
    if (slotConfig?.enableSlotSystem) {
      if (actualSlots === expectedSlots) {
        console.log('   ✅ Slot count matches configuration');
      } else if (actualSlots < expectedSlots) {
        console.log(`   ⚠️  Missing slots: Expected ${expectedSlots}, Found ${actualSlots}`);
        console.log('   💡 Slots may need to be created through project update');
      } else {
        console.log(`   ℹ️  Extra slots: Expected ${expectedSlots}, Found ${actualSlots}`);
      }
    } else {
      console.log('   ℹ️  Slot system is disabled for this project');
    }
    
  } catch (error) {
    console.error('❌ Error testing slot creation:', error);
  }
};

const listProjectsWithSlotSystem = async () => {
  try {
    console.log('📋 Projects with Slot System Enabled:\n');
    
    const projects = await Project.find({
      'slotConfiguration.enableSlotSystem': true
    })
    .select('name client slotConfiguration progressTracking')
    .populate('client', 'name')
    .lean();
    
    if (projects.length === 0) {
      console.log('No projects found with slot system enabled');
      return;
    }
    
    for (const project of projects) {
      const slotCount = await Slot.countDocuments({ project: project._id });
      
      console.log(`🎯 ${project.name}`);
      console.log(`   ID: ${project._id}`);
      console.log(`   Client: ${project.client?.name || 'N/A'}`);
      console.log(`   Expected Slots: ${project.slotConfiguration?.totalSlots || 0}`);
      console.log(`   Actual Slots: ${slotCount}`);
      console.log(`   Status: ${slotCount === (project.slotConfiguration?.totalSlots || 0) ? '✅ OK' : '⚠️  Mismatch'}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error listing projects:', error);
  }
};

const main = async () => {
  await connectDB();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'list') {
    await listProjectsWithSlotSystem();
  } else if (command === 'test' && args[1]) {
    await testSlotCreation(args[1]);
  } else {
    console.log('🧪 Slot Creation Test Script');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Usage:');
    console.log('   node scripts/test-slot-creation.js list                    # List all projects with slot system');
    console.log('   node scripts/test-slot-creation.js test <project-id>      # Test specific project');
    console.log('');
    console.log('💡 Examples:');
    console.log('   node scripts/test-slot-creation.js list');
    console.log('   node scripts/test-slot-creation.js test 507f1f77bcf86cd799439011');
    console.log('');
    console.log('🔍 This script helps diagnose slot creation issues by:');
    console.log('   • Showing project slot configuration');
    console.log('   • Listing existing slots');
    console.log('   • Comparing expected vs actual slot counts');
    console.log('   • Identifying configuration mismatches');
  }
  
  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
};

main().catch(console.error);