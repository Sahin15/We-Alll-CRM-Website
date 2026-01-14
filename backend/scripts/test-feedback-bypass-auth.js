import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const testFeedbackBypassAuth = async () => {
  try {
    console.log("🔐 Testing feedback API with temporary auth bypass...");

    // We'll temporarily modify the feedback controller to bypass auth for testing
    console.log("📝 Note: This test requires temporarily commenting out the 'protect' middleware in feedbackRoutes.js");
    
    // Test feedback submission
    console.log("📤 Testing feedback submission...");
    const feedbackData = {
      category: "bug_report",
      title: "Test Feedback - Auth Bypass",
      description: "This is a test feedback submission to debug the API.",
      priority: "medium",
      isAnonymous: false,
      tags: "test,debug"
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/feedback`,
        feedbackData,
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
      console.log("✅ Feedback submitted successfully:", {
        id: response.data.feedback._id,
        title: response.data.feedback.title,
        status: response.data.feedback.status
      });
    } catch (error) {
      console.log("❌ Feedback submission failed:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
    }

  } catch (error) {
    console.error("❌ Error testing feedback API:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
};

console.log("⚠️  To run this test, temporarily comment out 'protect,' in the feedback POST route in feedbackRoutes.js");
console.log("⚠️  Then uncomment it after testing!");
testFeedbackBypassAuth();