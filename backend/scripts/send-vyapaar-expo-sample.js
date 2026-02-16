#!/usr/bin/env node

/**
 * Send Sample Vyapaar Expo 2.0 Email
 * Tests the new Gmail account with Vyapaar Expo template
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import emailService from '../src/services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('\n📧 Sending Vyapaar Expo 2.0 Sample Email');
console.log('=====================================\n');

async function sendSampleEmail() {
  try {
    const testRecipient = {
      name: 'Test Customer',
      email: 'sahin.wealll@gmail.com', // Change this to your test email
      company: 'Test Company Pvt Ltd',
      phone: '+91 98765 43210',
      service: 'Digital Marketing, SEO',
    };

    console.log('📧 Sending to:', testRecipient.email);
    console.log('👤 Name:', testRecipient.name);
    console.log('🏢 Company:', testRecipient.company, '\n');

    console.log('📝 Generating Vyapaar Expo 2.0 template...');
    const template = emailService.generateVyapaarExpo2Template();
    console.log('✅ Template generated\n');

    console.log('🎨 Personalizing email...');
    const personalizedEmail = emailService.personalizeEmail(template, testRecipient);
    console.log('✅ Email personalized\n');

    console.log('📤 Sending email...');
    const result = await emailService.sendEmail({
      to: testRecipient.email,
      subject: personalizedEmail.subject,
      html: personalizedEmail.html,
      text: personalizedEmail.text,
    });

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${result.messageId}\n`);
      
      console.log('📊 Email Details:');
      console.log(`   From: ${process.env.FROM_EMAIL}`);
      console.log(`   To: ${testRecipient.email}`);
      console.log(`   Subject: ${personalizedEmail.subject}`);
      console.log(`   Provider: ${process.env.EMAIL_PROVIDER}`);
      console.log(`   Account: ${process.env.GMAIL_USER}\n`);
      
      console.log('🎉 Success! Check your inbox for the email.\n');
      
      console.log('📋 Next Steps:');
      console.log('   1. Check email delivery');
      console.log('   2. Verify template looks good');
      console.log('   3. Test WhatsApp link');
      console.log('   4. Ready to send bulk emails!\n');
      
    } else {
      console.log('❌ Email failed to send');
      console.log(`   Error: ${result.error}\n`);
      
      if (result.error.includes('Daily user sending limit exceeded')) {
        console.log('⚠️  Gmail daily limit exceeded');
        console.log('   Wait until tomorrow or use backup account\n');
      }
    }

  } catch (error) {
    console.log('❌ Error:', error.message, '\n');
  }

  console.log('=====================================\n');
}

sendSampleEmail();
