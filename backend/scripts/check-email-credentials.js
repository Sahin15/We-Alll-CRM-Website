#!/usr/bin/env node

/**
 * Email Credentials Check Script
 * 
 * This script checks if email credentials are properly loaded and configured
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config({ path: './backend/.env' });

console.log('🔐 Email Credentials Check');
console.log('=====================================\n');

function checkEnvironmentVariables() {
  console.log('📋 Environment Variables:');
  console.log(`   EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'NOT SET'}`);
  console.log(`   GMAIL_USER: ${process.env.GMAIL_USER || 'NOT SET'}`);
  console.log(`   GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '***HIDDEN***' : 'NOT SET'}`);
  console.log(`   FROM_EMAIL: ${process.env.FROM_EMAIL || 'NOT SET'}`);
  console.log(`   COMPANY_NAME: ${process.env.COMPANY_NAME || 'NOT SET'}\n`);

  const missing = [];
  if (!process.env.EMAIL_PROVIDER) missing.push('EMAIL_PROVIDER');
  if (!process.env.GMAIL_USER) missing.push('GMAIL_USER');
  if (!process.env.GMAIL_APP_PASSWORD) missing.push('GMAIL_APP_PASSWORD');
  if (!process.env.FROM_EMAIL) missing.push('FROM_EMAIL');

  if (missing.length > 0) {
    console.log('❌ Missing environment variables:', missing.join(', '));
    return false;
  } else {
    console.log('✅ All required environment variables are set');
    return true;
  }
}

async function testGmailConnection() {
  console.log('\n🧪 Testing Gmail Connection...');
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    console.log('📧 Transporter created successfully');
    
    // Test connection
    await transporter.verify();
    console.log('✅ Gmail connection verified successfully');
    return true;
    
  } catch (error) {
    console.log('❌ Gmail connection failed:', error.message);
    console.log('Error code:', error.code);
    
    // Provide specific error guidance
    if (error.code === 'EAUTH') {
      console.log('\n💡 AUTHENTICATION ERROR SOLUTIONS:');
      console.log('   1. Check if Gmail App Password is correct');
      console.log('   2. Ensure 2-Factor Authentication is enabled');
      console.log('   3. Generate a new App Password from Gmail settings');
      console.log('   4. Remove spaces from App Password');
      console.log('   5. Check if Gmail account is not locked');
    }
    
    return false;
  }
}

async function testAlternativeConfiguration() {
  console.log('\n🔄 Testing Alternative Gmail Configuration...');
  
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.verify();
    console.log('✅ Alternative Gmail configuration works');
    return true;
    
  } catch (error) {
    console.log('❌ Alternative configuration also failed:', error.message);
    return false;
  }
}

function provideCredentialSolutions() {
  console.log('\n🛠️ EMAIL CREDENTIAL SOLUTIONS:');
  console.log('=====================================');
  
  console.log('\n1. 🔑 GMAIL APP PASSWORD SETUP:');
  console.log('   • Go to Google Account settings');
  console.log('   • Enable 2-Factor Authentication');
  console.log('   • Go to Security > App passwords');
  console.log('   • Generate new app password for "Mail"');
  console.log('   • Use the 16-character password (no spaces)');
  
  console.log('\n2. 📧 ENVIRONMENT VARIABLES:');
  console.log('   • GMAIL_USER=your-email@gmail.com');
  console.log('   • GMAIL_APP_PASSWORD=abcdefghijklmnop (16 chars, no spaces)');
  console.log('   • FROM_EMAIL=your-email@gmail.com');
  
  console.log('\n3. 🔒 SECURITY CHECKLIST:');
  console.log('   • Gmail account not locked/suspended');
  console.log('   • 2FA enabled on Gmail account');
  console.log('   • App password generated recently');
  console.log('   • No special characters in password');
  
  console.log('\n4. 🚀 ALTERNATIVE EMAIL SERVICES:');
  console.log('   • SendGrid (99,000 emails/month free)');
  console.log('   • Mailgun (10,000 emails/month free)');
  console.log('   • Amazon SES (very high limits)');
  console.log('   • Brevo (300 emails/day free)');
}

async function runCredentialCheck() {
  console.log('🚀 Starting Email Credential Check...\n');
  
  // Check 1: Environment Variables
  const envOk = checkEnvironmentVariables();
  if (!envOk) {
    console.log('\n❌ Environment variables missing. Fix .env file first.');
    provideCredentialSolutions();
    return;
  }
  
  // Check 2: Gmail Connection
  const gmailOk = await testGmailConnection();
  if (!gmailOk) {
    // Check 3: Alternative Configuration
    const altOk = await testAlternativeConfiguration();
    if (!altOk) {
      provideCredentialSolutions();
      return;
    }
  }
  
  console.log('\n📋 CREDENTIAL CHECK SUMMARY:');
  console.log('=====================================');
  console.log('✅ Environment variables: OK');
  console.log('✅ Gmail connection: OK');
  console.log('✅ Email service ready for bulk sending');
  
  console.log('\n💡 NEXT STEPS:');
  console.log('   1. Test bulk email sending with small batch');
  console.log('   2. Monitor for rate limiting issues');
  console.log('   3. Implement recommended rate limiting settings');
}

// Run the credential check
runCredentialCheck().catch(error => {
  console.error('💥 Credential check failed:', error);
});