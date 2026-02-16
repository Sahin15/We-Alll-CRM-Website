#!/usr/bin/env node

/**
 * Test Lead Creation Script
 * 
 * This script tests lead creation with various scenarios to identify
 * the exact cause of the 400 Bad Request error on production.
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_URL || 'https://wealll.cloud';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://wealll.cloud';

console.log('🧪 Lead Creation Test Script');
console.log('API Base URL:', API_BASE_URL);
console.log('Frontend URL:', FRONTEND_URL);
console.log('=====================================\n');

// Test cases to run
const testCases = [
  {
    name: "Valid Lead - Minimal Data",
    data: {
      fullName: "Test User 1",
      phone: "9876543210"
    }
  },
  {
    name: "Valid Lead - Complete Data",
    data: {
      fullName: "Test User 2",
      phone: "9876543211",
      email: "test2@example.com",
      companyName: "Test Company",
      service: ["Marketing", "SEO"],
      budget: "20k to 50k /Month",
      source: "Website",
      status: "New"
    }
  },
  {
    name: "Invalid Lead - Missing fullName",
    data: {
      phone: "9876543212"
    }
  },
  {
    name: "Invalid Lead - Missing phone",
    data: {
      fullName: "Test User 3"
    }
  },
  {
    name: "Invalid Lead - Invalid phone (string)",
    data: {
      fullName: "Test User 4",
      phone: "invalid-phone"
    }
  },
  {
    name: "Invalid Lead - Invalid phone (negative)",
    data: {
      fullName: "Test User 5",
      phone: -123
    }
  },
  {
    name: "Valid Lead - Vyapaar Expo Source",
    data: {
      fullName: "Vyapaar Expo Lead",
      phone: "9876543213",
      email: "vyapaar@example.com",
      companyName: "Expo Company",
      service: ["Web Development"],
      source: "Vyapaar Expo"
    }
  }
];

async function testLeadCreation(testCase) {
  try {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log('Data:', JSON.stringify(testCase.data, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/api/leads`, testCase.data, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL,
        'Referer': FRONTEND_URL
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS:', response.status, response.statusText);
    console.log('Response:', {
      message: response.data.message,
      leadId: response.data.lead?._id,
      leadName: response.data.lead?.fullName
    });
    
    return { success: true, response: response.data };
    
  } catch (error) {
    console.log('❌ FAILED:', error.response?.status || 'Network Error');
    
    if (error.response) {
      console.log('Error Message:', error.response.data?.message);
      console.log('Error Details:', error.response.data?.details);
      console.log('Full Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Network Error:', error.message);
    }
    
    return { success: false, error: error.response?.data || error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Lead Creation Tests...\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testLeadCreation(testCase);
    results.push({
      name: testCase.name,
      ...result
    });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 TEST SUMMARY');
  console.log('=====================================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(test => {
      console.log(`  - ${test.name}: ${test.error?.message || 'Unknown error'}`);
    });
  }
  
  if (successful.length > 0) {
    console.log('\n✅ Successful Tests:');
    successful.forEach(test => {
      console.log(`  - ${test.name}`);
    });
  }
  
  console.log('\n🔍 DIAGNOSIS:');
  
  // Analyze patterns in failures
  const validationFailures = failed.filter(f => 
    f.error?.message?.includes('required') || 
    f.error?.message?.includes('validation') ||
    f.error?.message?.includes('valid')
  );
  
  const duplicateFailures = failed.filter(f => 
    f.error?.message?.includes('already exists') ||
    f.error?.message?.includes('duplicate')
  );
  
  const serverErrors = failed.filter(f => 
    !validationFailures.includes(f) && !duplicateFailures.includes(f)
  );
  
  if (validationFailures.length > 0) {
    console.log(`📋 Validation Issues: ${validationFailures.length} tests failed due to validation`);
  }
  
  if (duplicateFailures.length > 0) {
    console.log(`🔄 Duplicate Issues: ${duplicateFailures.length} tests failed due to duplicates`);
  }
  
  if (serverErrors.length > 0) {
    console.log(`🚨 Server Issues: ${serverErrors.length} tests failed due to server errors`);
    console.log('This indicates a problem with the server configuration or database connection');
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (failed.some(f => f.name.includes('Valid Lead') && !f.success)) {
    console.log('- Check server logs for detailed error information');
    console.log('- Verify database connection and MongoDB status');
    console.log('- Check if all required environment variables are set');
  }
  
  if (duplicateFailures.length > 0) {
    console.log('- Some leads may already exist in the database');
    console.log('- Consider using different test data or clearing test data');
  }
  
  if (validationFailures.length === 0 && successful.length === 0) {
    console.log('- All tests failed - likely a server configuration issue');
    console.log('- Check if the API endpoint is accessible');
    console.log('- Verify CORS settings and authentication requirements');
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});