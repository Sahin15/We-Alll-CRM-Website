import mongoose from 'mongoose';
import SalaryStructure from '../src/models/salaryStructureModel.js';
import User from '../src/models/userModel.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const deleteTestSalaryStructures = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find salary structures for employees named "Test"
    const testStructures = await SalaryStructure.find().populate('employee');

    const testStructuresToDelete = testStructures.filter(s => 
      s.employee?.name?.toLowerCase() === 'test' || 
      s.notes?.toLowerCase().includes('test')
    );

    console.log(`\n📋 Found ${testStructuresToDelete.length} test salary structure(s):`);
    testStructuresToDelete.forEach((structure, index) => {
      console.log(`${index + 1}. ID: ${structure._id}`);
      console.log(`   Employee: ${structure.employee?.name || 'Unknown'}`);
      console.log(`   Status: ${structure.status}`);
      console.log(`   Notes: ${structure.notes || 'N/A'}`);
    });

    if (testStructuresToDelete.length === 0) {
      console.log('\n✅ No test salary structures found.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Delete the test structures
    const idsToDelete = testStructuresToDelete.map(s => s._id);
    const result = await SalaryStructure.deleteMany({
      _id: { $in: idsToDelete }
    });

    console.log(`\n✅ Deleted ${result.deletedCount} test salary structure(s)`);

    // Show remaining structures
    const remaining = await SalaryStructure.find().populate('employee').select('employee status effectiveFrom notes').sort({ createdAt: -1 });
    console.log(`\n📊 Remaining salary structures: ${remaining.length}`);
    remaining.forEach((structure, index) => {
      console.log(`${index + 1}. ${structure.employee?.name || 'Unknown'} - Status: ${structure.status}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

deleteTestSalaryStructures();
