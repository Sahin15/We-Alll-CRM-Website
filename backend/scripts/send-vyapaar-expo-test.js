#!/usr/bin/env node

/**
 * Send a test Vyapaar Expo email
 * Use this to test the actual email sending with WhatsApp consultation link
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import emailService from '../src/services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function sendVyapaarExpoTest() {
  console.log('📧 Sending Vyapaar Expo Test Email...\n');

  // Test recipient (replace with your email for testing)
  const testRecipient = {
    name: 'Test User',
    fullName: 'Test User',
    email: 'sahinmondal.wealll@gmail.com', // Replace with your test email
    company: 'Test Company Pvt Ltd',
    companyName: 'Test Company Pvt Ltd',
    service: ['Digital Marketing', 'SEO'],
    budget: '50k to 80k /Month',
    source: 'Vyapaar Expo'
  };

  try {
    // Generate template
    console.log('📝 Generating Vyapaar Expo 2.0 template...');
    const template = emailService.generateVyapaarExpo2Template();
    
    // Personalize email
    console.log('🎯 Personalizing email content...');
    const personalizedEmail = emailService.personalizeEmail(template, testRecipient);
    
    // Send email
    console.log(`📤 Sending test email to ${testRecipient.email}...`);
    const emailOptions = {
      to: testRecipient.email,
      subject: personalizedEmail.subject,
      html: personalizedEmail.html,
      text: personalizedEmail.text
    };

    const result = await emailService.sendEmail(emailOptions);
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Recipient: ${testRecipient.email}`);
      console.log(`   Subject: ${personalizedEmail.subject}`);
      console.log();
      console.log('📱 WhatsApp Consultation Link:');
      console.log('   Number: +91 8240858613');
      console.log('   Message: "Hello Team WeAlll,\\n\\nI met you at Vyapaar Expo 2.0 and would like to book a free consultation to discuss digital marketing and business growth solutions.Looking forward to connecting.\\n\\nThank you!"');
      console.log();
      console.log('🎉 Test completed! Check your email inbox.');
    } else {
      console.log('❌ Failed to send test email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
  }
}

// Run the test
sendVyapaarExpoTest().catch(console.error);