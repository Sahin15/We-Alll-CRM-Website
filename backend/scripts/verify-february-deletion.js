import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
    
    console.log('🔍 VERIFYING FEBRUARY 2026 SALARY SLIPS DELETION');
    console.log('='.repeat(80));
    
    // Check for any remaining February 2026 slips
    const februarySlips = await SalarySlip.find({
      month: 2,
      year: 2026
    });
    
    if (februarySlips.length === 0) {
      console.log('✅ SUCCESS: No salary slips found for February 2026');
      console.log('   All February 2026 salary slips have been successfully deleted.\n');
    } else {
      console.log(`⚠️  WARNING: Found ${februarySlips.length} remaining salary slip(s) for February 2026`);
      februarySlips.forEach((slip, index) => {
        console.log(`${index + 1}. Employee ID: ${slip.employee}, Status: ${slip.status}`);
      });
    }
    
    // Show count of slips for other months
    const allSlips = await SalarySlip.aggregate([
      {
        $group: {
          _id: { month: '$month', year: '$year' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      }
    ]);
    
    if (allSlips.length > 0) {
      console.log('\n📊 Salary slips in database (by month):');
      allSlips.forEach(item => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        console.log(`   ${monthNames[item._id.month - 1]} ${item._id.year}: ${item.count} slip(s)`);
      });
    } else {
      console.log('\n📊 No salary slips found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
});
