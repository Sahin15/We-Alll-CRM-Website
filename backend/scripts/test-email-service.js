#!/usr/bin/env node

/**
 * Test script for email service functionality
 * Usage: node scripts/test-email-service.js
 */

import dotenv from 'dotenv';
import emailService from '../src/services/emailService.js';

// Load environment variables
dotenv.config();

async function testEmailService() {
  console.log('🧪 Testing Email Service Configuration...\n');

  // Test 1: Check configuration
  console.log('1. Testing email service connection...');
  const connectionTest = await emailService.testConnection();
  
  if (connectionTest.success) {
    console.log('✅ Email service connection successful');
  } else {
    console.log('❌ Email service connection failed:', connectionTest.error);
    return;
  }

  // Test 2: Generate template
  console.log('\n2. Testing Vyapaar Expo template generation...');
  try {
    const template = emailService.generateVyapaarExpoTemplate();
    console.log('✅ Template generated successfully');
    console.log('   Subject:', template.subject);
    console.log('   HTML length:', template.html.length, 'characters');
    console.log('   Text length:', template.text.length, 'characters');
  } catch (error) {
    console.log('❌ Template generation failed:', error.message);
    return;
  }

  // Test 3: Personalize email
  console.log('\n3. Testing email personalization...');
  try {
    const template = emailService.generateVyapaarExpoTemplate();
    const sampleRecipient = {
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Sample Company',
      phone: '+91-9876543210',
      service: ['Digital Marketing', 'Web Development'],
      budget: '50k to 80k /Month',
      source: 'Vyapaar Expo',
    };

    const personalizedEmail = emailService.personalizeEmail(template, sampleRecipient);
    console.log('✅ Email personalization successful');
    console.log('   Personalized subject:', personalizedEmail.subject);
    
    // Check if personalization worked
    if (personalizedEmail.html.includes('John Doe') && 
        personalizedEmail.html.includes('Sample Company')) {
      console.log('✅ Personalization placeholders replaced correctly');
    } else {
      console.log('⚠️  Personalization may not be working correctly');
    }
  } catch (error) {
    console.log('❌ Email personalization failed:', error.message);
    return;
  }

  // Test 4: Send test email (optional)
  const testEmail = process.argv[2];
  if (testEmail && testEmail.includes('@')) {
    console.log(`\n4. Sending test email to ${testEmail}...`);
    try {
      const template = emailService.generateVyapaarExpoTemplate();
      const sampleRecipient = {
        name: 'Test User',
        email: testEmail,
        company: 'Test Company',
        phone: '+91-9876543210',
        service: ['Digital Marketing'],
        budget: '50k to 80k /Month',
        source: 'Vyapaar Expo',
      };

      const personalizedEmail = emailService.personalizeEmail(template, sampleRecipient);
      
      const result = await emailService.sendEmail({
        to: testEmail,
        subject: personalizedEmail.subject,
        html: personalizedEmail.html,
        text: personalizedEmail.text,
      });

      if (result.success) {
        console.log('✅ Test email sent successfully');
        console.log('   Message ID:', result.messageId);
      } else {
        console.log('❌ Test email failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Test email failed:', error.message);
    }
  } else {
    console.log('\n4. Skipping test email send (no email provided)');
    console.log('   To test email sending, run: node scripts/test-email-service.js your-email@example.com');
  }

  console.log('\n🎉 Email service test completed!');
  console.log('\nNext steps:');
  console.log('1. Configure your email credentials in .env file');
  console.log('2. Test with a real email address');
  console.log('3. Use the bulk email feature in Lead Management');
}

// Run the test
testEmailService().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});