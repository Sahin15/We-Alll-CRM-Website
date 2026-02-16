#!/usr/bin/env node

/**
 * Check email configuration without sending emails
 * Usage: node scripts/check-email-config.js
 */

import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

function checkConfig() {
  console.log('🔍 Email Configuration Checker\n');

  // Check .env file exists
  if (!fs.existsSync('.env')) {
    console.log('❌ .env file not found');
    console.log('Please create .env file from .env.example');
    return;
  }

  console.log('✅ .env file found');

  // Check required variables
  const requiredVars = [
    'EMAIL_PROVIDER',
    'GMAIL_USER', 
    'GMAIL_APP_PASSWORD',
    'FROM_EMAIL',
    'COMPANY_NAME'
  ];

  let allSet = true;
  
  console.log('\nChecking required environment variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: Not set`);
      allSet = false;
    } else if (value.includes('your_') || value.includes('_here')) {
      console.log(`⚠️  ${varName}: Contains placeholder value`);
      allSet = false;
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });

  if (!allSet) {
    console.log('\n🔧 Configuration Issues Found:');
    console.log('1. Set EMAIL_PROVIDER=gmail');
    console.log('2. Set GMAIL_USER to your Gmail address');
    console.log('3. Set GMAIL_APP_PASSWORD to your 16-character App Password');
    console.log('4. Set FROM_EMAIL to your Gmail address');
    console.log('5. Set COMPANY_NAME=We Alll');
    console.log('\nSee GMAIL_SETUP_INSTRUCTIONS.md for detailed setup');
    return;
  }

  console.log('\n✅ All configuration variables are set!');
  console.log('\nNext steps:');
  console.log('1. Run: node scripts/quick-email-test.js');
  console.log('2. Check sahin.wealll@gmail.com for test email');
  console.log('3. Use bulk email feature in Lead Management');

  // Show current config (without sensitive data)
  console.log('\nCurrent Configuration:');
  console.log('- Provider:', process.env.EMAIL_PROVIDER);
  console.log('- Gmail User:', process.env.GMAIL_USER);
  console.log('- From Email:', process.env.FROM_EMAIL);
  console.log('- Company:', process.env.COMPANY_NAME);
  console.log('- App Password Length:', process.env.GMAIL_APP_PASSWORD?.length || 0, 'characters');
}

checkConfig();