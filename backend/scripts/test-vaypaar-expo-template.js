#!/usr/bin/env node

import dotenv from 'dotenv';
import emailService from '../src/services/emailService.js';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Vaypaar Expo 2.0 Template...\n');

async function testVaypaarExpoTemplate() {
  try {
    // Test template generation
    console.log('1. Testing Vaypaar Expo 2.0 template generation...');
    const template = emailService.generateVaypaarExpo2Template();
    
    console.log('✅ Template generated successfully');
    console.log(`   Subject: ${template.subject}`);
    console.log(`   HTML length: ${template.html.length} characters`);
    console.log(`   Text length: ${template.text.length} characters\n`);

    // Test personalization
    console.log('2. Testing email personalization...');
    const sampleRecipient = {
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Sample Company',
      phone: '+91-9876543210',
      service: ['Digital Marketing', 'Web Development'],
      budget: '50k to 80k /Month',
      source: 'Vaypaar Expo 2.0',
    };

    const personalizedEmail = emailService.personalizeEmail(template, sampleRecipient);
    
    console.log('✅ Email personalization successful');
    console.log(`   Personalized subject: ${personalizedEmail.subject}`);
    
    // Check if placeholders are replaced
    const hasPlaceholders = personalizedEmail.html.includes('{{name}}') || personalizedEmail.html.includes('{{Name}}');
    if (!hasPlaceholders) {
      console.log('✅ Personalization placeholders replaced correctly');
    } else {
      console.log('❌ Some placeholders were not replaced');
    }

    // Test email service connection
    console.log('\n3. Testing email service connection...');
    const connectionTest = await emailService.testConnection();
    
    if (connectionTest.success) {
      console.log('✅ Email service connection successful');
    } else {
      console.log('❌ Email service connection failed:', connectionTest.error);
    }

    // If email is provided as argument, send test email
    const testEmail = process.argv[2];
    if (testEmail) {
      console.log(`\n4. Sending test email to ${testEmail}...`);
      
      const emailOptions = {
        to: testEmail,
        subject: personalizedEmail.subject,
        html: personalizedEmail.html,
        text: personalizedEmail.text,
      };

      const result = await emailService.sendEmail(emailOptions);
      
      if (result.success) {
        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${result.messageId}`);
      } else {
        console.log('❌ Failed to send test email:', result.error);
      }
    } else {
      console.log('\n4. Skipping test email send (no email provided)');
      console.log('   To test email sending, run: node scripts/test-vaypaar-expo-template.js your-email@example.com');
    }

    console.log('\n🎉 Vaypaar Expo 2.0 template test completed!');
    
    console.log('\nNext steps:');
    console.log('1. Test the template in the Lead Management UI');
    console.log('2. Send bulk emails to leads using the new template');
    console.log('3. Monitor email delivery and response rates');

  } catch (error) {
    console.error('❌ Error testing Vaypaar Expo 2.0 template:', error);
  }
}

testVaypaarExpoTemplate();