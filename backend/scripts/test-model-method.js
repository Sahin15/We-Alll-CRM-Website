import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveRequest from '../src/models/leaveRequestModel.js';
import User from '../src/models/userModel.js';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const testModelMethod = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get a test employee ID who has approved leaves
    const approvedLeave = await LeaveRequest.findOne({ status: 'approved' }).populate('employee');
    if (!approvedLeave) {
      console.log('❌ No approved leaves found');
      return;
    }
    
    const employee = approvedLeave.employee;
    const employeeIdString = employee._id.toString();
    
    console.log(`\n🔍 Testing with employee who has approved leaves: ${employee.name}`);
    console.log(`   Employee ID (string): ${employeeIdString}`);
    console.log(`   Employee ID (ObjectId): ${employee._id}`);
    console.log(`   Known approved leave: ${approvedLeave.leaveType} - ${approvedLeave.numberOfDays} days`);

    // Debug: Check what collection we're querying
    console.log(`\n🔍 Database debugging:`);
    console.log(`   Collection name: ${LeaveRequest.collection.name}`);
    console.log(`   Database name: ${mongoose.connection.db.databaseName}`);
    
    // Check total count of documents
    const totalLeaves = await LeaveRequest.countDocuments();
    console.log(`   Total leave documents: ${totalLeaves}`);
    
    const totalApproved = await LeaveRequest.countDocuments({ status: 'approved' });
    console.log(`   Total approved leaves: ${totalApproved}`);
    
    const total2026 = await LeaveRequest.countDocuments({ leaveYear: 2026 });
    console.log(`   Total 2026 leaves: ${total2026}`);
    
    const approvedAnd2026 = await LeaveRequest.countDocuments({ 
      status: 'approved', 
      leaveYear: 2026 
    });
    console.log(`   Approved 2026 leaves: ${approvedAnd2026}`);

    // Test the model's getLeaveBalance method
    console.log(`\n📊 Testing LeaveRequest.getLeaveBalance():`);
    const balance = await LeaveRequest.getLeaveBalance(employeeIdString, 2026);
    console.log(`   Result:`, balance);

    // Test direct query with string ID
    console.log(`\n🔍 Testing direct query with string ID:`);
    const directQueryString = await LeaveRequest.find({
      employee: employeeIdString,
      status: 'approved',
      leaveYear: 2026
    });
    console.log(`   String ID query: ${directQueryString.length} results`);

    // Test direct query with ObjectId
    console.log(`\n🔍 Testing direct query with ObjectId:`);
    const directQueryObjectId = await LeaveRequest.find({
      employee: employee._id,
      status: 'approved',
      leaveYear: 2026
    });
    console.log(`   ObjectId query: ${directQueryObjectId.length} results`);

    // Test with mongoose.Types.ObjectId conversion
    console.log(`\n🔍 Testing with explicit ObjectId conversion:`);
    const directQueryConverted = await LeaveRequest.find({
      employee: new mongoose.Types.ObjectId(employeeIdString),
      status: 'approved',
      leaveYear: 2026
    });
    console.log(`   Converted ObjectId query: ${directQueryConverted.length} results`);

    console.log('\n✅ Model method test completed!');
    
  } catch (error) {
    console.error('❌ Error testing model method:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

// Run the test
testModelMethod();