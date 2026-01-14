import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = "http://localhost:5000/api";

const testFeedbackAPI = async () => {
  try {
    console.log("🔐 Testing feedback API...");

    // First, login to get a token
    console.log("📝 Logging in...");
    const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
      email: "rakeshwealll@gmail.com",
      password: "password123"
    });

    const token = loginResponse.data.token;
    console.log("✅ Login successful");

    // Test feedback submission without files
    console.log("📤 Testing feedback submission without files...");
    const feedbackData = {
      category: "bug_report",
      title: "API Test Feedback",
      description: "This is a test feedback submission via API without files.",
      priority: "medium",
      isAnonymous: false,
      tags: "test,api,debug"
    };

    const response = await axios.post(
      `${API_BASE_URL}/feedback`,
      feedbackData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Feedback submitted successfully:", {
      id: response.data.feedback._id,
      title: response.data.feedback.title,
      status: response.data.feedback.status
    });

    // Test fetching my feedback
    console.log("📋 Testing fetch my feedback...");
    const myFeedbackResponse = await axios.get(
      `${API_BASE_URL}/feedback/my-feedback`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log("✅ My feedback fetched:", {
      count: myFeedbackResponse.data.feedback.length,
      total: myFeedbackResponse.data.pagination.total
    });

    // Clean up - delete the test feedback
    const feedbackId = response.data.feedback._id;
    await axios.delete(`${API_BASE_URL}/feedback/${feedbackId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("🧹 Test feedback deleted");

  } catch (error) {
    console.error("❌ Error testing feedback API:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
};

testFeedbackAPI();