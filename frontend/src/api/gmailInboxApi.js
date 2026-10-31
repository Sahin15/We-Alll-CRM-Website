import api from "./axios";

export const gmailInboxApi = {
  listAccounts: () => api.get("/email/accounts"),
  connect: (email) => api.get("/email/gmail/connect", { params: { email } }),
  listMessages: (params) => api.get("/email/messages", { params }),
  getMessage: (id) => api.get(`/email/messages/${id}`),
  sync: () => api.post("/email/sync", {}, { timeout: 60000 }),
  disconnect: (id) => api.delete(`/email/accounts/${id}`),
};

export default gmailInboxApi;
