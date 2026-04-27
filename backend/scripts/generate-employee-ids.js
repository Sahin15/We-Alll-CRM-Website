import mongoose from "mongoose";
import User from "../src/models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

const generateEmployeeId = (joiningDate, sequenceNumber) => {
  // Extract year from joining date (last 2 digits)
  const year = new Date(joiningDate).getFullYear().toString().slice(-2);
  
  // Format sequence number with leading zeros (4 digits)
  const sequence = String(sequenceNumber).padStart(4, '0');
  
  // Format: WA-YY-XXXX (e.g., WA-26-0002)
  return `WA-${year}-${sequence}`;
};

const generateEmployeeIds = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Step 1: Remove all existing employee IDs
    console.log("\n=== STEP 1: REMOVING EXISTING EMPLOYEE IDs ===\n");
    
    const allUsersWithIds = await User.find({
      employeeId: { $exists: true, $ne: null }
    }).exec();

    console.log(`Found ${allUsersWithIds.length} employees with existing IDs`);
    
    if (allUsersWithIds.length > 0) {
      console.log("Removing all existing employee IDs...\n");
      let removeCount = 0;
      
      for (const user of allUsersWithIds) {
        try {
          await User.findByIdAndUpdate(
            user._id,
            { $unset: { employeeId: "" } },
            { new: true }
          );
          removeCount++;
          console.log(`✓ ${user.name}: Removed existing ID (${user.employeeId})`);
        } catch (error) {
          console.error(`✗ ${user.name}: Failed to remove ID - ${error.message}`);
        }
      }
      
      console.log(`\nSuccessfully removed: ${removeCount} employee IDs\n`);
    }

    // Step 2: Generate new employee IDs for real employees only
    console.log("=== STEP 2: GENERATING NEW EMPLOYEE IDs ===\n");

    // Get all FULL-TIME employees with joining dates (EXCLUDE interns), sorted by joining date (oldest first)
    const employees = await User.find({
      joiningDate: { $exists: true, $ne: null },
      role: { $in: ["employee", "hod", "hr", "manager"] },
      employmentType: { $ne: "intern" } // Exclude interns
    })
      .sort({ joiningDate: 1 }) // Sort by joining date ascending (oldest first)
      .exec();

    console.log(`Found ${employees.length} full-time employees with joining dates (interns excluded)\n`);

    if (employees.length === 0) {
      console.log("No full-time employees with joining dates found");
      await mongoose.connection.close();
      return;
    }

    // Generate employee IDs with continuous sequence number starting from 0002
    // Sequence is based on joining date order (oldest employee gets 0002)
    const updates = [];
    let sequenceNumber = 2; // Start from 0002

    employees.forEach((emp, index) => {
      const newEmployeeId = generateEmployeeId(emp.joiningDate, sequenceNumber);
      
      updates.push({
        _id: emp._id,
        name: emp.name,
        employmentType: emp.employmentType || "full-time",
        newEmployeeId: newEmployeeId,
        joiningDate: emp.joiningDate,
        sequenceNumber: sequenceNumber,
      });

      sequenceNumber++; // Increment for next employee
    });

    // Display preview of changes
    console.log("=== PREVIEW OF NEW EMPLOYEE IDs ===\n");
    updates.slice(0, 10).forEach((update) => {
      console.log(`${update.name}`);
      console.log(`  Employment Type: ${update.employmentType}`);
      console.log(`  Joining Date: ${new Date(update.joiningDate).toLocaleDateString()}`);
      console.log(`  Sequence: ${update.sequenceNumber}`);
      console.log(`  New ID: ${update.newEmployeeId}`);
      console.log("");
    });

    if (updates.length > 10) {
      console.log(`... and ${updates.length - 10} more employees\n`);
    }

    // Ask for confirmation
    console.log(`Total employees to assign new IDs: ${updates.length}`);
    console.log("\nProceed with generating new employee IDs? (yes/no)");

    // For automated script, we'll proceed with the update
    // In interactive mode, you would prompt the user here
    const proceed = process.argv[2] === "--confirm";

    if (!proceed) {
      console.log("\nTo proceed with the update, run:");
      console.log("node scripts/generate-employee-ids.js --confirm\n");
      await mongoose.connection.close();
      return;
    }

    // Perform the updates
    console.log("\nGenerating new employee IDs...\n");
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        await User.findByIdAndUpdate(
          update._id,
          { employeeId: update.newEmployeeId },
          { new: true }
        );
        successCount++;
        console.log(`✓ ${update.name} (${update.employmentType}): ${update.newEmployeeId}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ ${update.name}: ${error.message}`);
      }
    }

    console.log(`\n=== FINAL SUMMARY ===`);
    console.log(`Removed existing IDs: ${allUsersWithIds.length}`);
    console.log(`Generated new IDs: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`Total: ${updates.length}`);

    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

generateEmployeeIds();
