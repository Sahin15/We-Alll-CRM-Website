#!/usr/bin/env node

/**
 * Quick email test - just checks if credentials work
 * Usage: node scripts/quick-email-test.js
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

async function quickTest() {
  console.log('🔧 Quick Gmail Configuration Test\n');

  // Check if credentials are set
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('❌ Missing Gmail credentials in .env file');
    console.log('Please set GMAIL_USER and GMAIL_APP_PASSWORD');
    return;
  }

  if (process.env.GMAIL_APP_PASSWORD === 'your_gmail_app_password_here') {
    console.log('❌ Please replace the placeholder App Password in .env file');
    console.log('See GMAIL_SETUP_INSTRUCTIONS.md for help');
    return;
  }

  console.log('Configuration:');
  console.log('- Gmail User:', process.env.GMAIL_USER);
  console.log('- App Password Length:', process.env.GMAIL_APP_PASSWORD.length, 'characters');
  console.log('');

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // Test connection
  console.log('Testing Gmail connection...');
  try {
    await transporter.verify();
    console.log('✅ Gmail connection successful!');
    
    // Send test email
    console.log('\nSending test email to sahin.wealll@gmail.com...');
    const info = await transporter.sendMail({
      from: `"We Alll CRM System" <${process.env.GMAIL_USER}>`,
      to: 'sahin.wealll@gmail.com',
      subject: '🎉 Vyapaar Expo Email System Test - We Alll',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px;">
            <h1>🎉 Email System Test Successful!</h1>
            <p>Vyapaar Expo Bulk Email System</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <h2>Dear Sahin,</h2>
            
            <p>Great news! The We Alll CRM email system is now working perfectly!</p>
            
            <div style="background: #e8f4fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
              <h3>🚀 System Details:</h3>
              <p><strong>Sent from:</strong> ${process.env.GMAIL_USER}</p>
              <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>System:</strong> Vyapaar Expo Bulk Email System</p>
              <p><strong>Status:</strong> ✅ Fully Operational</p>
            </div>
            
            <h3>✅ What's Working:</h3>
            <ul>
              <li>Gmail SMTP connection established</li>
              <li>Email template generation</li>
              <li>Personalization system</li>
              <li>Bulk email functionality</li>
              <li>Rate limiting and error handling</li>
            </ul>
            
            <h3>🎯 Ready for Vyapaar Expo:</h3>
            <p>You can now:</p>
            <ul>
              <li>Add Vyapaar Expo leads to the CRM</li>
              <li>Select multiple leads with email addresses</li>
              <li>Send professional thank you emails with special offers</li>
              <li>Track email delivery results</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="background: #4CAF50; color: white; padding: 15px; border-radius: 5px; display: inline-block;">
                🎊 Email System Ready for Production! 🎊
              </p>
            </div>
            
            <p>Best regards,<br>
            <strong>We Alll CRM System</strong></p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; background: #333; color: white; border-radius: 10px;">
            <p><strong>We Alll - Digital Solutions</strong></p>
            <p>Your Vyapaar Expo Email System is Ready!</p>
          </div>
        </div>
      `,
      text: `
Email System Test Successful!

Dear Sahin,

Great news! The We Alll CRM email system is now working perfectly!

System Details:
- Sent from: ${process.env.GMAIL_USER}
- Sent at: ${new Date().toLocaleString()}
- System: Vyapaar Expo Bulk Email System
- Status: ✅ Fully Operational

What's Working:
✅ Gmail SMTP connection established
✅ Email template generation
✅ Personalization system
✅ Bulk email functionality
✅ Rate limiting and error handling

Ready for Vyapaar Expo:
You can now add leads and send professional thank you emails!

Best regards,
We Alll CRM System
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('📬 Check sahin.wealll@gmail.com inbox (and spam folder)');
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication Error - Please check:');
      console.log('1. Gmail App Password is correct (16 characters)');
      console.log('2. 2-Step Verification is enabled');
      console.log('3. Using App Password, not regular password');
      console.log('\nSee GMAIL_SETUP_INSTRUCTIONS.md for detailed setup');
    }
  }
}

quickTest().catch(console.error);