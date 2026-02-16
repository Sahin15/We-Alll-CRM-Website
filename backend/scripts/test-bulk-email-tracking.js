#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Lead from '../src/models/leadModel.js';
import EmailCampaign from '../src/models/emailCampaignModel.js';
import emailService from '../src/services/emailService.js';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Bulk Email Tracking...\n');

async function testBulkEmailTracking() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find a test lead with email
    const testLead = await Lead.findOne({ email: { $exists: true, $ne: null } });
    
    if (!testLead) {
      console.log('❌ No leads with email found. Please add a lead with email first.');
      return;
    }

    console.log(`\n📧 Found test lead: ${testLead.fullName} (${testLead.email})`);
    console.log(`   Current email stats:`, testLead.emailStats || 'None');

    // Simulate bulk email tracking (without actually sending)
    console.log('\n🔄 Simulating email campaign tracking...');

    // Create email campaign record
    const campaignData = {
      campaignName: 'Test Campaign - Email Tracking',
      template: 'vaypaar-expo-2',
      templateName: 'Vaypaar Expo 2.0 Thank You',
      leadId: testLead._id,
      leadName: testLead.fullName,
      leadEmail: testLead.email,
      leadCompany: testLead.companyName,
      subject: 'Test Email - Thank You for Connecting at Vaypaar Expo 2.0',
      emailContent: {
        html: '<p>Test email content</p>',
        text: 'Test email content'
      },
      sentBy: new mongoose.Types.ObjectId(),
      sentByName: 'Test User',
      status: 'sent',
      messageId: 'test-message-id-' + Date.now(),
      batchId: 'test-batch-' + Date.now()
    };

    // Create campaign record
    const campaign = await EmailCampaign.create(campaignData);
    console.log('✅ Created email campaign record:', campaign._id);

    // Update lead email stats
    await Lead.findByIdAndUpdate(testLead._id, {
      $inc: { 'emailStats.totalEmailsSent': 1 },
      $set: {
        'emailStats.lastEmailSentAt': new Date(),
        'emailStats.lastEmailTemplate': 'Vaypaar Expo 2.0 Thank You',
        'emailStats.emailStatus': 'sent'
      }
    });

    console.log('✅ Updated lead email stats');

    // Verify the updates
    const updatedLead = await Lead.findById(testLead._id);
    console.log('\n📊 Updated lead email stats:', updatedLead.emailStats);

    // Get email history for the lead
    const emailHistory = await EmailCampaign.find({ leadId: testLead._id })
      .sort({ sentAt: -1 })
      .limit(5);

    console.log(`\n📧 Email history for ${testLead.fullName}:`);
    emailHistory.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email.templateName} - ${email.status} - ${email.sentAt.toLocaleDateString()}`);
    });

    // Get lead email statistics
    const stats = await EmailCampaign.getLeadEmailStats(testLead._id);
    console.log('\n📈 Lead email statistics:', stats);

    console.log('\n🎉 Email tracking test completed successfully!');
    
    console.log('\nNext steps:');
    console.log('1. Open the Lead Management UI at http://localhost:3001/leads');
    console.log('2. Look for the email status badge on the test lead');
    console.log('3. Click the History button to see the email history modal');
    console.log('4. Send a real bulk email to see live tracking');

  } catch (error) {
    console.error('❌ Error testing bulk email tracking:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

testBulkEmailTracking();