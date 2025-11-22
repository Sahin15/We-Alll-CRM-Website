import api from "./axios";

// Announcement Management APIs
export const announcementApi = {
  getAllAnnouncements: () => api.get("/announcements"),
  getAnnouncementById: (id) => api.get(`/announcements/${id}`),
  createAnnouncement: (data) => api.post("/announcements", data),
  updateAnnouncement: (id, data) => api.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/announcements/${id}`),
};

export default announcementApi;
