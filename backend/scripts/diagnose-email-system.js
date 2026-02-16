#!/usr/bin/env node

/**
 * Email System Diagnostic Tool
 * Checks current configuration and identifies issues
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('\n🔍 Email System Diagnostic Report');
console.log('=====================================\n');

// Check EMAIL_PROVIDER
const provider = process.env.EMAIL_PROVIDER;
console.log('📧 Email Provider Configuration:');
console.log(`   Current Provider: ${provider || '❌ NOT SET'}`);

if (!provider) {
  console.log('   ⚠️  WARNING: EMAIL_PROVIDER not set in .env\n');
} else {
  console.log(`   ✅ Provider is set to: ${provider}\n`);
}

// Check provider-specific credentials
console.log('🔑 Provider Credentials Check:\n');

if (provider === 'mailgun' || !provider) {
  console.log('   MAILGUN Configuration:');
  const mailgunUser = process.env.MAILGUN_SMTP_USER;
  const mailgunPass = process.env.MAILGUN_SMTP_PASSWORD;
  
  if (mailgunUser) {
    console.log(`   ✅ MAILGUN_SMTP_USER: ${mailgunUser}`);
  } else {
    console.log('   ❌ MAILGUN_SMTP_USER: NOT SET');
  }
  
  if (mailgunPass) {
    console.log(`   ✅ MAILGUN_SMTP_PASSWORD: ${'*'.repeat(mailgunPass.length)} (${mailgunPass.length} chars)`);
  } else {
    console.log('   ❌ MAILGUN_SMTP_PASSWORD: NOT SET');
  }
  
  if (provider === 'mailgun' && (!mailgunUser || !mailgunPass)) {
    console.log('   ⚠️  ERROR: Mailgun selected but credentials missing!\n');
  } else if (provider === 'mailgun') {
    console.log('   ✅ Mailgun credentials configured\n');
  } else {
    console.log('   ℹ️  Mailgun not selected\n');
  }
}

if (provider === 'brevo' || !provider) {
  console.log('   BREVO Configuration:');
  const brevoUser = process.env.BREVO_USER;
  const brevoKey = process.env.BREVO_API_KEY;
  
  if (brevoUser) {
    console.log(`   ✅ BREVO_USER: ${brevoUser}`);
  } else {
    console.log('   ❌ BREVO_USER: NOT SET');
  }
  
  if (brevoKey) {
    console.log(`   ✅ BREVO_API_KEY: ${brevoKey.substring(0, 20)}... (${brevoKey.length} chars)`);
  } else {
    console.log('   ❌ BREVO_API_KEY: NOT SET');
  }
  
  if (provider === 'brevo' && (!brevoUser || !brevoKey)) {
    console.log('   ⚠️  ERROR: Brevo selected but credentials missing!\n');
  } else if (provider === 'brevo') {
    console.log('   ✅ Brevo credentials configured\n');
  } else {
    console.log('   ℹ️  Brevo not selected\n');
  }
}

if (provider === 'gmail' || !provider) {
  console.log('   GMAIL Configuration:');
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  
  if (gmailUser) {
    console.log(`   ✅ GMAIL_USER: ${gmailUser}`);
  } else {
    console.log('   ❌ GMAIL_USER: NOT SET');
  }
  
  if (gmailPass) {
    console.log(`   ✅ GMAIL_APP_PASSWORD: ${'*'.repeat(gmailPass.length)} (${gmailPass.length} chars)`);
  } else {
    console.log('   ❌ GMAIL_APP_PASSWORD: NOT SET');
  }
  
  if (provider === 'gmail' && (!gmailUser || !gmailPass)) {
    console.log('   ⚠️  ERROR: Gmail selected but credentials missing!\n');
  } else if (provider === 'gmail') {
    console.log('   ✅ Gmail credentials configured\n');
  } else {
    console.log('   ℹ️  Gmail not selected\n');
  }
}

// Check common email settings
console.log('⚙️  Common Email Settings:');
const fromEmail = process.env.FROM_EMAIL;
const companyName = process.env.COMPANY_NAME;

if (fromEmail) {
  console.log(`   ✅ FROM_EMAIL: ${fromEmail}`);
} else {
  console.log('   ❌ FROM_EMAIL: NOT SET');
}

if (companyName) {
  console.log(`   ✅ COMPANY_NAME: ${companyName}`);
} else {
  console.log('   ⚠️  COMPANY_NAME: NOT SET (will use default)');
}

console.log('\n');

// Provide recommendations
console.log('💡 Recommendations:\n');

if (!provider) {
  console.log('   ❌ CRITICAL: Set EMAIL_PROVIDER in .env file');
  console.log('      Options: mailgun, brevo, gmail\n');
}

if (provider === 'mailgun' && (!process.env.MAILGUN_SMTP_USER || !process.env.MAILGUN_SMTP_PASSWORD)) {
  console.log('   ❌ CRITICAL: Mailgun selected but credentials missing!');
  console.log('      Run: node scripts/configure-mailgun.js\n');
}

if (provider === 'brevo' && (!process.env.BREVO_USER || !process.env.BREVO_API_KEY)) {
  console.log('   ❌ CRITICAL: Brevo selected but credentials missing!\n');
}

if (provider === 'gmail' && (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)) {
  console.log('   ❌ CRITICAL: Gmail selected but credentials missing!\n');
}

if (!fromEmail) {
  console.log('   ⚠️  WARNING: FROM_EMAIL not set');
  console.log('      Emails may not have proper sender address\n');
}

// Overall status
console.log('📊 Overall Status:\n');

let hasIssues = false;

if (!provider) {
  console.log('   ❌ Email provider not configured');
  hasIssues = true;
}

if (provider === 'mailgun' && (!process.env.MAILGUN_SMTP_USER || !process.env.MAILGUN_SMTP_PASSWORD)) {
  console.log('   ❌ Mailgun credentials missing');
  hasIssues = true;
}

if (provider === 'brevo' && (!process.env.BREVO_USER || !process.env.BREVO_API_KEY)) {
  console.log('   ❌ Brevo credentials missing');
  hasIssues = true;
}

if (provider === 'gmail' && (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)) {
  console.log('   ❌ Gmail credentials missing');
  hasIssues = true;
}

if (!hasIssues) {
  console.log('   ✅ Email system is properly configured!');
  console.log('\n   Next steps:');
  console.log('   1. Test connection: node scripts/test-email-service.js');
  console.log('   2. Send test email: node scripts/send-test-email.js');
  console.log('   3. Use bulk email feature in CRM\n');
} else {
  console.log('\n   ⚠️  Email system has configuration issues!');
  console.log('\n   To fix:');
  
  if (provider === 'mailgun' || !provider) {
    console.log('   • For Mailgun: node scripts/configure-mailgun.js');
  }
  if (provider === 'brevo') {
    console.log('   • For Brevo: Update BREVO_USER and BREVO_API_KEY in .env');
  }
  if (provider === 'gmail') {
    console.log('   • For Gmail: Update GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  }
  console.log('\n');
}

console.log('=====================================\n');
