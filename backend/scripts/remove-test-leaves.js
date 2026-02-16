import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function removeTestLeaves() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const LeaveRequest = mongoose.model('LeaveRequest', new mongoose.Schema({
      employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      leaveType: String,
      startDate: Date,
      endDate: Date,
      reason: String,
      status: String,
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: Date,
      updatedAt: Date
    }));
    
    const User = mongoose.model('User', new mongoose.Schema({ 
      name: String, 
      email: String 
    }));
    
    console.log('🔍 Searching for test leave requests...\n');
    console.log('='.repeat(80));
    
    // Find all leave requests with "test" in the reason (case-insensitive)
    const testLeaves = await LeaveRequest.find({
      reason: { $regex: /test/i }
    }).populate('employee', 'name email');
    
    console.log(`\nFound ${testLeaves.length} leave request(s) with "test" in reason\n`);
    
    if (testLeaves.length === 0) {
      console.log('✅ No test leave requests found');
      
      // Also check for Suman Das specifically
      const suman = await User.findOne({ email: /sumanwealll/i });
      if (suman) {
        console.log('\n📋 Checking all leave requests for Suman Das...');
        const sumanLeaves = await LeaveRequest.find({ employee: suman._id });
        
        if (sumanLeaves.length === 0) {
          console.log('✅ Suman Das has no leave requests');
        } else {
          console.log(`\n⚠️  Found ${sumanLeaves.length} leave request(s) for Suman Das:\n`);
          
          for (const leave of sumanLeaves) {
            console.log(`Leave Request:`);
            console.log(`  ID: ${leave._id}`);
            console.log(`  Type: ${leave.leaveType}`);
            console.log(`  Start: ${new Date(leave.startDate).toLocaleDateString('en-IN')}`);
            console.log(`  End: ${new Date(leave.endDate).toLocaleDateString('en-IN')}`);
            console.log(`  Reason: ${leave.reason}`);
            console.log(`  Status: ${leave.status}`);
            console.log(`  Created: ${new Date(leave.createdAt).toLocaleString('en-IN')}`);
            console.log();
          }
          
          console.log('❓ Do you want to delete ALL of Suman Das\'s leave requests?');
          console.log('   Run this script with --delete-suman flag to delete them');
        }
      }
    } else {
      // Show all test leaves
      for (const leave of testLeaves) {
        console.log(`Test Leave Request:`);
        console.log(`  Employee: ${leave.employee?.name || 'Unknown'} (${leave.employee?.email || 'N/A'})`);
        console.log(`  ID: ${leave._id}`);
        console.log(`  Type: ${leave.leaveType}`);
        console.log(`  Start: ${new Date(leave.startDate).toLocaleDateString('en-IN')}`);
        console.log(`  End: ${new Date(leave.endDate).toLocaleDateString('en-IN')}`);
        console.log(`  Reason: ${leave.reason}`);
        console.log(`  Status: ${leave.status}`);
        console.log(`  Created: ${new Date(leave.createdAt).toLocaleString('en-IN')}`);
        console.log();
      }
      
      // Check if --delete flag is provided
      if (process.argv.includes('--delete')) {
        console.log('🗑️  Deleting test leave requests...\n');
        
        for (const leave of testLeaves) {
          await LeaveRequest.deleteOne({ _id: leave._id });
          console.log(`✅ Deleted: ${leave.employee?.name || 'Unknown'} - ${leave.leaveType} (${leave.reason})`);
        }
        
        console.log(`\n✅ Deleted ${testLeaves.length} test leave request(s)`);
      } else {
        console.log('⚠️  To delete these test leaves, run:');
        console.log('   node backend/scripts/remove-test-leaves.js --delete');
      }
    }
    
    // Check for Suman Das specifically if --delete-suman flag
    if (process.argv.includes('--delete-suman')) {
      const suman = await User.findOne({ email: /sumanwealll/i });
      if (suman) {
        console.log('\n🗑️  Deleting ALL leave requests for Suman Das...\n');
        
        const result = await LeaveRequest.deleteMany({ employee: suman._id });
        console.log(`✅ Deleted ${result.deletedCount} leave request(s) for Suman Das`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

removeTestLeaves();
