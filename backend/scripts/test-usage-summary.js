import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getLeaveUsageSummary } from '../src/controllers/leaveController.js';
import User from '../src/models/userModel.js';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const testUsageSummary = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find employees with approved leaves
    const employees = await User.find({ role: { $in: ['employee', 'hod'] } });
    console.log(`\n👥 Found ${employees.length} employees`);

    for (const employee of employees) {
      console.log(`\n🔍 Testing usage summary for: ${employee.name} (${employee._id})`);

      // Mock request and response objects
      const mockReq = {
        params: { employeeId: employee._id.toString() },
        query: { year: 2026 },
        user: { role: 'admin' }
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => {
            console.log(`📊 Response (${code}):`);
            console.log(`   Employee: ${data.employeeId}`);
            console.log(`   Year: ${data.year}`);
            console.log(`   Earned: ${data.balance.earned.earned}`);
            console.log(`   Used: ${data.balance.earned.used}`);
            console.log(`   Remaining: ${data.balance.earned.remaining}`);
            console.log(`   Current Ratio: ${data.summary.currentRatio}`);
            console.log(`   Leave History: ${data.leaveHistory.length} entries`);
            
            if (data.leaveHistory.length > 0) {
              console.log(`   History Details:`);
              data.leaveHistory.forEach((leave, index) => {
                console.log(`     ${index + 1}. ${leave.leaveType} - ${leave.numberOfDays} days - Ratio: ${leave.usageRatio}`);
              });
            }
            return data;
          }
        })
      };

      try {
        await getLeaveUsageSummary(mockReq, mockRes);
      } catch (error) {
        console.error(`   ❌ Error for ${employee.name}:`, error.message);
      }
    }

    console.log('\n✅ Usage summary test completed!');
    
  } catch (error) {
    console.error('❌ Error testing usage summary:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

// Run the test
testUsageSummary();