#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Lead from '../src/models/leadModel.js';
import EmailCampaign from '../src/models/emailCampaignModel.js';

// Load environment variables
dotenv.config();

console.log('🧪 Testing UI Improvements for Email Tracking...\n');

async function testUIImprovements() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find leads with email stats
    const leadsWithEmails = await Lead.find({
      'emailStats.totalEmailsSent': { $gt: 0 }
    }).limit(3);

    console.log(`\n📊 Found ${leadsWithEmails.length} leads with email history:`);
    
    for (const lead of leadsWithEmails) {
      console.log(`\n👤 ${lead.fullName} (${lead.email})`);
      console.log(`   📧 Email Status: ${lead.emailStats.emailStatus}`);
      console.log(`   📈 Total Emails: ${lead.emailStats.totalEmailsSent}`);
      console.log(`   📅 Last Email: ${lead.emailStats.lastEmailSentAt ? 
        lead.emailStats.lastEmailSentAt.toLocaleDateString() : 'Never'}`);
      console.log(`   🎯 Template: ${lead.emailStats.lastEmailTemplate || 'N/A'}`);
      
      // Get email history for this lead
      const emailHistory = await EmailCampaign.find({ leadId: lead._id })
        .sort({ sentAt: -1 })
        .limit(3);
      
      if (emailHistory.length > 0) {
        console.log(`   📋 Recent Email History:`);
        emailHistory.forEach((email, index) => {
          console.log(`      ${index + 1}. ${email.templateName} - ${email.status} - ${email.sentAt.toLocaleDateString()}`);
        });
      }
    }

    // Test email statistics aggregation
    console.log('\n📈 Testing Email Statistics...');
    const totalStats = await EmailCampaign.getBulkEmailStats();
    console.log('   Overall Email Stats:', totalStats);

    // Test lead queries for table view
    console.log('\n🔍 Testing Lead Queries for Table View...');
    const allLeads = await Lead.find({}).select('fullName email emailStats').limit(5);
    
    console.log('   Sample leads for table view:');
    allLeads.forEach((lead, index) => {
      const emailStatus = lead.emailStats?.emailStatus || 'never-sent';
      const emailCount = lead.emailStats?.totalEmailsSent || 0;
      const statusDisplay = emailStatus === 'sent' ? `✅ ${emailCount} Sent` : 
                           emailStatus === 'failed' ? '❌ Failed' : '✉️ No';
      
      console.log(`   ${index + 1}. ${lead.fullName} - Email: ${statusDisplay}`);
    });

    console.log('\n🎉 UI Improvements test completed successfully!');
    
    console.log('\n🚀 What to test in the UI:');
    console.log('1. Table View:');
    console.log('   - Click on any row to navigate to lead details');
    console.log('   - Check simplified email status column (Yes/No/Failed)');
    console.log('   - Hover over email badges for tooltips');
    console.log('   - Use Edit and History buttons');
    
    console.log('\n2. Lead Details Page:');
    console.log('   - View email statistics cards');
    console.log('   - Check email success rate progress bar');
    console.log('   - Browse detailed email history table');
    console.log('   - Test "Show All" functionality for email history');
    
    console.log('\n3. Mobile Responsiveness:');
    console.log('   - Test on mobile devices');
    console.log('   - Check card view email badges');
    console.log('   - Verify responsive email history');

  } catch (error) {
    console.error('❌ Error testing UI improvements:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

testUIImprovements();