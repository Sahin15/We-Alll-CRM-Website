/**
 * Quick API Test Script
 * Run this to verify all optimized APIs are working correctly
 * 
 * Usage: node test-apis.js
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
let authToken = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

// Test configuration
const TEST_USER = {
  email: 'admin@example.com', // Change this to your admin email
  password: 'admin123' // Change this to your admin password
};

async function testAPI(name, endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    };
    
    if (data) config.data = data;
    
    const response = await axios(config);
    const responseData = response.data;
    
    // Check response format
    let dataCount = 0;
    if (Array.isArray(responseData)) {
      dataCount = responseData.length;
    } else if (responseData.data) {
      dataCount = Array.isArray(responseData.data) ? responseData.data.length : 1;
    } else if (responseData.success !== undefined) {
      dataCount = 'object';
    }
    
    log.success(`${name}: ${dataCount} items`);
    return true;
  } catch (error) {
    if (error.response) {
      log.error(`${name}: ${error.response.status} - ${error.response.data.message || 'Error'}`);
    } else {
      log.error(`${name}: ${error.message}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 Testing Optimized APIs\n');
  console.log('='.repeat(50));
  
  // Step 1: Login
  log.info('Step 1: Authenticating...');
  try {
    const response = await axios.post(`${API_URL}/users/login`, TEST_USER);
    authToken = response.data.token;
    log.success(`Logged in as ${response.data.user.name} (${response.data.user.role})`);
  } catch (error) {
    log.error('Login failed. Please update TEST_USER credentials in the script.');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(50));
  log.info('Step 2: Testing User APIs...');
  await testAPI('GET /users', '/users');
  await testAPI('GET /users (with search)', '/users?search=admin');
  
  console.log('\n' + '='.repeat(50));
  log.info('Step 3: Testing Client APIs...');
  await testAPI('GET /clients', '/clients');
  await testAPI('GET /clients (with search)', '/clients?search=test');
  
  console.log('\n' + '='.repeat(50));
  log.info('Step 4: Testing Project APIs...');
  await testAPI('GET /projects', '/projects');
  await testAPI('GET /projects (with search)', '/projects?search=test');
  
  console.log('\n' + '='.repeat(50));
  log.info('Step 5: Testing Slot/Work APIs...');
  await testAPI('GET /slots', '/slots');
  await testAPI('GET /slots (with search)', '/slots?search=test');
  
  console.log('\n' + '='.repeat(50));
  log.info('Step 6: Testing Attendance APIs...');
  await testAPI('GET /attendance', '/attendance');
  await testAPI('GET /attendance/today', '/attendance/today');
  
  console.log('\n' + '='.repeat(50));
  log.success('All API tests completed!');
  console.log('='.repeat(50) + '\n');
}

// Run tests
runTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});
