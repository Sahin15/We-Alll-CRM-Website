import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const projectId = '699ee1f6003fab70208e62bc';

// You'll need to get a valid token from your browser's localStorage
// Open browser console and run: localStorage.getItem('token')
const TOKEN = 'YOUR_TOKEN_HERE'; // Replace with actual token

async function testSlotAPI() {
  try {
    console.log('🔍 Testing slot API endpoint...\n');
    
    const response = await axios.get(
      `${API_URL}/projects/${projectId}/slots`,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      }
    );
    
    console.log('✅ API Response Status:', response.status);
    console.log('📦 Slots returned:', response.data?.data?.length || response.data?.length || 0);
    console.log('\nSlots:');
    const slots = response.data?.data || response.data || [];
    slots.forEach(slot => {
      console.log(`  - Slot ${slot.slotNumber}: ${slot.slotIdentifier} (${slot._id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

console.log('⚠️  Please update TOKEN in the script with your actual token from browser localStorage');
console.log('   Run in browser console: localStorage.getItem("token")\n');

// testSlotAPI();
