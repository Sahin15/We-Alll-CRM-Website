import mongoose from 'mongoose';
import SalaryStructure from '../src/models/salaryStructureModel.js';
import User from '../src/models/userModel.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const deleteSupersededStructure = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find Suman Das
    const sumanDas = await User.findOne({ name: 'Suman Das' });
    if (!sumanDas) {
      console.log('❌ Suman Das not found');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`\n👤 Found Suman Das (ID: ${sumanDas._id})`);

    // Find all salary structures for Suman Das
    const structures = await SalaryStructure.find({ employee: sumanDas._id }).sort({ effectiveFrom: -1 });

    console.log(`\n📊 Salary structures for Suman Das:`);
    structures.forEach((structure, index) => {
      console.log(`${index + 1}. ID: ${structure._id}`);
      console.log(`   Status: ${structure.status}`);
      console.log(`   Effective From: ${new Date(structure.effectiveFrom).toLocaleDateString('en-IN')}`);
      console.log(`   Basic Salary: ₹${structure.basicSalary}`);
      console.log('');
    });

    // Find superseded structures
    const supersededStructures = structures.filter(s => s.status === 'superseded');

    if (supersededStructures.length === 0) {
      console.log('✅ No superseded salary structures found for Suman Das');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`\n🗑️  Found ${supersededStructures.length} superseded structure(s) to delete:`);
    supersededStructures.forEach((structure, index) => {
      console.log(`${index + 1}. ID: ${structure._id} - Effective From: ${new Date(structure.effectiveFrom).toLocaleDateString('en-IN')}`);
    });

    // Delete superseded structures
    const idsToDelete = supersededStructures.map(s => s._id);
    const result = await SalaryStructure.deleteMany({
      _id: { $in: idsToDelete }
    });

    console.log(`\n✅ Deleted ${result.deletedCount} superseded salary structure(s)`);

    // Show remaining structures
    const remaining = await SalaryStructure.find({ employee: sumanDas._id }).sort({ effectiveFrom: -1 });
    console.log(`\n📊 Remaining salary structures for Suman Das: ${remaining.length}`);
    remaining.forEach((structure, index) => {
      console.log(`${index + 1}. Status: ${structure.status}, Effective From: ${new Date(structure.effectiveFrom).toLocaleDateString('en-IN')}, Basic: ₹${structure.basicSalary}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

deleteSupersededStructure();
