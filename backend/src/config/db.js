import mongoose from "mongoose";

// Suppress Mongoose duplicate index warnings
mongoose.set('strictQuery', false);

const connectDB = async () => {
  // Connection is now handled in server.js
  // This function is kept for backward compatibility but does nothing
  return;
};

export default connectDB;
