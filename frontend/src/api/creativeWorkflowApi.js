import api from "../services/api";

/**
 * Creative workflow API (Graphic Design / Video + Posting handoff)
 */
const creativeWorkflowApi = {
  listRevisions: async (workItemId) => {
    const response = await api.get(`/creative-workflow/${workItemId}/revisions`);
    return response.data;
  },

  startWork: async (workItemId) => {
    const response = await api.post(`/creative-workflow/${workItemId}/start`);
    return response.data;
  },

  submitForReview: async (workItemId, body = {}) => {
    const response = await api.post(
      `/creative-workflow/${workItemId}/submit-review`,
      body
    );
    return response.data;
  },

  recordReview: async (workItemId, body) => {
    const response = await api.post(`/creative-workflow/${workItemId}/review`, body);
    return response.data;
  },

  startRework: async (workItemId) => {
    const response = await api.post(`/creative-workflow/${workItemId}/rework`);
    return response.data;
  },

  recordQa: async (workItemId, body) => {
    const response = await api.post(`/creative-workflow/${workItemId}/qa`, body);
    return response.data;
  },

  markDelivered: async (workItemId) => {
    const response = await api.post(`/creative-workflow/${workItemId}/deliver`);
    return response.data;
  },

  closeTask: async (workItemId) => {
    const response = await api.post(`/creative-workflow/${workItemId}/close`);
    return response.data;
  },

  addRevisionAttachment: async (workItemId, fileMeta) => {
    const response = await api.post(
      `/creative-workflow/${workItemId}/revisions/attachments`,
      fileMeta
    );
    return response.data;
  },

  setPostingHandoff: async (workItemId, body) => {
    const response = await api.put(`/creative-workflow/${workItemId}/posting`, body);
    return response.data;
  },

  submitPostingDone: async (workItemId, body) => {
    const response = await api.post(
      `/creative-workflow/${workItemId}/posting/submit`,
      body
    );
    return response.data;
  },
};

export default creativeWorkflowApi;
