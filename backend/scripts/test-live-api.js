/**
 * Test Live API Endpoint
 * Makes an actual HTTP request to the running backend
 * Run: node backend/scripts/test-live-api.js
 */

import axios from 'axios';

const testLiveAPI = async () => {
  try {
    console.log('='.repeat(80));
    console.log('TESTING LIVE API ENDPOINT');
    console.log('='.repeat(80));
    console.log();

    // First, get all departments to find Sales department ID
    console.log('📡 Step 1: Getting all departments...');
    const deptListResponse = await axios.get('http://localhost:5000/api/departments');
    
    const salesDept = deptListResponse.data.find(d => d.name.toLowerCase() === 'sales');
    
    if (!salesDept) {
      console.log('❌ Sales department not found in API response');
      console.log('Available departments:', deptListResponse.data.map(d => d.name));
      return;
    }

    console.log(`✅ Found Sales department: ${salesDept._id}`);
    console.log();

    // Now test the analytics endpoint
    console.log('📡 Step 2: Getting department analytics...');
    console.log(`   URL: http://localhost:5000/api/departments/${salesDept._id}/analytics`);
    console.log();

    const analyticsResponse = await axios.get(
      `http://localhost:5000/api/departments/${salesDept._id}/analytics`
    );

    console.log('📦 RESPONSE STATUS:', analyticsResponse.status);
    console.log();
    console.log('📦 RESPONSE DATA:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(analyticsResponse.data, null, 2));
    console.log();

    // Verify the structure
    const data = analyticsResponse.data;
    
    console.log('✅ VERIFICATION:');
    console.log('='.repeat(80));
    console.log(`Department Name: ${data.department?.name}`);
    console.log(`Total Employees: ${data.stats?.totalEmployees}`);
    console.log(`Employees Array Length: ${data.employees?.length}`);
    console.log();

    if (data.employees && data.employees.length > 0) {
      console.log('👥 Employees in Response:');
      data.employees.forEach((emp, index) => {
        console.log(`   ${index + 1}. ${emp.name} (${emp.email})`);
      });
      console.log();
      console.log('✅ SUCCESS: API is returning employees correctly!');
    } else {
      console.log('❌ PROBLEM: No employees in API response');
      console.log('   This means the backend code is not updated or not running');
    }

    console.log();
    console.log('='.repeat(80));
    console.log('FRONTEND SHOULD RECEIVE:');
    console.log('='.repeat(80));
    console.log('analyticsRes.data.employees should contain the employee array');
    console.log('If frontend shows 0 employees, check:');
    console.log('1. Is backend server restarted?');
    console.log('2. Is frontend using correct API endpoint?');
    console.log('3. Is there a caching issue in browser?');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the backend server running on port 5000?');
    }
  }
};

testLiveAPI();
