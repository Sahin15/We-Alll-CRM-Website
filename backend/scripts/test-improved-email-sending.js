#!/usr/bin/env node

/**
 * Test Improved Email Sending
 * 
 * This script tests the improved email sending with better rate limiting
 */

import emailService from '../src/services/emailService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

console.log('📧 Testing Improved Email Sending');
console.log('=====================================\n');

async function testImprovedEmailSending() {
  console.log('🧪 Testing Improved Rate Limiting...');
  
  // Create test recipients (simulate real campaign)
  const recipients = [
    {
      id: 'test_1',
      name: 'Test User 1',
      email: 'test1@example.com',
      company: 'Test Company 1',
      phone: '+91-9876543210',
      service: ['Digital Marketing'],
      budget: '20k to 50k /Month',
      source: 'Test Campaign'
    },
    {
      id: 'test_2', 
      name: 'Test User 2',
      email: 'test2@example.com',
      company: 'Test Company 2',
      phone: '+91-9876543211',
      service: ['Web Development'],
      budget: '50k to 80k /Month',
      source: 'Test Campaign'
    },
    {
      id: 'test_3',
      name: 'Test User 3', 
      email: 'test3@example.com',
      company: 'Test Company 3',
      phone: '+91-9876543212',
      service: ['SEO'],
      budget: '80k to 100k /Month',
      source: 'Test Campaign'
    }
  ];

  const testTemplate = {
    subject: 'Test Email - Improved Rate Limiting',
    html: `
      <h2>Test Email Campaign</h2>
      <p>Hello {{name}},</p>
      <p>This is a test email to validate our improved rate limiting system.</p>
      <p><strong>Company:</strong> {{company}}</p>
      <p><strong>Service Interest:</strong> {{service}}</p>
      <p><strong>Budget Range:</strong> {{budget}}</p>
      <p>Sent at: ${new Date().toISOString()}</p>
      <hr>
      <p><small>This is a test email - no action required.</small></p>
    `,
    text: `
Test Email Campaign

Hello {{name}},

This is a test email to validate our improved rate limiting system.

Company: {{company}}
Service Interest: {{service}}
Budget Range: {{budget}}

Sent at: ${new Date().toISOString()}

This is a test email - no action required.
    `
  };

  console.log('📊 Test Configuration:');
  console.log(`   Recipients: ${recipients.length}`);
  console.log(`   Batch Size: 3 emails`);
  console.log(`   Batch Delay: 5000ms (5 seconds)`);
  console.log(`   Email Delay: 1500ms (1.5 seconds)`);
  console.log(`   Expected Duration: ~15 seconds`);
  console.log(`   Expected Success Rate: 100%\n`);

  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting test campaign...\n');
    
    const result = await emailService.sendBulkEmailsWithTracking(recipients, testTemplate, {
      batchSize: 3,
      delay: 5000,
      emailDelay: 1500,
      batchId: `test_${Date.now()}`
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('\n📈 TEST RESULTS:');
    console.log('=====================================');
    console.log(`✅ Total Emails: ${result.total}`);
    console.log(`✅ Successfully Sent: ${result.sent}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`📊 Success Rate: ${result.successRate}%`);
    console.log(`⏱️ Duration: ${duration.toFixed(1)} seconds`);
    console.log(`🚀 Sending Rate: ${(result.sent / duration * 60).toFixed(1)} emails/minute`);
    
    if (result.rateLimitFailures > 0) {
      console.log(`⚠️ Rate Limit Errors: ${result.rateLimitFailures}`);
    }

    // Analyze results
    console.log('\n🔍 DETAILED ANALYSIS:');
    console.log('=====================================');
    
    if (result.successRate >= 95) {
      console.log('🎉 EXCELLENT: Success rate is optimal (≥95%)');
    } else if (result.successRate >= 80) {
      console.log('✅ GOOD: Success rate is acceptable (≥80%)');
    } else {
      console.log('⚠️ NEEDS IMPROVEMENT: Success rate below 80%');
    }

    const emailsPerMinute = result.sent / duration * 60;
    if (emailsPerMinute <= 20) {
      console.log('✅ RATE LIMITING: Sending rate is conservative and safe');
    } else if (emailsPerMinute <= 50) {
      console.log('⚠️ RATE LIMITING: Sending rate is moderate - monitor for issues');
    } else {
      console.log('🚨 RATE LIMITING: Sending rate may be too aggressive');
    }

    // Show individual results
    if (result.failed > 0) {
      console.log('\n❌ FAILED EMAILS:');
      result.results.filter(r => !r.success).forEach(failure => {
        console.log(`   ${failure.recipient}: ${failure.error}`);
      });
    }

    return result;

  } catch (error) {
    console.log('\n❌ TEST FAILED:');
    console.log(`Error: ${error.message}`);
    return null;
  }
}

async function simulateLargerCampaign() {
  console.log('\n📊 SIMULATING LARGER CAMPAIGN (25 emails)');
  console.log('=====================================');
  
  const batchSize = 3;
  const batchDelay = 5000;
  const emailDelay = 1500;
  const totalEmails = 25;
  
  const totalBatches = Math.ceil(totalEmails / batchSize);
  const timePerBatch = (batchSize * emailDelay) + batchDelay;
  const estimatedTime = (totalBatches * timePerBatch) / 1000;
  const emailsPerMinute = (totalEmails / estimatedTime) * 60;
  
  console.log(`📧 Total Emails: ${totalEmails}`);
  console.log(`📦 Batches: ${totalBatches} (${batchSize} emails each)`);
  console.log(`⏱️ Estimated Time: ${estimatedTime.toFixed(1)} seconds`);
  console.log(`🚀 Estimated Rate: ${emailsPerMinute.toFixed(1)} emails/minute`);
  
  // Gmail limits check
  const gmailLimits = {
    perMinute: 100,
    burst: 20,
    recommended: 30
  };
  
  console.log('\n📋 Gmail Limits Compliance:');
  console.log(`   Gmail Limit: ~${gmailLimits.perMinute} emails/minute`);
  console.log(`   Our Rate: ${emailsPerMinute.toFixed(1)} emails/minute`);
  
  if (emailsPerMinute <= gmailLimits.recommended) {
    console.log('   ✅ SAFE: Well within recommended limits');
  } else if (emailsPerMinute <= gmailLimits.perMinute) {
    console.log('   ⚠️ CAUTION: Within limits but monitor closely');
  } else {
    console.log('   🚨 RISK: Exceeds Gmail limits - reduce rate');
  }
}

async function runTests() {
  console.log('🚀 Starting Email Rate Limiting Tests...\n');
  
  // Test 1: Email Configuration
  try {
    const configTest = await emailService.testConnection();
    if (!configTest.success) {
      console.log('❌ Email configuration failed. Cannot proceed with tests.');
      return;
    }
    console.log('✅ Email configuration verified\n');
  } catch (error) {
    console.log('❌ Email configuration error:', error.message);
    return;
  }
  
  // Test 2: Small batch test (3 emails)
  console.log('📧 TEST 1: Small Batch (3 emails)');
  console.log('=====================================');
  const result = await testImprovedEmailSending();
  
  if (!result) {
    console.log('❌ Small batch test failed. Check configuration.');
    return;
  }
  
  // Test 3: Simulate larger campaign
  await simulateLargerCampaign();
  
  // Final recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('=====================================');
  
  if (result.successRate >= 95) {
    console.log('✅ Current settings are optimal');
    console.log('✅ Safe to use for campaigns up to 50 emails');
    console.log('✅ For larger campaigns, consider splitting into sessions');
  } else {
    console.log('⚠️ Consider further reducing batch size to 2 emails');
    console.log('⚠️ Increase batch delay to 8-10 seconds');
    console.log('⚠️ Monitor Gmail account for warnings');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('   1. Deploy improved settings to production');
  console.log('   2. Test with real campaign (5-10 emails)');
  console.log('   3. Monitor success rates and adjust if needed');
  console.log('   4. Consider upgrading to SendGrid for large campaigns');
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
});