import api from './axios';

const taskApi = {
  // Get my tasks
  getMyTasks: (params = {}) => {
    return api.get('/tasks/my-tasks', { params });
  },

  // Get task by ID
  getTaskById: (id) => {
    return api.get(`/tasks/${id}`);
  },

  // Create task
  createTask: (taskData) => {
    return api.post('/tasks', taskData);
  },

  // Update task
  updateTask: (id, taskData) => {
    return api.put(`/tasks/${id}`, taskData);
  },

  // Update task status
  updateTaskStatus: (id, status, note) => {
    return api.put(`/tasks/${id}/status`, { status, note });
  },

  // Add comment
  addComment: (id, text) => {
    return api.post(`/tasks/${id}/comments`, { text });
  },

  // Add time entry
  addTimeEntry: (id, timeEntry) => {
    return api.post(`/tasks/${id}/time-entries`, timeEntry);
  },

  // Get task stats
  getTaskStats: () => {
    return api.get('/tasks/stats');
  },

  // Get tasks by date range
  getTasksByDateRange: (startDate, endDate, status) => {
    return api.get('/tasks/by-date-range', {
      params: { startDate, endDate, status }
    });
  },

  // Delete task (admin only)
  deleteTask: (id) => {
    return api.delete(`/tasks/${id}`);
  }
};

export default taskApi;
