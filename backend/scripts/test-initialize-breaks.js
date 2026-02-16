// Simple test to call the initialize breaks endpoint
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/attendance/initialize-breaks';

// You need to replace this with a valid HR/Admin token
// To get a token:
// 1. Login to the app as HR/Admin
// 2. Open browser DevTools > Application > Local Storage
// 3. Copy the 'token' value
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE';

const initializeBreaks = async () => {
  try {
    console.log('🔄 Calling initialize breaks endpoint...');
    console.log('URL:', API_URL);
    
    const response = await axios.post(
      API_URL,
      {},
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
  console.log('⚠️  Please update the AUTH_TOKEN in this script first!');
  console.log('');
  console.log('To get your token:');
  console.log('1. Login to the app as HR/Admin');
  console.log('2. Open browser DevTools (F12)');
  console.log('3. Go to Application > Local Storage');
  console.log('4. Copy the "token" value');
  console.log('5. Replace AUTH_TOKEN in this script');
  process.exit(1);
}

initializeBreaks();
