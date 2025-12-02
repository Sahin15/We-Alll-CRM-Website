import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const testCalendarAPI = async () => {
  try {
    console.log('🔍 Testing Calendar API...\n');

    // You need to get a real token from your browser
    // 1. Open browser DevTools (F12)
    // 2. Go to Application tab
    // 3. Look in Local Storage
    // 4. Copy the 'token' value
    // 5. Paste it below

    const token = 'YOUR_TOKEN_HERE'; // REPLACE THIS

    if (token === 'YOUR_TOKEN_HERE') {
      console.log('❌ ERROR: You need to provide a real token!');
      console.log('');
      console.log('How to get token:');
      console.log('1. Open browser (where you\'re logged in)');
      console.log('2. Press F12 (DevTools)');
      console.log('3. Go to Application tab');
      console.log('4. Click Local Storage → http://localhost:3000');
      console.log('5. Find "token" and copy its value');
      console.log('6. Paste it in this script');
      return;
    }

    console.log('📡 Making API request to /api/slots...\n');

    const response = await axios.get(`${API_URL}/slots`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ API Response:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Count:', response.data.count);
    console.log('');

    if (response.data.count > 0) {
      console.log('📊 Slots returned:');
      response.data.data.forEach((slot, i) => {
        console.log(`\n${i + 1}. ${slot.brief?.substring(0, 40)}`);
        console.log(`   ID: ${slot._id}`);
        console.log(`   Project: ${slot.project?.name || 'N/A'}`);
        console.log(`   Design Deadline: ${slot.designDeadline}`);
        console.log(`   Posting Date: ${slot.postingDate}`);
        console.log(`   Assigned To: ${slot.assignedTo?.name || 'Unassigned'}`);
      });
    } else {
      console.log('❌ No slots returned by API');
      console.log('');
      console.log('This means:');
      console.log('- Either no slots exist in database');
      console.log('- Or backend is filtering them out');
      console.log('- Or there\'s an error in the query');
    }

  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
};

testCalendarAPI();
