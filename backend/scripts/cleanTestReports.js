import dotenv from "dotenv";
import mongoose from "mongoose";
import ProjectMonth from "../src/models/projectMonthModel.js";
import ProjectActivityLog from "../src/models/projectActivityLogModel.js";

dotenv.config();

const cleanTestReports = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI environment variable not found.");
      process.exit(1);
    }

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const monthResult = await ProjectMonth.deleteMany({});
    console.log(`Deleted ${monthResult.deletedCount} ProjectMonth test report records.`);

    const activityResult = await ProjectActivityLog.deleteMany({});
    console.log(`Deleted ${activityResult.deletedCount} ProjectActivityLog test activity records.`);

    console.log("Cleanup completed successfully.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Cleanup error:", error);
    process.exit(1);
  }
};

cleanTestReports();
