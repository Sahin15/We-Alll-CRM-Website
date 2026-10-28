import api from "./axios";

export const metaIntegrationApi = {
  getStatus: () => api.get("/integrations/meta/status"),
  startOAuth: (reauth) => api.get("/integrations/meta/oauth/start", { params: reauth ? { reauth: "1" } : {} }),
  refreshAssets: () => api.post("/integrations/meta/assets/refresh"),
  saveSelection: (data) => api.put("/integrations/meta/selection", data),
  syncNow: () => api.post("/integrations/meta/sync", { incremental: false }),
  getSyncRuns: () => api.get("/integrations/meta/sync-runs"),
  getAnalytics: (params) => api.get("/integrations/meta/analytics", { params }),
  disconnect: () => api.post("/integrations/meta/disconnect"),
};

export default metaIntegrationApi;
