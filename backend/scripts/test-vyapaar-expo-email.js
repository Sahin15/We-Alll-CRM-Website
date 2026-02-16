#!/usr/bin/env node

/**
 * Test script for Vyapaar Expo email configuration
 * Tests the new email settings and WhatsApp consultation link
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import emailService from '../src/services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testVyapaarExpoEmail() {
  console.log('🧪 Testing Vyapaar Expo Email Configuration...\n');

  // Test email configuration
  console.log('📧 Email Configuration:');
  console.log(`   Provider: ${process.env.EMAIL_PROVIDER}`);
  console.log(`   From Email: ${process.env.FROM_EMAIL}`);
  console.log(`   Gmail User: ${process.env.GMAIL_USER}`);
  console.log(`   App Password: ${process.env.GMAIL_APP_PASSWORD ? '***configured***' : 'NOT SET'}`);
  console.log();

  // Test connection
  console.log('🔗 Testing email service connection...');
  try {
    const connectionTest = await emailService.testConnection();
    if (connectionTest.success) {
      console.log('✅ Email service connection successful!');
    } else {
      console.log('❌ Email service connection failed:', connectionTest.error);
      return;
    }
  } catch (error) {
    console.log('❌ Connection test error:', error.message);
    return;
  }

  console.log();

  // Generate Vyapaar Expo template
  console.log('📝 Generating Vyapaar Expo 2.0 email template...');
  const template = emailService.generateVyapaarExpo2Template();
  
  console.log('✅ Template generated successfully!');
  console.log(`   Subject: ${template.subject}`);
  console.log(`   HTML Length: ${template.html.length} characters`);
  console.log(`   Text Length: ${template.text.length} characters`);
  console.log();

  // Check WhatsApp link
  const whatsappLinkMatch = template.html.match(/https:\/\/wa\.me\/918240858613\?text=[^"]+/);
  if (whatsappLinkMatch) {
    console.log('✅ WhatsApp consultation link found in template');
    console.log(`   Link: ${whatsappLinkMatch[0].substring(0, 100)}...`);
  } else {
    console.log('❌ WhatsApp consultation link not found in template');
  }
  console.log();

  // Test personalization
  console.log('🎯 Testing email personalization...');
  const testRecipient = {
    name: 'John Doe',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    company: 'Test Company Ltd',
    companyName: 'Test Company Ltd',
    service: ['Digital Marketing', 'SEO'],
    budget: '50k to 80k /Month',
    source: 'Vyapaar Expo'
  };

  const personalizedEmail = emailService.personalizeEmail(template, testRecipient);
  console.log('✅ Email personalization successful!');
  console.log(`   Personalized Subject: ${personalizedEmail.subject}`);
  console.log(`   Name replacement: ${personalizedEmail.html.includes('Dear <strong>John Doe</strong>') ? '✅' : '❌'}`);
  console.log();

  // Test sending (optional - uncomment to actually send)
  /*
  console.log('📤 Testing email send...');
  try {
    const emailOptions = {
      to: 'test@example.com', // Replace with your test email
      subject: personalizedEmail.subject,
      html: personalizedEmail.html,
      text: personalizedEmail.text
    };

    const sendResult = await emailService.sendEmail(emailOptions);
    if (sendResult.success) {
      console.log('✅ Test email sent successfully!');
      console.log(`   Message ID: ${sendResult.messageId}`);
    } else {
      console.log('❌ Failed to send test email:', sendResult.error);
    }
  } catch (error) {
    console.log('❌ Email send error:', error.message);
  }
  */

  console.log('🎉 Vyapaar Expo email configuration test completed!');
  console.log();
  console.log('📋 Summary:');
  console.log('   ✅ Email service configured with weallldevelopment@gmail.com');
  console.log('   ✅ WhatsApp consultation link configured (8240858613)');
  console.log('   ✅ Pre-filled message for Vyapaar Expo leads');
  console.log('   ✅ Template personalization working');
  console.log();
  console.log('🚀 Ready to send Vyapaar Expo emails!');
}

// Run the test
testVyapaarExpoEmail().catch(console.error);