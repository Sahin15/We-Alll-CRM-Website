import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveRequest from '../src/models/leaveRequestModel.js';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const debugCompoundQuery = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get the first approved leave
    const firstLeave = await LeaveRequest.findOne({ status: 'approved' });
    console.log(`\n🎯 Testing with leave ID: ${firstLeave._id}`);
    console.log(`   Employee: ${firstLeave.employee}`);
    console.log(`   Status: ${firstLeave.status}`);
    console.log(`   LeaveYear: ${firstLeave.leaveYear}`);

    // Test individual conditions
    console.log(`\n🔍 Testing individual query conditions:`);
    
    const employeeQuery = await LeaveRequest.find({ employee: firstLeave.employee });
    console.log(`   employee only: ${employeeQuery.length} results`);
    
    const statusQuery = await LeaveRequest.find({ status: 'approved' });
    console.log(`   status only: ${statusQuery.length} results`);
    
    const yearQuery = await LeaveRequest.find({ leaveYear: 2026 });
    console.log(`   leaveYear only: ${yearQuery.length} results`);

    // Test two-condition combinations
    console.log(`\n🔍 Testing two-condition combinations:`);
    
    const empStatusQuery = await LeaveRequest.find({ 
      employee: firstLeave.employee, 
      status: 'approved' 
    });
    console.log(`   employee + status: ${empStatusQuery.length} results`);
    
    const empYearQuery = await LeaveRequest.find({ 
      employee: firstLeave.employee, 
      leaveYear: 2026 
    });
    console.log(`   employee + leaveYear: ${empYearQuery.length} results`);
    
    const statusYearQuery = await LeaveRequest.find({ 
      status: 'approved', 
      leaveYear: 2026 
    });
    console.log(`   status + leaveYear: ${statusYearQuery.length} results`);

    // Test the full three-condition query
    console.log(`\n🔍 Testing full three-condition query:`);
    const fullQuery = await LeaveRequest.find({ 
      employee: firstLeave.employee, 
      status: 'approved', 
      leaveYear: 2026 
    });
    console.log(`   employee + status + leaveYear: ${fullQuery.length} results`);

    // Let's check if there are any indexes that might be causing issues
    console.log(`\n🔍 Checking collection indexes:`);
    const indexes = await LeaveRequest.collection.getIndexes();
    console.log(`   Indexes:`, Object.keys(indexes));
    for (const [name, index] of Object.entries(indexes)) {
      console.log(`     ${name}:`, index);
    }

    // Try using explain to see what's happening
    console.log(`\n🔍 Query execution plan:`);
    const explainResult = await LeaveRequest.find({ 
      employee: firstLeave.employee, 
      status: 'approved', 
      leaveYear: 2026 
    }).explain('executionStats');
    
    console.log(`   Execution stats:`, {
      totalDocsExamined: explainResult.executionStats.totalDocsExamined,
      totalDocsReturned: explainResult.executionStats.totalDocsReturned,
      executionTimeMillis: explainResult.executionStats.executionTimeMillis,
      indexesUsed: explainResult.executionStats.executionStages?.indexName || 'none'
    });

    // Try with explicit ObjectId conversion
    console.log(`\n🔍 Testing with explicit ObjectId conversion:`);
    const explicitQuery = await LeaveRequest.find({ 
      employee: new mongoose.Types.ObjectId(firstLeave.employee), 
      status: 'approved', 
      leaveYear: Number(2026)
    });
    console.log(`   Explicit conversion: ${explicitQuery.length} results`);

    // Try aggregation pipeline
    console.log(`\n🔍 Testing with aggregation pipeline:`);
    const aggResult = await LeaveRequest.aggregate([
      {
        $match: {
          employee: firstLeave.employee,
          status: 'approved',
          leaveYear: 2026
        }
      }
    ]);
    console.log(`   Aggregation result: ${aggResult.length} results`);

    // Check if there are any hidden characters or data issues
    console.log(`\n🔍 Raw field inspection:`);
    const rawDoc = await LeaveRequest.findById(firstLeave._id).lean();
    console.log(`   Raw employee field:`, JSON.stringify(rawDoc.employee));
    console.log(`   Raw status field:`, JSON.stringify(rawDoc.status));
    console.log(`   Raw leaveYear field:`, JSON.stringify(rawDoc.leaveYear));
    console.log(`   Employee field type:`, typeof rawDoc.employee);
    console.log(`   Status field type:`, typeof rawDoc.status);
    console.log(`   LeaveYear field type:`, typeof rawDoc.leaveYear);

    console.log('\n✅ Compound query debug completed!');
    
  } catch (error) {
    console.error('❌ Error in debug:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

// Run the debug
debugCompoundQuery();