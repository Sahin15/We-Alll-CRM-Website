import api from './axios';

const holidayApi = {
  // Get all holidays
  getHolidays: async () => {
    const response = await api.get('/holidays');
    return response.data;
  },

  // Create new holiday (HR/Admin only)
  createHoliday: async (holidayData) => {
    const response = await api.post('/holidays', holidayData);
    return response.data;
  },

  // Update holiday (HR/Admin only)
  updateHoliday: async (id, holidayData) => {
    const response = await api.put(`/holidays/${id}`, holidayData);
    return response.data;
  },

  // Delete holiday (HR/Admin only)
  deleteHoliday: async (id) => {
    const response = await api.delete(`/holidays/${id}`);
    return response.data;
  },

  // Get upcoming holidays (next 30 days)
  getUpcomingHolidays: async () => {
    const response = await api.get('/holidays/upcoming');
    return response.data;
  }
};

export default holidayApi;