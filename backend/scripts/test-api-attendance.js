import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function testAttendanceAPI() {
  try {
    console.log('🔍 TESTING ATTENDANCE API');
    console.log('='.repeat(80));
    console.log('API URL:', API_URL);
    console.log('');
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Today\'s Date:', today);
    console.log('');
    
    // First, we need to login to get a token
    console.log('🔐 Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: process.env.TEST_ADMIN_EMAIL || 'sahin.wealll@gmail.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'Sahin@123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Login successful');
    console.log('');
    
    // Test 1: Get all attendance (no filters)
    console.log('TEST 1: Get all attendance (no filters)');
    console.log('-'.repeat(80));
    const allRes = await axios.get(`${API_URL}/attendance`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Found ${allRes.data.length} total records`);
    console.log('');
    
    // Test 2: Get today's attendance using date parameter
    console.log('TEST 2: Get today\'s attendance (date parameter)');
    console.log('-'.repeat(80));
    const todayRes = await axios.get(`${API_URL}/attendance`, {
      params: { date: today },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Found ${todayRes.data.length} records for today`);
    
    if (todayRes.data.length > 0) {
      console.log('Sample records:');
      todayRes.data.slice(0, 5).forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.employee?.name || 'Unknown'}: ${record.status}`);
      });
      
      // Count by status
      const statusCounts = {
        present: todayRes.data.filter(r => r.status === 'present').length,
        late: todayRes.data.filter(r => r.status === 'late').length,
        'half-day': todayRes.data.filter(r => r.status === 'half-day').length,
        absent: todayRes.data.filter(r => r.status === 'absent').length,
      };
      
      console.log('');
      console.log('Status Summary:');
      console.log(`  Present: ${statusCounts.present}`);
      console.log(`  Late: ${statusCounts.late}`);
      console.log(`  Half-day: ${statusCounts['half-day']}`);
      console.log(`  Absent: ${statusCounts.absent}`);
    } else {
      console.log('⚠️  No records found for today!');
      console.log('   This is the issue - the API is not returning today\'s records.');
    }
    console.log('');
    
    // Test 3: Get today's attendance using startDate/endDate
    console.log('TEST 3: Get today\'s attendance (startDate/endDate parameters)');
    console.log('-'.repeat(80));
    const rangeRes = await axios.get(`${API_URL}/attendance`, {
      params: { startDate: today, endDate: today },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Found ${rangeRes.data.length} records for today (using date range)`);
    console.log('');
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`  All records: ${allRes.data.length}`);
    console.log(`  Today (date param): ${todayRes.data.length}`);
    console.log(`  Today (date range): ${rangeRes.data.length}`);
    console.log('');
    
    if (todayRes.data.length === 0 && rangeRes.data.length === 0) {
      console.log('❌ ISSUE CONFIRMED: API is not returning today\'s attendance records');
      console.log('   The backend server needs to be restarted to pick up the timezone fixes.');
    } else {
      console.log('✅ API is working correctly!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAttendanceAPI();
