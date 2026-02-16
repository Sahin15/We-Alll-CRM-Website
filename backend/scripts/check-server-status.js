import fetch from 'node-fetch';

const checkServerStatus = async () => {
  try {
    console.log('🔍 Checking server status...');
    
    const response = await fetch('http://localhost:5000/api/health', {
      method: 'GET',
      timeout: 5000
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is running:', data);
    } else {
      console.log('❌ Server responded with error:', response.status, response.statusText);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running (connection refused)');
      console.log('💡 Please start the server with: npm run dev');
    } else {
      console.log('❌ Error checking server:', error.message);
    }
  }
};

checkServerStatus();