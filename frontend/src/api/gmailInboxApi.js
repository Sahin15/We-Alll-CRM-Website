import api from "./axios";

export const gmailInboxApi = {
  listAccounts: (signal) => api.get("/email/accounts", { signal }),
  connect: (email) => api.get("/email/gmail/connect", { params: { email } }),
  listMessages: (params, signal) => api.get("/email/messages", { params, signal }),
  getMessage: (id) => api.get(`/email/messages/${id}`),
  sync: () => api.post("/email/sync", {}, { timeout: 60000 }),
  disconnect: (id) => api.delete(`/email/accounts/${id}`),
};

export default gmailInboxApi;
