import mongoose from "mongoose";
import Expense from "../src/models/expenseModel.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the backend directory
dotenv.config({ path: path.join(__dirname, "../.env") });

// Mapping from old category to new Purpose/Type combination
const categoryMapping = {
  travel: { expensePurpose: "travel_visit", expenseType: "travel" },
  food: { expensePurpose: "internal_office", expenseType: "food" },
  accommodation: { expensePurpose: "travel_visit", expenseType: "hotel" },
  office_supplies: { expensePurpose: "internal_office", expenseType: "materials" },
  client_meeting: { expensePurpose: "existing_client", expenseType: "food" },
  training: { expensePurpose: "training", expenseType: "materials" },
  other: { expensePurpose: "internal_office", expenseType: "miscellaneous" },
};

async function migrateExpenses() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/crm-db";
    console.log("🔗 Connecting to MongoDB...");
    console.log(`📍 Connection string: ${mongoUri.substring(0, 50)}...`);
    console.log(`📁 .env path: ${path.join(__dirname, "../.env")}`);
    console.log(`🔑 MONGO_URI from env: ${process.env.MONGO_URI ? "✅ Loaded" : "❌ Not loaded"}`);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB");

    // Get all expenses with old category field
    const expenses = await Expense.find({ category: { $exists: true, $ne: null } });
    console.log(`\n📊 Found ${expenses.length} expenses to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const expense of expenses) {
      try {
        const mapping = categoryMapping[expense.category];
        
        if (!mapping) {
          console.warn(`⚠️  Unknown category: ${expense.category} for expense ${expense._id}`);
          errorCount++;
          continue;
        }

        // Update expense with new fields
        expense.expensePurpose = mapping.expensePurpose;
        expense.expenseType = mapping.expenseType;
        // Keep old category for reference
        
        await expense.save();
        successCount++;

        if (successCount % 100 === 0) {
          console.log(`✅ Migrated ${successCount} expenses...`);
        }
      } catch (error) {
        console.error(`❌ Error migrating expense ${expense._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Successfully migrated: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Total: ${successCount + errorCount}`);

    // Show summary of migrations
    const summary = await Expense.aggregate([
      {
        $group: {
          _id: { purpose: "$expensePurpose", type: "$expenseType" },
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log(`\n📈 Migration Summary by Purpose/Type:`);
    summary.forEach((item) => {
      console.log(
        `   ${item._id.purpose} / ${item._id.type}: ${item.count} expenses (₹${item.total.toFixed(2)})`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateExpenses();
