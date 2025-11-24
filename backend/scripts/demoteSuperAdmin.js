import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/userModel.js";

dotenv.config();

const demoteSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all superadmins
    const superAdmins = await User.find({ role: "superadmin" });
    
    if (superAdmins.length === 0) {
      console.log("❌ No superadmins found in database");
      process.exit(1);
    }

    if (superAdmins.length === 1) {
      console.log("✅ Only one superadmin exists (correct)");
      console.log(`   Email: ${superAdmins[0].email}`);
      console.log(`   Name: ${superAdmins[0].name}`);
      process.exit(0);
    }

    console.log(`\n⚠️  Found ${superAdmins.length} superadmins:\n`);
    superAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.email})`);
      console.log(`   ID: ${admin._id}`);
      console.log(`   Created: ${admin.createdAt}\n`);
    });

    // Ask which one to demote (you'll need to edit this)
    // CHANGE THIS: Put the email of the user you want to demote
    const emailToDemote = "weallldevelopment@gmail.com"; // <-- CHANGE THIS TO THE WRONG SUPERADMIN'S EMAIL
    const newRole = "admin"; // <-- CHANGE THIS TO THEIR ORIGINAL ROLE (client, admin, hr, employee, etc.)

    const userToDemote = superAdmins.find(u => u.email === emailToDemote);
    
    if (!userToDemote) {
      console.log(`❌ User with email "${emailToDemote}" not found`);
      console.log("   Please edit the script and set the correct email");
      process.exit(1);
    }

    // Temporarily disable the pre-save hook by directly updating
    await User.updateOne(
      { _id: userToDemote._id },
      { $set: { role: newRole } }
    );

    console.log("\n✅ User demoted successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📧 Email: ${userToDemote.email}`);
    console.log(`👤 Name: ${userToDemote.name}`);
    console.log(`🔄 Old Role: superadmin`);
    console.log(`🔄 New Role: ${newRole}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Show remaining superadmin
    const remainingSuperAdmin = superAdmins.find(u => u.email !== emailToDemote);
    console.log("\n✅ Remaining SuperAdmin:");
    console.log(`   Email: ${remainingSuperAdmin.email}`);
    console.log(`   Name: ${remainingSuperAdmin.name}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

demoteSuperAdmin();
