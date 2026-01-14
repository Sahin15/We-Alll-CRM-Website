import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const testFeedbackDirect = async () => {
  try {
    console.log("🔐 Testing feedback API directly...");

    // Test feedback submission without authentication first to see the error
    console.log("📤 Testing feedback submission without auth...");
    const feedbackData = {
      category: "bug_report",
      title: "Direct API Test Feedback",
      description: "This is a test feedback submission via API without authentication.",
      priority: "medium",
      isAnonymous: false,
      tags: "test,api,debug"
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
      console.log("✅ Unexpected success:", response.data);
    } catch (error) {
      console.log("❌ Expected auth error:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }

    // Test with a fake token to see server response
    console.log("📤 Testing with fake token...");
    try {
      const response = await axios.post(
        `${API_BASE_URL}/feedback`,
        feedbackData,
        {
          headers: {
            Authorization: `Bearer fake-token`,
            "Content-Type": "application/json"
          }
        }
      );
      console.log("✅ Unexpected success with fake token:", response.data);
    } catch (error) {
      console.log("❌ Expected token error:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
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

testFeedbackDirect();