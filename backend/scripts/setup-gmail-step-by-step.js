#!/usr/bin/env node

/**
 * Step-by-step Gmail setup guide
 * Usage: node scripts/setup-gmail-step-by-step.js
 */

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupGmail() {
  console.log('🔧 Gmail App Password Setup for sahinmondal.wealll@gmail.com\n');
  
  console.log('📋 Step-by-Step Instructions:\n');
  
  console.log('1. Open your web browser and go to: https://myaccount.google.com/');
  console.log('2. Sign in with:');
  console.log('   Email: sahinmondal.wealll@gmail.com');
  console.log('   Password: Wealll@2025');
  console.log('');
  
  await askQuestion('Press Enter when you\'ve signed in to Google Account...');
  
  console.log('\n3. Click on "Security" in the left sidebar');
  await askQuestion('Press Enter when you\'re on the Security page...');
  
  console.log('\n4. Look for "Signing in to Google" section');
  console.log('5. Click on "2-Step Verification"');
  console.log('6. If not enabled, follow the prompts to enable it (you\'ll need your phone)');
  await askQuestion('Press Enter when 2-Step Verification is enabled...');
  
  console.log('\n7. Still on the Security page, click on "App passwords"');
  console.log('8. You might need to sign in again');
  await askQuestion('Press Enter when you\'re on the App passwords page...');
  
  console.log('\n9. In the "Select app" dropdown, choose "Mail"');
  console.log('10. Click "Generate"');
  console.log('11. Google will show you a 16-character password like: "abcd efgh ijkl mnop"');
  console.log('12. COPY this password (it will only be shown once!)');
  
  const appPassword = await askQuestion('\nPaste the 16-character App Password here (spaces will be removed): ');
  
  // Remove spaces and validate
  const cleanPassword = appPassword.replace(/\s/g, '');
  
  if (cleanPassword.length !== 16) {
    console.log('❌ App Password should be exactly 16 characters. Please try again.');
    rl.close();
    return;
  }
  
  console.log('\n✅ App Password received!');
  console.log('Length:', cleanPassword.length, 'characters');
  
  console.log('\n📝 Now updating your .env file...');
  
  // Show the user what to update
  console.log('\nPlease update your backend/.env file:');
  console.log('Replace this line:');
  console.log('GMAIL_APP_PASSWORD=your_gmail_app_password_here');
  console.log('\nWith this line:');
  console.log(`GMAIL_APP_PASSWORD=${cleanPassword}`);
  
  console.log('\n🧪 After updating .env, test with:');
  console.log('cd backend');
  console.log('node scripts/quick-email-test.js');
  
  console.log('\n🎉 Setup complete! The email system will be ready once you update the .env file.');
  
  rl.close();
}

setupGmail().catch(console.error);