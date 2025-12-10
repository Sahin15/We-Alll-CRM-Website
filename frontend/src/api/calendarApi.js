import api from './api';

const calendarApi = {
  // Get calendar events with filters
  getCalendarEvents: async (params = {}) => {
    const response = await api.get('/calendar/events', { params });
    return response.data;
  },

  // Get department-specific calendar
  getDepartmentCalendar: async (departmentId, params = {}) => {
    const response = await api.get(`/calendar/department/${departmentId}`, { params });
    return response.data;
  },

  // Get project timeline
  getProjectTimeline: async (projectId, params = {}) => {
    const response = await api.get(`/calendar/project/${projectId}/timeline`, { params });
    return response.data;
  },

  // Create calendar event
  createCalendarEvent: async (eventData) => {
    const response = await api.post('/calendar/events', eventData);
    return response.data;
  },

  // Update calendar event
  updateCalendarEvent: async (eventId, eventData) => {
    const response = await api.put(`/calendar/events/${eventId}`, eventData);
    return response.data;
  },

  // Delete calendar event
  deleteCalendarEvent: async (eventId) => {
    const response = await api.delete(`/calendar/events/${eventId}`);
    return response.data;
  },

  // Get workflow analytics
  getWorkflowAnalytics: async (params = {}) => {
    const response = await api.get('/calendar/analytics/workflow', { params });
    return response.data;
  },
};

export default calendarApi;