import mongoose from "mongoose";

// Suppress Mongoose duplicate index warnings
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
  } catch (error) {
    
    process.exit(1); // Stop the server if DB connection fails
  }
};

export default connectDB;
