import mongoose from 'mongoose';
import Expense from '../src/models/expenseModel.js';
import dotenv from 'dotenv';

dotenv.config();

const deleteTestExpenses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Set the cutoff date to March 15, 2026 at 23:59:59
    const cutoffDate = new Date('2026-03-15T23:59:59Z');
    
    console.log(`🗑️  Deleting all expenses created on or before: ${cutoffDate.toISOString()}`);

    // Delete expenses where createdAt is on or before March 15, 2026
    const result = await Expense.deleteMany({
      createdAt: { $lte: cutoffDate }
    });

    console.log(`✅ Deleted ${result.deletedCount} test expenses`);
    console.log(`📊 Remaining expenses (from March 16 onwards):`);

    // Show remaining expenses
    const remaining = await Expense.find({
      createdAt: { $gt: cutoffDate }
    }).select('_id employee category amount date createdAt').sort({ createdAt: -1 });

    console.log(`Total remaining: ${remaining.length}`);
    remaining.forEach(expense => {
      console.log(`  - ${expense._id}: ${expense.category} - ${expense.amount} (Created: ${expense.createdAt.toISOString()})`);
    });

    console.log('✅ Cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting test expenses:', error);
    process.exit(1);
  }
};

deleteTestExpenses();
