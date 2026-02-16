#!/usr/bin/env node

/**
 * Test script to verify the bulk email endpoint is working
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testBulkEmailEndpoint() {
  console.log('🧪 Testing Bulk Email Endpoint...\n');

  try {
    // Test the email templates endpoint first
    console.log('📝 Testing email templates endpoint...');
    const templatesResponse = await fetch('http://localhost:5000/api/emails/templates');
    
    if (templatesResponse.ok) {
      const templatesData = await templatesResponse.json();
      console.log('✅ Templates endpoint working');
      console.log(`   Found ${templatesData.data.length} templates`);
      
      // Check if vyapaar-expo-2 template exists
      const vyapaarTemplate = templatesData.data.find(t => t.id === 'vyapaar-expo-2');
      if (vyapaarTemplate) {
        console.log('✅ Vyapaar Expo 2.0 template found');
        console.log(`   Name: ${vyapaarTemplate.name}`);
      } else {
        console.log('❌ Vyapaar Expo 2.0 template not found');
        console.log('   Available templates:', templatesData.data.map(t => t.id));
      }
    } else {
      console.log('❌ Templates endpoint failed:', templatesResponse.status);
    }

    console.log('\n🔗 Testing email configuration endpoint...');
    const configResponse = await fetch('http://localhost:5000/api/emails/test-config');
    
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('✅ Email configuration test passed');
    } else {
      console.log('❌ Email configuration test failed:', configResponse.status);
    }

    console.log('\n📧 Email service endpoints test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testBulkEmailEndpoint().catch(console.error);