import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveRequest from '../src/models/leaveRequestModel.js';
import User from '../src/models/userModel.js';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const testApiEndpoint = async () => {
  try {
    // Connect to MongoDB to get test data
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get an employee who has approved leaves
    const approvedLeave = await LeaveRequest.findOne({ status: 'approved' }).populate('employee');
    const employeeId = approvedLeave.employee._id.toString();
    const employeeName = approvedLeave.employee.name;
    
    console.log(`\n🧪 Testing API endpoint for: ${employeeName}`);
    console.log(`   Employee ID: ${employeeId}`);

    // First, we need to get an auth token
    // For testing, let's get an admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found for testing');
      return;
    }

    console.log(`\n🔑 Using admin user for auth: ${adminUser.name}`);

    // Test the API endpoint
    const apiUrl = `http://localhost:5000/api/leaves/usage-summary/${employeeId}?year=2026`;
    console.log(`\n📡 Testing API endpoint: ${apiUrl}`);

    // Note: In a real test, you'd need to authenticate first
    // For now, let's just test the controller function directly
    
    // Test the controller function directly
    const mockReq = {
      params: { employeeId },
      query: { year: '2026' },
      user: { role: 'admin', id: adminUser._id }
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`\n📊 API Response (${code}):`);
          console.log(JSON.stringify(data, null, 2));
          return data;
        }
      })
    };

    // Import and test the controller function
    const { getLeaveUsageSummary } = await import('../src/controllers/leaveController.js');
    
    console.log(`\n🎯 Testing getLeaveUsageSummary controller function...`);
    await getLeaveUsageSummary(mockReq, mockRes);

    console.log('\n✅ API endpoint test completed!');
    
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

// Run the test
testApiEndpoint();