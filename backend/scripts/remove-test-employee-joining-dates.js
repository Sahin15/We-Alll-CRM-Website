import mongoose from "mongoose";
import User from "../src/models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

const removeTestJoiningDates = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Find employees by specific names: Telecaller, Sales, Test, HR
    const testEmployeeNames = ["Telecaller", "Sales", "Test", "HR"];
    
    const testEmployees = await User.find({
      name: { $in: testEmployeeNames },
      joiningDate: { $exists: true, $ne: null }
    }).exec();

    console.log(`Found ${testEmployees.length} test employees with joining dates\n`);

    if (testEmployees.length === 0) {
      console.log("No test employees with joining dates found");
      await mongoose.connection.close();
      return;
    }

    // Display preview of changes
    console.log("=== PREVIEW OF CHANGES ===\n");
    testEmployees.forEach((emp) => {
      console.log(`${emp.name}`);
      console.log(`  Email: ${emp.email}`);
      console.log(`  Role: ${emp.role}`);
      console.log(`  Current Joining Date: ${new Date(emp.joiningDate).toLocaleDateString()}`);
      console.log(`  Action: Remove joining date\n`);
    });

    // Ask for confirmation
    console.log(`Total test employees to update: ${testEmployees.length}`);
    console.log("\nProceed with removing joining dates? (yes/no)");

    const proceed = process.argv[2] === "--confirm";

    if (!proceed) {
      console.log("\nTo proceed with the update, run:");
      console.log("node scripts/remove-test-employee-joining-dates.js --confirm\n");
      await mongoose.connection.close();
      return;
    }

    // Perform the updates
    console.log("\nRemoving joining dates...\n");
    let successCount = 0;
    let errorCount = 0;

    for (const emp of testEmployees) {
      try {
        await User.findByIdAndUpdate(
          emp._id,
          { $unset: { joiningDate: "" } },
          { new: true }
        );
        successCount++;
        console.log(`✓ ${emp.name} (${emp.role}): Joining date removed`);
      } catch (error) {
        errorCount++;
        console.error(`✗ ${emp.name}: ${error.message}`);
      }
    }

    console.log(`\n=== UPDATE SUMMARY ===`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`Total: ${testEmployees.length}`);

    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

removeTestJoiningDates();
