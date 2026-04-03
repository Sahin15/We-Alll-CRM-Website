import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixLeadEmailIndex = async () => {
  try {
    
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    

    const db = mongoose.connection.db;
    
    // Get the leads collection
    const collection = db.collection("leads");
    
    // Drop the existing email index if it exists
    try {
      await collection.dropIndex("email_1");
      
    } catch (err) {
      if (err.code === 27) {
        ");
      } else {
        
      }
    }

    // Remove all empty email values and set them to null instead
    const result = await collection.updateMany(
      { email: "" },
      { $set: { email: null } }
    );
    

    // Create a sparse index on email (allows multiple null values)
    await collection.createIndex(
      { email: 1 },
      { sparse: true, unique: false }
    );
    

    
    process.exit(0);
  } catch (error) {
    
    process.exit(1);
  }
};

fixLeadEmailIndex();
