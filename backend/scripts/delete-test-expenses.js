import mongoose from 'mongoose';
import Expense from '../src/models/expenseModel.js';
import dotenv from 'dotenv';

dotenv.config();

const deleteTestExpenses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    

    // Set the cutoff date to March 15, 2026 at 23:59:59
    const cutoffDate = new Date('2026-03-15T23:59:59Z');
    
    }`);

    // Delete expenses where createdAt is on or before March 15, 2026
    const result = await Expense.deleteMany({
      createdAt: { $lte: cutoffDate }
    });

    
    :`);

    // Show remaining expenses
    const remaining = await Expense.find({
      createdAt: { $gt: cutoffDate }
    }).select('_id employee category amount date createdAt').sort({ createdAt: -1 });

    
    remaining.forEach(expense => {
      })`);
    });

    
    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

deleteTestExpenses();
