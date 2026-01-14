import api from "./axios";

// Feedback Management APIs
export const feedbackApi = {
  // Employee APIs
  createFeedback: (data) => {
    const config = {};
    if (data instanceof FormData) {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }
    return api.post("/feedback", data, config);
  },
  
  getMyFeedback: (params = {}) => api.get("/feedback/my-feedback", { params }),
  
  toggleUpvote: (feedbackId) => api.post(`/feedback/${feedbackId}/upvote`),
  
  // Admin/HR APIs
  getAllFeedback: (params = {}) => api.get("/feedback", { params }),
  
  getFeedbackById: (id) => api.get(`/feedback/${id}`),
  
  updateFeedback: (id, data) => api.put(`/feedback/${id}`, data),
  
  deleteFeedback: (id) => api.delete(`/feedback/${id}`),
  
  getFeedbackStatistics: () => api.get("/feedback/statistics"),
  
  getTrendingFeedback: (limit = 10) => api.get("/feedback/trending", { params: { limit } }),
  
  // Utility functions
  getFeedbackCategories: () => [
    { value: "bug_report", label: "Bug Report", icon: "🐛", color: "danger" },
    { value: "feature_request", label: "Feature Request", icon: "💡", color: "primary" },
    { value: "system_issue", label: "System Issue", icon: "⚠️", color: "warning" },
    { value: "ui_ux_feedback", label: "UI/UX Feedback", icon: "🎨", color: "info" },
    { value: "performance_issue", label: "Performance Issue", icon: "⚡", color: "warning" },
    { value: "general_complaint", label: "General Complaint", icon: "😞", color: "secondary" },
    { value: "suggestion", label: "Suggestion", icon: "💭", color: "success" },
    { value: "compliment", label: "Compliment", icon: "👏", color: "success" },
    { value: "other", label: "Other", icon: "📝", color: "secondary" }
  ],
  
  getPriorityLevels: () => [
    { value: "low", label: "Low", color: "success" },
    { value: "medium", label: "Medium", color: "warning" },
    { value: "high", label: "High", color: "danger" },
    { value: "urgent", label: "Urgent", color: "danger" }
  ],
  
  getStatusOptions: () => [
    { value: "open", label: "Open", color: "primary" },
    { value: "in_review", label: "In Review", color: "info" },
    { value: "in_progress", label: "In Progress", color: "warning" },
    { value: "resolved", label: "Resolved", color: "success" },
    { value: "closed", label: "Closed", color: "secondary" },
    { value: "rejected", label: "Rejected", color: "danger" }
  ]
};

export default feedbackApi;