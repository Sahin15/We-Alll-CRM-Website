import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixLeadEmailIndex = async () => {
  try {
    console.log("🔧 Starting Lead Email Index Fix...");
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    
    // Get the leads collection
    const collection = db.collection("leads");
    
    // Drop the existing email index if it exists
    try {
      await collection.dropIndex("email_1");
      console.log("✅ Dropped existing email_1 index");
    } catch (err) {
      if (err.code === 27) {
        console.log("ℹ️  email_1 index doesn't exist (already dropped)");
      } else {
        console.log("⚠️  Error dropping index:", err.message);
      }
    }

    // Remove all empty email values and set them to null instead
    const result = await collection.updateMany(
      { email: "" },
      { $set: { email: null } }
    );
    console.log(`✅ Updated ${result.modifiedCount} documents with empty email to null`);

    // Create a sparse index on email (allows multiple null values)
    await collection.createIndex(
      { email: 1 },
      { sparse: true, unique: false }
    );
    console.log("✅ Created new sparse non-unique index on email field");

    console.log("✅ Lead Email Index Fix completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing lead email index:", error);
    process.exit(1);
  }
};

fixLeadEmailIndex();
