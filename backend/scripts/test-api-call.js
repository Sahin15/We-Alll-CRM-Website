import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testStatusUpdateAPI = async () => {
  try {
    const baseURL = 'http://localhost:5000';
    
    // First, login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com', // Replace with actual admin email
        password: 'admin123' // Replace with actual admin password
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      const errorText = await loginResponse.text();
      console.log('Error details:', errorText);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Get work items to find one to test with
    console.log('📋 Fetching work items...');
    const workItemsResponse = await fetch(`${baseURL}/api/work-items/my-work`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!workItemsResponse.ok) {
      console.log('❌ Failed to fetch work items:', workItemsResponse.status);
      return;
    }

    const workItemsData = await workItemsResponse.json();
    const workItems = workItemsData.data || workItemsData.workItems || [];
    
    if (workItems.length === 0) {
      console.log('❌ No work items found');
      return;
    }

    const testWorkItem = workItems[0];
    console.log('📋 Testing with work item:', {
      id: testWorkItem._id,
      title: testWorkItem.title,
      currentStatus: testWorkItem.status
    });

    // Test status update
    const newStatus = testWorkItem.status === 'To Do' ? 'In Progress' : 'To Do';
    console.log(`🔄 Updating status from "${testWorkItem.status}" to "${newStatus}"`);

    const statusUpdateResponse = await fetch(`${baseURL}/api/work-items/${testWorkItem._id}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: newStatus
      })
    });

    console.log('📡 Status update response:', statusUpdateResponse.status, statusUpdateResponse.statusText);

    if (!statusUpdateResponse.ok) {
      const errorText = await statusUpdateResponse.text();
      console.log('❌ Status update failed');
      console.log('Error details:', errorText);
      return;
    }

    const statusUpdateData = await statusUpdateResponse.json();
    console.log('✅ Status update successful:', statusUpdateData);

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
};

// Run the test
testStatusUpdateAPI();