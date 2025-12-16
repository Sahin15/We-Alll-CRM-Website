import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@wealll.com', // Update with actual admin email
  password: 'admin123' // Update with actual admin password
};

async function loginAsAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ADMIN_CREDENTIALS),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Login successful');
    return data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

async function removeDuplicates(token) {
  try {
    console.log('🔄 Removing duplicate attendance records...');
    
    const response = await fetch(`${API_BASE_URL}/attendance/remove-duplicates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Duplicate removal completed:', data);
    return data;
  } catch (error) {
    console.error('❌ Duplicate removal failed:', error.message);
    throw error;
  }
}

async function recalculateWorkHours(token) {
  try {
    console.log('⏰ Recalculating work hours...');
    
    const response = await fetch(`${API_BASE_URL}/attendance/recalculate-work-hours`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Work hours recalculation completed:', data);
    return data;
  } catch (error) {
    console.error('❌ Work hours recalculation failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting attendance data cleanup via API...\n');
    
    // Step 1: Login as admin
    const token = await loginAsAdmin();
    
    // Step 2: Remove duplicates
    const duplicateResult = await removeDuplicates(token);
    
    // Step 3: Recalculate work hours
    const workHoursResult = await recalculateWorkHours(token);
    
    console.log('\n📊 Summary:');
    console.log(`   • Duplicates removed: ${duplicateResult.duplicatesRemoved || 0}`);
    console.log(`   • Work hours fixed: ${workHoursResult.fixedCount || 0}`);
    
    console.log('\n✅ Attendance data cleanup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();