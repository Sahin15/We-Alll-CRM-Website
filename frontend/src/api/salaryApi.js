import api from "../services/api";

// Salary Structure APIs
export const salaryStructureApi = {
  // Create salary structure
  create: (data) => api.post("/salary-structures", data),

  // Get all salary structures
  getAll: (params) => api.get("/salary-structures", { params }),

  // Get salary structure by ID
  getById: (id) => api.get(`/salary-structures/${id}`),

  // Get active salary structure for employee
  getActive: (employeeId) => api.get(`/salary-structures/employee/${employeeId}/active`),
  
  // Get active salary structure for employee (alternative method name)
  getActiveStructure: (employeeId) => api.get(`/salary-structures/employee/${employeeId}/active`),

  // Get salary structure history
  getHistory: (employeeId) => api.get(`/salary-structures/employee/${employeeId}/history`),

  // Update salary structure
  update: (id, data) => api.put(`/salary-structures/${id}`, data),

  // Activate salary structure
  activate: (id) => api.put(`/salary-structures/${id}/activate`),

  // Delete salary structure
  delete: (id) => api.delete(`/salary-structures/${id}`),
};

// Salary Slip APIs
export const salarySlipApi = {
  // Generate single salary slip
  generate: (data) => api.post("/salary-slips/generate", data),

  // Generate bulk salary slips
  generateBulk: (data) => api.post("/salary-slips/generate-bulk", data),

  // Get all salary slips (HR/Admin)
  getAll: (params) => api.get("/salary-slips", { params }),

  // Get employee's own salary slips
  getMySlips: (params) => api.get("/salary-slips/my-slips", { params }),
  
  // Get salary slips for specific employee (HR/Admin)
  getEmployeeSlips: (employeeId, params) => api.get(`/salary-slips/employee/${employeeId}`, { params }),

  // Get salary slip by ID
  getById: (id) => api.get(`/salary-slips/${id}`),

  // Download salary slip PDF
  downloadPDF: (id) => {
    return api.get(`/salary-slips/${id}/download-pdf`, {
      responseType: "blob",
    });
  },

  // Send salary slip email
  sendEmail: (id) => api.post(`/salary-slips/${id}/send-email`),

  // Send bulk emails
  sendBulkEmails: (data) => api.post("/salary-slips/send-bulk-emails", data),

  // Update salary slip
  update: (id, data) => api.put(`/salary-slips/${id}`, data),

  // Mark as paid
  markAsPaid: (id) => api.put(`/salary-slips/${id}/mark-paid`),

  // Delete salary slip
  delete: (id) => api.delete(`/salary-slips/${id}`),

  // Track download
  trackDownload: (id) => api.post(`/salary-slips/${id}/track-download`),

  // Get payroll summary
  getPayrollSummary: (params) => api.get("/salary-slips/reports/payroll-summary", { params }),
};

// Salary Preview APIs
export const salaryPreviewApi = {
  // Get employee's own preview
  getMyPreview: (month, year) => api.get(`/salary-preview/my-preview/${month}/${year}`),

  // Get all previews for a month (HR/Admin)
  getMonthPreviews: (month, year) => api.get(`/salary-preview/month/${month}/${year}`),

  // Get previews needing attention
  getAttentionPreviews: (month, year) => api.get(`/salary-preview/attention/${month}/${year}`),

  // Get statistics
  getStatistics: (month, year) => api.get(`/salary-preview/statistics/${month}/${year}`),

  // Submit employee query
  submitQuery: (previewId, query) => api.post(`/salary-preview/${previewId}/query`, { query }),

  // Respond to query (HR)
  respondToQuery: (previewId, queryIndex, response) => 
    api.post(`/salary-preview/${previewId}/query/${queryIndex}/respond`, { response }),

  // Acknowledge preview
  acknowledge: (previewId) => api.post(`/salary-preview/${previewId}/acknowledge`),

  // Finalize preview
  finalize: (previewId) => api.post(`/salary-preview/${previewId}/finalize`),

  // Generate individual preview
  generate: (employeeId, month, year, additionalData = {}) => 
    api.post('/salary-preview/generate', { employeeId, month, year, additionalData }),

  // Bulk generate previews
  bulkGenerate: (data) => api.post('/salary-preview/bulk-generate', data),

  // Make corrections
  makeCorrections: (previewId, corrections) => api.put(`/salary-preview/${previewId}/corrections`, corrections),
};

// Salary Template APIs
export const salaryTemplateApi = {
  // Get all templates
  getAll: () => api.get('/salary-templates'),

  // Get template by ID
  getById: (id) => api.get(`/salary-templates/${id}`),

  // Create template
  create: (data) => api.post('/salary-templates', data),

  // Update template
  update: (id, data) => api.put(`/salary-templates/${id}`, data),

  // Delete template
  delete: (id) => api.delete(`/salary-templates/${id}`),

  // Apply template to employees
  apply: (templateId, data) => api.post(`/salary-templates/${templateId}/apply`, data),

  // Bulk apply template
  bulkApply: (templateId, data) => api.post(`/salary-templates/${templateId}/bulk-apply`, data),

  // Get template usage statistics
  getUsageStats: (templateId) => api.get(`/salary-templates/${templateId}/usage-stats`),

  // Get template version history
  getVersionHistory: (templateId) => api.get(`/salary-templates/${templateId}/versions`),
};

export default {
  salaryStructureApi,
  salarySlipApi,
  salaryPreviewApi,
  salaryTemplateApi,
};
