import api from "../api/axios";

// Email Service for bulk operations
export const emailService = {
  // Send bulk emails to leads
  sendBulkEmail: async (emailData) => {
    const response = await api.post("/emails/bulk-send", emailData);
    return response.data;
  },

  // Get email templates
  getEmailTemplates: async () => {
    const response = await api.get("/emails/templates");
    return response.data;
  },

  // Create email template
  createEmailTemplate: async (templateData) => {
    const response = await api.post("/emails/templates", templateData);
    return response.data;
  },

  // Get email sending status
  getEmailStatus: async (batchId) => {
    const response = await api.get(`/emails/status/${batchId}`);
    return response.data;
  },

  // Preview email template
  previewEmail: async (templateData) => {
    const response = await api.post("/emails/preview", templateData);
    return response.data;
  },

  // Get email history for a lead
  getLeadEmailHistory: async (leadId, page = 1, limit = 10) => {
    const response = await api.get(`/emails/lead/${leadId}/history?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get email campaign statistics
  getEmailCampaignStats: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/emails/campaigns/stats?${params}`);
    return response.data;
  },

  // Get recent email campaigns
  getRecentEmailCampaigns: async (page = 1, limit = 20) => {
    const response = await api.get(`/emails/campaigns/recent?page=${page}&limit=${limit}`);
    return response.data;
  }
};

export default emailService;