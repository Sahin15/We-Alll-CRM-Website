#!/usr/bin/env node

/**
 * Production Lead API Test
 * 
 * Quick test to reproduce the exact 400 error from production
 */

import axios from 'axios';

const PRODUCTION_URL = 'https://wealll.cloud';

console.log('🔍 Testing Production Lead API');
console.log('URL:', `${PRODUCTION_URL}/api/leads`);
console.log('=====================================\n');

// Test with the exact same data that might be causing issues
const testData = {
  fullName: "Production Test Lead",
  phone: "8240858613", // Using the WhatsApp number from context
  email: "test@production.com",
  companyName: "Test Company",
  service: ["Marketing"],
  budget: "20k to 50k /Month",
  source: "Vyapaar Expo",
  status: "New"
};

async function testProductionAPI() {
  try {
    console.log('📤 Sending request...');
    console.log('Data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(`${PRODUCTION_URL}/api/leads`, testData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Lead-Test-Script/1.0',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('\n✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ ERROR OCCURRED');
    
    if (error.response) {
      console.log('Status Code:', error.response.status);
      console.log('Status Text:', error.response.statusText);
      console.log('Response Headers:', error.response.headers);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
      
      // Detailed analysis of 400 errors
      if (error.response.status === 400) {
        console.log('\n🔍 400 BAD REQUEST ANALYSIS:');
        const errorData = error.response.data;
        
        if (errorData.message) {
          console.log('Error Message:', errorData.message);
        }
        
        if (errorData.details) {
          console.log('Error Details:', JSON.stringify(errorData.details, null, 2));
        }
        
        if (errorData.errors) {
          console.log('Validation Errors:', JSON.stringify(errorData.errors, null, 2));
        }
        
        // Common causes analysis
        console.log('\n💡 POSSIBLE CAUSES:');
        
        if (errorData.message?.includes('required')) {
          console.log('- Missing required fields (fullName or phone)');
        }
        
        if (errorData.message?.includes('valid phone')) {
          console.log('- Invalid phone number format');
        }
        
        if (errorData.message?.includes('already exists')) {
          console.log('- Duplicate lead (phone or email already in database)');
        }
        
        if (errorData.message?.includes('validation')) {
          console.log('- Mongoose schema validation failed');
        }
        
        console.log('- Database connection issues');
        console.log('- Server configuration problems');
      }
      
    } else if (error.request) {
      console.log('Network Error - No response received');
      console.log('Request details:', error.request);
      
    } else {
      console.log('Request Setup Error:', error.message);
    }
  }
}

// Test with different variations
async function runMultipleTests() {
  const variations = [
    {
      name: "Original Test Data",
      data: testData
    },
    {
      name: "Minimal Required Fields Only",
      data: {
        fullName: "Minimal Test",
        phone: "9999999999"
      }
    },
    {
      name: "String Phone Number",
      data: {
        fullName: "String Phone Test",
        phone: "8240858613"
      }
    },
    {
      name: "Number Phone",
      data: {
        fullName: "Number Phone Test",
        phone: 8240858614
      }
    },
    {
      name: "Empty Service Array",
      data: {
        fullName: "Empty Service Test",
        phone: "8240858615",
        service: []
      }
    }
  ];
  
  for (const variation of variations) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🧪 Testing: ${variation.name}`);
    console.log(`${'='.repeat(50)}`);
    
    // Update test data
    Object.assign(testData, variation.data);
    
    await testProductionAPI();
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

console.log('Starting production API tests...\n');
runMultipleTests().catch(error => {
  console.error('💥 Test failed:', error.message);
});