import mongoose from 'mongoose';
import SalaryStructure from '../src/models/salaryStructureModel.js';
import User from '../src/models/userModel.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const listAllSalaryStructures = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all salary structures
    const structures = await SalaryStructure.find().populate('employee').select('employee status effectiveFrom notes basicSalary grossSalary netSalary').sort({ createdAt: -1 });

    console.log(`\n📊 Total salary structures: ${structures.length}\n`);
    structures.forEach((structure, index) => {
      console.log(`${index + 1}. Employee: ${structure.employee?.name || 'Unknown'}`);
      console.log(`   ID: ${structure._id}`);
      console.log(`   Status: ${structure.status}`);
      console.log(`   Effective From: ${new Date(structure.effectiveFrom).toLocaleDateString('en-IN')}`);
      console.log(`   Basic Salary: ₹${structure.basicSalary}`);
      console.log(`   Gross Salary: ₹${structure.grossSalary}`);
      console.log(`   Net Salary: ₹${structure.netSalary}`);
      console.log(`   Notes: ${structure.notes || 'N/A'}`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log('✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

listAllSalaryStructures();
