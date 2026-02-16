import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Define User schema
const User = mongoose.model('User', new mongoose.Schema({ 
  name: String, 
  email: String,
  employeeId: String
}));

// Import models
import('../src/models/salarySlipModel.js').then(async ({ default: SalarySlip }) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🗑️  DELETING FEBRUARY 2026 SALARY SLIPS');
    console.log('='.repeat(80));
    
    // Find all salary slips for February 2026
    const februarySlips = await SalarySlip.find({
      month: 2,
      year: 2026
    }).populate('employee', 'name email employeeId');
    
    console.log(`📊 Found ${februarySlips.length} salary slip(s) for February 2026\n`);
    
    if (februarySlips.length === 0) {
      console.log('✅ No salary slips found for February 2026');
      return;
    }
    
    // List all slips to be deleted
    console.log('📋 Salary slips to be deleted:\n');
    februarySlips.forEach((slip, index) => {
      console.log(`${index + 1}. ${slip.employee?.name || 'Unknown'} (${slip.employee?.employeeId || 'N/A'})`);
      console.log(`   Status: ${slip.status}`);
      console.log(`   Net Salary: ₹${slip.netSalary?.toLocaleString('en-IN') || 0}`);
      if (slip.pdfUrl) {
        console.log(`   PDF: ${slip.pdfUrl}`);
      }
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('\n⚠️  WARNING: This will permanently delete all February 2026 salary slips!');
    console.log('   This action cannot be undone.\n');
    
    // Delete associated PDF files
    let pdfDeletedCount = 0;
    let pdfFailedCount = 0;
    
    for (const slip of februarySlips) {
      if (slip.pdfUrl) {
        const pdfPath = path.join(process.cwd(), slip.pdfUrl.replace('/uploads', 'uploads'));
        if (fs.existsSync(pdfPath)) {
          try {
            fs.unlinkSync(pdfPath);
            pdfDeletedCount++;
            console.log(`✅ Deleted PDF: ${slip.pdfUrl}`);
          } catch (error) {
            pdfFailedCount++;
            console.error(`❌ Failed to delete PDF: ${slip.pdfUrl}`, error.message);
          }
        }
      }
    }
    
    // Delete salary slips from database
    const result = await SalarySlip.deleteMany({
      month: 2,
      year: 2026
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ DELETION COMPLETE!');
    console.log(`   Salary Slips Deleted: ${result.deletedCount}`);
    console.log(`   PDF Files Deleted: ${pdfDeletedCount}`);
    if (pdfFailedCount > 0) {
      console.log(`   PDF Deletion Failed: ${pdfFailedCount}`);
    }
    console.log('\n   All February 2026 salary slips have been removed from the system.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
