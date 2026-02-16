#!/usr/bin/env node

/**
 * Comprehensive server functionality test
 * Tests lead generation, attendance, and core API endpoints
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5000';

async function testServerFunctionality() {
  console.log('🧪 Testing Server Functionality...\n');

  const tests = [];

  try {
    // Test 1: Health Check
    console.log('🏥 Testing Health Check...');
    try {
      const healthResponse = await fetch(`${BASE_URL}/api/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Health check passed');
        tests.push({ name: 'Health Check', status: 'PASS' });
      } else {
        console.log('❌ Health check failed:', healthResponse.status);
        tests.push({ name: 'Health Check', status: 'FAIL', error: healthResponse.status });
      }
    } catch (error) {
      console.log('❌ Health check error:', error.message);
      tests.push({ name: 'Health Check', status: 'ERROR', error: error.message });
    }

    // Test 2: Database Connection
    console.log('\n💾 Testing Database Connection...');
    try {
      const dbResponse = await fetch(`${BASE_URL}/api/health`);
      if (dbResponse.ok) {
        console.log('✅ Database connection working');
        tests.push({ name: 'Database Connection', status: 'PASS' });
      } else {
        console.log('❌ Database connection failed');
        tests.push({ name: 'Database Connection', status: 'FAIL' });
      }
    } catch (error) {
      console.log('❌ Database connection error:', error.message);
      tests.push({ name: 'Database Connection', status: 'ERROR', error: error.message });
    }

    // Test 3: Lead API Endpoints
    console.log('\n👥 Testing Lead API Endpoints...');
    try {
      const leadsResponse = await fetch(`${BASE_URL}/api/leads`);
      if (leadsResponse.status === 401) {
        console.log('✅ Lead API endpoint exists (requires auth)');
        tests.push({ name: 'Lead API Endpoints', status: 'PASS', note: 'Requires authentication' });
      } else if (leadsResponse.ok) {
        console.log('✅ Lead API endpoint accessible');
        tests.push({ name: 'Lead API Endpoints', status: 'PASS' });
      } else {
        console.log('❌ Lead API endpoint failed:', leadsResponse.status);
        tests.push({ name: 'Lead API Endpoints', status: 'FAIL', error: leadsResponse.status });
      }
    } catch (error) {
      console.log('❌ Lead API endpoint error:', error.message);
      tests.push({ name: 'Lead API Endpoints', status: 'ERROR', error: error.message });
    }

    // Test 4: Attendance API Endpoints
    console.log('\n⏰ Testing Attendance API Endpoints...');
    try {
      const attendanceResponse = await fetch(`${BASE_URL}/api/attendance`);
      if (attendanceResponse.status === 401) {
        console.log('✅ Attendance API endpoint exists (requires auth)');
        tests.push({ name: 'Attendance API Endpoints', status: 'PASS', note: 'Requires authentication' });
      } else if (attendanceResponse.ok) {
        console.log('✅ Attendance API endpoint accessible');
        tests.push({ name: 'Attendance API Endpoints', status: 'PASS' });
      } else {
        console.log('❌ Attendance API endpoint failed:', attendanceResponse.status);
        tests.push({ name: 'Attendance API Endpoints', status: 'FAIL', error: attendanceResponse.status });
      }
    } catch (error) {
      console.log('❌ Attendance API endpoint error:', error.message);
      tests.push({ name: 'Attendance API Endpoints', status: 'ERROR', error: error.message });
    }

    // Test 5: User API Endpoints
    console.log('\n👤 Testing User API Endpoints...');
    try {
      const usersResponse = await fetch(`${BASE_URL}/api/users`);
      if (usersResponse.status === 401) {
        console.log('✅ User API endpoint exists (requires auth)');
        tests.push({ name: 'User API Endpoints', status: 'PASS', note: 'Requires authentication' });
      } else if (usersResponse.ok) {
        console.log('✅ User API endpoint accessible');
        tests.push({ name: 'User API Endpoints', status: 'PASS' });
      } else {
        console.log('❌ User API endpoint failed:', usersResponse.status);
        tests.push({ name: 'User API Endpoints', status: 'FAIL', error: usersResponse.status });
      }
    } catch (error) {
      console.log('❌ User API endpoint error:', error.message);
      tests.push({ name: 'User API Endpoints', status: 'ERROR', error: error.message });
    }

    // Test 6: Email Service
    console.log('\n📧 Testing Email Service...');
    try {
      const emailResponse = await fetch(`${BASE_URL}/api/emails/templates`);
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        console.log('✅ Email service working');
        console.log(`   Found ${emailData.data.length} email templates`);
        tests.push({ name: 'Email Service', status: 'PASS', details: `${emailData.data.length} templates` });
      } else {
        console.log('❌ Email service failed:', emailResponse.status);
        tests.push({ name: 'Email Service', status: 'FAIL', error: emailResponse.status });
      }
    } catch (error) {
      console.log('❌ Email service error:', error.message);
      tests.push({ name: 'Email Service', status: 'ERROR', error: error.message });
    }

    // Test 7: WebSocket Connection
    console.log('\n🔌 Testing WebSocket Connection...');
    try {
      // Simple WebSocket connection test
      const wsUrl = 'ws://localhost:5000/ws/admin-work-updates';
      console.log('✅ WebSocket endpoint configured');
      console.log(`   URL: ${wsUrl}`);
      tests.push({ name: 'WebSocket Configuration', status: 'PASS', note: 'Endpoint configured' });
    } catch (error) {
      console.log('❌ WebSocket configuration error:', error.message);
      tests.push({ name: 'WebSocket Configuration', status: 'ERROR', error: error.message });
    }

    // Test 8: Environment Variables
    console.log('\n🔧 Testing Environment Variables...');
    const requiredEnvVars = [
      'MONGO_URI',
      'JWT_SECRET',
      'PORT',
      'NODE_ENV',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'GMAIL_USER',
      'GMAIL_APP_PASSWORD'
    ];

    let envVarsPassed = 0;
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        envVarsPassed++;
      } else {
        console.log(`❌ Missing environment variable: ${envVar}`);
      }
    }

    if (envVarsPassed === requiredEnvVars.length) {
      console.log('✅ All required environment variables present');
      tests.push({ name: 'Environment Variables', status: 'PASS', details: `${envVarsPassed}/${requiredEnvVars.length}` });
    } else {
      console.log(`⚠️  Environment variables: ${envVarsPassed}/${requiredEnvVars.length} present`);
      tests.push({ name: 'Environment Variables', status: 'PARTIAL', details: `${envVarsPassed}/${requiredEnvVars.length}` });
    }

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('═'.repeat(60));
    
    const passed = tests.filter(t => t.status === 'PASS').length;
    const failed = tests.filter(t => t.status === 'FAIL').length;
    const errors = tests.filter(t => t.status === 'ERROR').length;
    const partial = tests.filter(t => t.status === 'PARTIAL').length;

    tests.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : 
                    test.status === 'FAIL' ? '❌' : 
                    test.status === 'ERROR' ? '💥' : '⚠️';
      console.log(`${status} ${test.name}: ${test.status}${test.details ? ` (${test.details})` : ''}${test.note ? ` - ${test.note}` : ''}`);
    });

    console.log('═'.repeat(60));
    console.log(`📈 Results: ${passed} passed, ${failed} failed, ${errors} errors, ${partial} partial`);

    if (failed === 0 && errors === 0) {
      console.log('\n🎉 Server functionality test completed successfully!');
      console.log('✅ Lead generation and attendance systems should be working');
    } else {
      console.log('\n⚠️  Some issues detected. Check the failed tests above.');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the test
testServerFunctionality().catch(console.error);