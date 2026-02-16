#!/usr/bin/env node

/**
 * Send test email script
 * Usage: node scripts/send-test-email.js
 */

import dotenv from 'dotenv';
import emailService from '../src/services/emailService.js';

// Load environment variables
dotenv.config();

async function sendTestEmail() {
  console.log('📧 Sending test email from info@gmail.com to sahin.wealll@gmail.com...\n');

  // Check configuration
  console.log('Email Configuration:');
  console.log('- Provider:', process.env.EMAIL_PROVIDER);
  console.log('- From Email:', process.env.FROM_EMAIL);
  console.log('- Gmail User:', process.env.GMAIL_USER);
  console.log('- App Password Set:', process.env.GMAIL_APP_PASSWORD ? 'Yes' : 'No');
  console.log('');

  // Test connection first
  console.log('1. Testing email service connection...');
  const connectionTest = await emailService.testConnection();
  
  if (!connectionTest.success) {
    console.log('❌ Email service connection failed:', connectionTest.error);
    console.log('\n🔧 Setup Instructions:');
    console.log('1. Go to Google Account settings');
    console.log('2. Enable 2-Step Verification');
    console.log('3. Generate App Password for Mail');
    console.log('4. Update GMAIL_APP_PASSWORD in backend/.env');
    return;
  }
  
  console.log('✅ Email service connection successful');

  // Generate Vyapaar Expo template
  console.log('\n2. Generating Vyapaar Expo email template...');
  const template = emailService.generateVyapaarExpoTemplate();
  
  // Sample recipient data for testing
  const testRecipient = {
    name: 'Sahin Mondal',
    email: 'sahin.wealll@gmail.com',
    company: 'We Alll',
    phone: '+91-9876543210',
    service: ['Digital Marketing', 'Web Development', 'SEO'],
    budget: '50k to 80k /Month',
    source: 'Vyapaar Expo',
  };

  // Personalize the email
  const personalizedEmail = emailService.personalizeEmail(template, testRecipient);
  
  console.log('✅ Email template generated and personalized');
  console.log('   Subject:', personalizedEmail.subject);

  // Send the test email
  console.log('\n3. Sending test email...');
  try {
    const result = await emailService.sendEmail({
      to: 'sahin.wealll@gmail.com',
      subject: personalizedEmail.subject,
      html: personalizedEmail.html,
      text: personalizedEmail.text,
    });

    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('   Message ID:', result.messageId);
      console.log('   From:', process.env.FROM_EMAIL);
      console.log('   To: sahin.wealll@gmail.com');
      console.log('\n📬 Please check the recipient\'s inbox (and spam folder)');
    } else {
      console.log('❌ Test email failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Test email failed with error:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n🔧 Authentication Error - Please check:');
      console.log('1. Gmail username is correct');
      console.log('2. App Password is correct (not regular password)');
      console.log('3. 2-Step Verification is enabled');
    }
  }

  console.log('\n🎉 Test completed!');
}

// Run the test
sendTestEmail().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});