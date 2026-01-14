import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Feedback from "../src/models/feedbackModel.js";
import User from "../src/models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const testFeedbackSubmission = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find a test user
    const testUser = await User.findOne({ role: "employee" });
    if (!testUser) {
      console.log("❌ No employee user found for testing");
      return;
    }
    console.log(`👤 Using test user: ${testUser.name} (${testUser.email})`);

    // Test feedback data (without files)
    const feedbackData = {
      employee: testUser._id,
      category: "bug_report",
      title: "Test Feedback Submission",
      description: "This is a test feedback to debug the submission process.",
      priority: "medium",
      isAnonymous: false,
      tags: ["test", "debug"]
    };

    console.log("📝 Creating feedback...");
    const feedback = await Feedback.create(feedbackData);
    console.log("✅ Feedback created successfully:", {
      id: feedback._id,
      title: feedback.title,
      category: feedback.category,
      status: feedback.status
    });

    // Test fetching feedback
    console.log("📋 Fetching feedback...");
    const fetchedFeedback = await Feedback.findById(feedback._id)
      .populate('employee', 'name email');
    console.log("✅ Feedback fetched:", {
      id: fetchedFeedback._id,
      title: fetchedFeedback.title,
      employee: fetchedFeedback.employee?.name
    });

    // Clean up
    await Feedback.findByIdAndDelete(feedback._id);
    console.log("🧹 Test feedback deleted");

  } catch (error) {
    console.error("❌ Error testing feedback submission:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

testFeedbackSubmission();