#!/usr/bin/env node

/**
 * Create Slots for Project Script
 * Manually creates slots for a project with slot system enabled
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';
import User from '../src/models/userModel.js';
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

const createSlotsForProject = async (projectId, forceCreate = false) => {
  try {
    console.log(`🎰 Creating slots for project: ${projectId}\n`);
    
    // Get project details
    const project = await Project.findById(projectId)
      .populate('client', 'name')
      .populate('createdBy', 'name');
    
    if (!project) {
      console.log('❌ Project not found');
      return;
    }
    
    console.log('📋 Project Information:');
    console.log(`   Name: ${project.name}`);
    console.log(`   Client: ${project.client?.name || 'N/A'}`);
    console.log(`   Created By: ${project.createdBy?.name || 'N/A'}`);
    
    // Check slot configuration
    const slotConfig = project.slotConfiguration;
    if (!slotConfig || !slotConfig.enableSlotSystem) {
      console.log('❌ Slot system is not enabled for this project');
      return;
    }
    
    console.log('\n🎰 Slot Configuration:');
    console.log(`   Total Slots: ${slotConfig.totalSlots}`);
    console.log(`   Slot Type: ${slotConfig.slotType || 'generic'}`);
    console.log(`   Auto Create: ${slotConfig.autoCreateSlots}`);
    
    // Check existing slots
    const existingSlots = await Slot.countDocuments({ project: projectId });
    console.log(`\n📊 Existing Slots: ${existingSlots}`);
    
    const slotsNeeded = slotConfig.totalSlots - existingSlots;
    
    if (slotsNeeded <= 0 && !forceCreate) {
      console.log('✅ Project already has sufficient slots');
      return;
    }
    
    if (slotsNeeded <= 0 && forceCreate) {
      console.log('⚠️  Project already has sufficient slots, but force create is enabled');
    }
    
    // Import slot management service
    const slotManagementService = (await import('../src/services/slotManagementService.js')).default;
    
    const slotsToCreate = forceCreate ? slotConfig.totalSlots : slotsNeeded;
    const startingSlotNumber = forceCreate ? 1 : existingSlots + 1;
    
    console.log(`\n🚀 Creating ${slotsToCreate} slots starting from slot ${startingSlotNumber}...`);
    
    const result = await slotManagementService.createSlotsForProject(projectId, {
      count: slotsToCreate,
      startingSlotNumber: startingSlotNumber,
      slotType: slotConfig.slotType || 'generic',
      createdBy: project.createdBy._id
    });
    
    console.log(`✅ Successfully created ${result.created.length} slots!`);
    
    // Update progress tracking
    project.progressTracking.totalSlots = slotConfig.totalSlots;
    project.progressTracking.calculationMethod = 'slot-based';
    await project.save();
    
    console.log('✅ Updated project progress tracking');
    
    // Show created slots
    if (result.created.length > 0) {
      console.log('\n📋 Created Slots:');
      result.created.forEach((slot, index) => {
        console.log(`   ${index + 1}. Slot ${slot.slotNumber}: ${slot.title}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating slots:', error);
  }
};

const main = async () => {
  await connectDB();
  
  const args = process.argv.slice(2);
  const projectId = args[0];
  const forceCreate = args.includes('--force');
  
  if (!projectId) {
    console.log('🎰 Create Slots for Project Script');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Usage:');
    console.log('   node scripts/create-slots-for-project.js <project-id> [--force]');
    console.log('');
    console.log('💡 Examples:');
    console.log('   node scripts/create-slots-for-project.js 507f1f77bcf86cd799439011');
    console.log('   node scripts/create-slots-for-project.js 507f1f77bcf86cd799439011 --force');
    console.log('');
    console.log('🔍 Options:');
    console.log('   --force    Recreate all slots even if they already exist');
    console.log('');
    console.log('⚠️  Note: This script creates actual slots in the database!');
    process.exit(0);
  }
  
  await createSlotsForProject(projectId, forceCreate);
  
  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
};

main().catch(console.error);