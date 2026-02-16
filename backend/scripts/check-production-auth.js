#!/usr/bin/env node

/**
 * Production Authentication Check
 * 
 * This script helps diagnose authentication issues on production
 */

import axios from 'axios';

const PRODUCTION_URL = 'https://wealll.cloud';

console.log('🔐 Production Authentication Check');
console.log('URL:', PRODUCTION_URL);
console.log('=====================================\n');

// Test login endpoint
async function testLogin() {
  console.log('🧪 Testing Login Endpoint...');
  
  try {
    const response = await axios.post(`${PRODUCTION_URL}/api/users/login`, {
      email: 'admin@test.com', // Use a test email
      password: 'testpassword'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Login endpoint is accessible');
    console.log('Status:', response.status);
    
    if (response.data.token) {
      console.log('✅ Token received');
      return response.data.token;
    } else {
      console.log('❌ No token in response');
      return null;
    }
    
  } catch (error) {
    console.log('❌ Login failed');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data?.message);
      
      if (error.response.status === 401) {
        console.log('💡 Invalid credentials (expected for test account)');
      } else if (error.response.status === 404) {
        console.log('💡 Login endpoint not found - check API routes');
      } else {
        console.log('💡 Unexpected error - check server logs');
      }
    } else {
      console.log('💡 Network error - server might be down');
    }
    
    return null;
  }
}

// Test authenticated lead creation
async function testAuthenticatedLeadCreation(token) {
  console.log('\n🧪 Testing Authenticated Lead Creation...');
  
  if (!token) {
    console.log('❌ No token available, skipping authenticated test');
    return;
  }
  
  try {
    const response = await axios.post(`${PRODUCTION_URL}/api/leads`, {
      fullName: "Auth Test Lead",
      phone: "9999999999",
      email: "authtest@example.com"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    console.log('✅ Authenticated lead creation successful');
    console.log('Status:', response.status);
    console.log('Lead ID:', response.data.lead?._id);
    
  } catch (error) {
    console.log('❌ Authenticated lead creation failed');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data?.message);
      
      if (error.response.status === 401) {
        console.log('💡 Token is invalid or expired');
      } else if (error.response.status === 400) {
        console.log('💡 Validation error - check request data');
        console.log('Details:', error.response.data?.details);
      } else if (error.response.status === 403) {
        console.log('💡 Insufficient permissions');
      }
    }
  }
}

// Test public lead creation
async function testPublicLeadCreation() {
  console.log('\n🧪 Testing Public Lead Creation...');
  
  try {
    const response = await axios.post(`${PRODUCTION_URL}/api/leads/public`, {
      fullName: "Public Test Lead",
      phone: "8888888888",
      email: "publictest@example.com"
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Public lead creation successful');
    console.log('Status:', response.status);
    console.log('Lead ID:', response.data.lead?._id);
    
  } catch (error) {
    console.log('❌ Public lead creation failed');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data?.message);
      
      if (error.response.status === 400) {
        console.log('💡 Validation error');
        console.log('Details:', error.response.data?.details);
      } else if (error.response.status === 404) {
        console.log('💡 Public endpoint not found');
      }
    }
  }
}

// Check server status
async function checkServerStatus() {
  console.log('🧪 Checking Server Status...');
  
  try {
    const response = await axios.get(`${PRODUCTION_URL}/api/users/me`, {
      timeout: 5000
    });
    
    console.log('✅ Server is responding');
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Server is responding (401 expected without auth)');
    } else {
      console.log('❌ Server issue');
      console.log('Status:', error.response?.status || 'Network Error');
    }
  }
}

async function runDiagnostics() {
  await checkServerStatus();
  
  const token = await testLogin();
  
  await testAuthenticatedLeadCreation(token);
  
  await testPublicLeadCreation();
  
  console.log('\n📋 SUMMARY & RECOMMENDATIONS:');
  console.log('=====================================');
  
  console.log('\n💡 If you\'re getting 401 errors in the frontend:');
  console.log('1. Check if user is properly logged in');
  console.log('2. Verify JWT token is stored in localStorage');
  console.log('3. Check if token has expired');
  console.log('4. Ensure axios interceptor is adding Authorization header');
  
  console.log('\n💡 If you\'re getting 400 errors:');
  console.log('1. Check validation requirements (fullName and phone required)');
  console.log('2. Verify phone number format (must be valid number)');
  console.log('3. Check for duplicate leads (same phone/email)');
  
  console.log('\n💡 For public forms (like Growth Summit):');
  console.log('1. Use /api/leads/public endpoint');
  console.log('2. No authentication required');
  console.log('3. Still requires fullName and phone validation');
}

runDiagnostics().catch(error => {
  console.error('💥 Diagnostic script failed:', error.message);
});