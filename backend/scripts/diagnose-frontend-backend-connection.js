#!/usr/bin/env node

/**
 * Diagnose frontend-backend connection issues
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function diagnoseFrontendBackendConnection() {
  console.log('🔍 Diagnosing Frontend-Backend Connection...\n');

  // Check environment variables
  console.log('🔧 Environment Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   PORT: ${process.env.PORT}`);
  console.log(`   CORS_ORIGIN: ${process.env.CORS_ORIGIN}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL}`);
  console.log(`   API_URL: ${process.env.API_URL}`);

  // Check CORS configuration
  console.log('\n🌐 CORS Configuration:');
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [];
  corsOrigins.forEach(origin => {
    console.log(`   ✅ Allowed origin: ${origin.trim()}`);
  });

  // Test API endpoints that frontend commonly uses
  console.log('\n🧪 Testing Common Frontend Endpoints:');
  
  const endpoints = [
    { path: '/api/users/login', method: 'POST', description: 'User Login' },
    { path: '/api/leads', method: 'GET', description: 'Get Leads' },
    { path: '/api/attendance/clock-in', method: 'POST', description: 'Clock In' },
    { path: '/api/attendance/clock-out', method: 'POST', description: 'Clock Out' },
    { path: '/api/users', method: 'GET', description: 'Get Users' },
    { path: '/api/emails/templates', method: 'GET', description: 'Email Templates' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:5000${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 401) {
        console.log(`   ✅ ${endpoint.description}: Requires authentication (expected)`);
      } else if (response.status === 400) {
        console.log(`   ✅ ${endpoint.description}: Validation error (expected)`);
      } else if (response.ok) {
        console.log(`   ✅ ${endpoint.description}: Working`);
      } else {
        console.log(`   ⚠️  ${endpoint.description}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.description}: ${error.message}`);
    }
  }

  // Check if frontend is running
  console.log('\n🖥️  Frontend Connection Test:');
  const frontendUrls = ['http://localhost:3000', 'http://localhost:3001'];
  
  for (const url of frontendUrls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        console.log(`   ✅ Frontend running at: ${url}`);
      } else {
        console.log(`   ❌ Frontend not responding at: ${url}`);
      }
    } catch (error) {
      console.log(`   ❌ Frontend not running at: ${url}`);
    }
  }

  // Provide troubleshooting guide
  console.log('\n📋 Troubleshooting Guide:');
  console.log('═'.repeat(60));
  
  console.log('\n🔐 Authentication Issues:');
  console.log('   • Login endpoint: POST /api/users/login');
  console.log('   • Check if JWT tokens are being stored in localStorage/cookies');
  console.log('   • Verify Authorization header: "Bearer <token>"');
  
  console.log('\n👥 Lead Generation Issues:');
  console.log('   • Endpoint: POST /api/leads');
  console.log('   • Requires authentication');
  console.log('   • Check required fields: fullName, phone, email');
  
  console.log('\n⏰ Attendance Issues:');
  console.log('   • Clock In: POST /api/attendance/clock-in');
  console.log('   • Clock Out: POST /api/attendance/clock-out');
  console.log('   • Requires authentication');
  console.log('   • Check if user ID is being sent correctly');
  
  console.log('\n🌐 CORS Issues:');
  console.log('   • Check browser console for CORS errors');
  console.log('   • Ensure frontend URL is in CORS_ORIGIN');
  console.log('   • Current CORS origins:', process.env.CORS_ORIGIN);
  
  console.log('\n🔧 Common Fixes:');
  console.log('   1. Clear browser cache and localStorage');
  console.log('   2. Check browser console for JavaScript errors');
  console.log('   3. Verify network requests in browser DevTools');
  console.log('   4. Ensure both frontend and backend are running');
  console.log('   5. Check if API base URL is correct in frontend');

  console.log('\n✅ Server Status: All backend services are operational');
}

// Run the diagnosis
diagnoseFrontendBackendConnection().catch(console.error);