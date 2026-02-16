import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Test the API endpoint directly
async function testLeaveBalanceAPI() {
  console.log('🧪 TESTING LEAVE BALANCE API');
  console.log('='.repeat(80));
  
  // You need to provide a valid JWT token for Sangita Dutta
  console.log('\n⚠️  To test the API, you need to:');
  console.log('1. Login as Sangita Dutta on the website');
  console.log('2. Open browser DevTools > Application > Local Storage');
  console.log('3. Copy the "token" value');
  console.log('4. Set it as TOKEN environment variable');
  console.log('\nExample:');
  console.log('TOKEN="your-jwt-token" node backend/scripts/test-api-leave-balance.js');
  
  const token = process.env.TOKEN;
  
  if (!token) {
    console.log('\n❌ No TOKEN provided. Exiting...');
    process.exit(1);
  }
  
  try {
    const baseURL = process.env.API_URL || 'http://localhost:5000/api';
    
    console.log(`\n📡 Testing API at: ${baseURL}/leaves/balance`);
    
    const response = await axios.get(`${baseURL}/leaves/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n✅ API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    const balance = response.data.balance;
    
    console.log('\n📊 Leave Balance Summary:');
    console.log(`   Earned This Year: ${balance.earned.earned} leaves`);
    console.log(`   Used: ${balance.earned.used} leaves`);
    console.log(`   Remaining: ${balance.earned.remaining} leaves`);
    
    if (balance.earned.earned === 2) {
      console.log('\n✅ CORRECT! Showing 2 earned leaves for February joiner');
    } else if (balance.earned.earned === 4) {
      console.log('\n❌ INCORRECT! Showing 4 earned leaves (includes January)');
      console.log('   This means the server is running OLD CODE without joining date fix');
      console.log('   Solution: Restart the backend server');
    } else {
      console.log(`\n⚠️  Unexpected value: ${balance.earned.earned} leaves`);
    }
    
  } catch (error) {
    console.error('\n❌ API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Token is invalid or expired. Please get a fresh token.');
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

testLeaveBalanceAPI();
