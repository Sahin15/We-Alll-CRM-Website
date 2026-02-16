#!/usr/bin/env node

/**
 * Check Gmail Sending Limit Status
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('\n📊 Gmail Sending Limit Checker');
console.log('=====================================\n');

async function checkGmailLimit() {
  try {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.log('❌ Gmail credentials not configured');
      console.log('   Set GMAIL_USER and GMAIL_APP_PASSWORD in .env\n');
      return;
    }

    console.log('📧 Gmail Account:', gmailUser);
    console.log('🔑 App Password:', '*'.repeat(gmailPass.length), '\n');

    console.log('🧪 Testing Gmail connection...\n');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    // Test connection
    await transporter.verify();
    console.log('✅ Gmail connection successful!\n');

    console.log('📊 Gmail Sending Limits:');
    console.log('   Account Type: Free Gmail');
    console.log('   Daily Limit: 500 emails');
    console.log('   Hourly Limit: ~100 emails');
    console.log('   Per Minute: ~20 emails\n');

    console.log('⏰ Limit Reset Time:');
    console.log('   Resets at: Midnight Pacific Time (PST/PDT)');
    console.log('   Approximately: 1:30 PM IST next day\n');

    // Try to send a test email to check if limit is reached
    console.log('🧪 Testing if daily limit is reached...\n');

    try {
      const testResult = await transporter.sendMail({
        from: `"We Alll" <${gmailUser}>`,
        to: gmailUser, // Send to self
        subject: '✅ Gmail Limit Check - Test Email',
        html: '<h2>Gmail is Working!</h2><p>Your daily limit has not been reached yet.</p>',
        text: 'Gmail is Working! Your daily limit has not been reached yet.'
      });

      console.log('✅ Test email sent successfully!');
      console.log(`   Message ID: ${testResult.messageId}\n`);
      
      console.log('📊 Status: LIMIT NOT REACHED');
      console.log('   ✅ You can send emails now');
      console.log('   ✅ Gmail is ready to use\n');

      console.log('💡 Recommendations:');
      console.log('   • You can send up to 500 emails today');
      console.log('   • Space them out (don\'t send all at once)');
      console.log('   • Use rate limiting (5-10 emails per minute)');
      console.log('   • Monitor for limit errors\n');

    } catch (error) {
      if (error.message.includes('Daily user sending limit exceeded') || 
          error.message.includes('limit exceeded')) {
        console.log('❌ DAILY LIMIT EXCEEDED');
        console.log('   Your Gmail account has reached its daily sending limit\n');

        console.log('⏰ When will it reset?');
        console.log('   Gmail limits reset at midnight Pacific Time');
        console.log('   Check back tomorrow to send more emails\n');

        console.log('💡 Solutions:');
        console.log('   1. Wait until tomorrow (FREE)');
        console.log('   2. Use Brevo (already configured, 300 emails/day)');
        console.log('   3. Create additional Gmail accounts');
        console.log('   4. Upgrade to Google Workspace (₹125/month, 2,000/day)\n');

        console.log('🚀 Quick Fix:');
        console.log('   Switch to Brevo now:');
        console.log('   1. Edit backend/.env');
        console.log('   2. Change: EMAIL_PROVIDER=gmail');
        console.log('   3. To: EMAIL_PROVIDER=brevo');
        console.log('   4. Restart server\n');

      } else {
        console.log('❌ Error testing Gmail:', error.message, '\n');
      }
    }

  } catch (error) {
    console.log('❌ Gmail connection failed:', error.message, '\n');
    
    console.log('💡 Possible Issues:');
    console.log('   • Wrong Gmail credentials');
    console.log('   • App password not generated');
    console.log('   • 2-Step Verification not enabled');
    console.log('   • Less secure app access blocked\n');
  }

  console.log('=====================================\n');
}

checkGmailLimit();
