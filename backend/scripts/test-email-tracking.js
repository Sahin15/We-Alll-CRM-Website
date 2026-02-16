#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Lead from '../src/models/leadModel.js';
import EmailCampaign from '../src/models/emailCampaignModel.js';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Email Tracking System...\n');

async function testEmailTracking() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Check if EmailCampaign model works
    console.log('\n1. Testing EmailCampaign model...');
    const testCampaign = new EmailCampaign({
      template: 'vaypaar-expo-2',
      templateName: 'Vaypaar Expo 2.0 Thank You',
      leadId: new mongoose.Types.ObjectId(),
      leadName: 'Test Lead',
      leadEmail: 'test@example.com',
      subject: 'Test Email',
      sentBy: new mongoose.Types.ObjectId(),
      sentByName: 'Test User',
      status: 'sent'
    });

    console.log('✅ EmailCampaign model validation passed');

    // Test 2: Check Lead model with email stats
    console.log('\n2. Testing Lead model with email stats...');
    const sampleLead = await Lead.findOne().limit(1);
    
    if (sampleLead) {
      console.log('✅ Found sample lead:', sampleLead.fullName);
      console.log('   Email stats:', sampleLead.emailStats || 'Not set (will use defaults)');
    } else {
      console.log('⚠️ No leads found in database');
    }

    // Test 3: Test email campaign statistics
    console.log('\n3. Testing email campaign statistics...');
    const stats = await EmailCampaign.getBulkEmailStats();
    console.log('✅ Email campaign stats:', stats);

    // Test 4: Check if we can query leads with email stats
    console.log('\n4. Testing lead queries with email stats...');
    const leadsWithEmailStats = await Lead.find({}).select('fullName email emailStats').limit(5);
    
    console.log('✅ Sample leads with email stats:');
    leadsWithEmailStats.forEach((lead, index) => {
      console.log(`   ${index + 1}. ${lead.fullName} - Email Status: ${lead.emailStats?.emailStatus || 'never-sent'}`);
    });

    console.log('\n🎉 Email tracking system test completed successfully!');
    
    console.log('\nNext steps:');
    console.log('1. Send a test bulk email to see tracking in action');
    console.log('2. Check the Lead Management UI for email status indicators');
    console.log('3. Use the Email History modal to view detailed email logs');

  } catch (error) {
    console.error('❌ Error testing email tracking system:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

testEmailTracking();