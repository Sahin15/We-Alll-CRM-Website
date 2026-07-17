import api from "../services/api";

export const growthTrackApi = {
  getMyActiveTrack: () => api.get("/growth-tracks/my-active"),
  
  acknowledgeNotice: (trackId, noticeId) =>
    api.post(`/growth-tracks/${trackId}/notices/${noticeId}/acknowledge`),
    
  initiateGrowthTrack: (data) =>
    api.post("/growth-tracks/initiate", data),
    
  addWeeklyTarget: (trackId, data) =>
    api.post(`/growth-tracks/${trackId}/targets`, data),
    
  updateTargetProgress: (trackId, targetId, data) =>
    api.put(`/growth-tracks/${trackId}/targets/${targetId}`, data),
    
  logReviewMeeting: (trackId, data) =>
    api.post(`/growth-tracks/${trackId}/reviews`, data),
    
  finalizeGrowthTrack: (trackId, data) =>
    api.post(`/growth-tracks/${trackId}/finalize`, data),
    
  getAllGrowthTracks: () => api.get("/growth-tracks/all"),
  
  getManagerGrowthTracks: () => api.get("/growth-tracks/manager"),
};

export default growthTrackApi;
