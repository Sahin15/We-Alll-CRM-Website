import api from '../services/api';

export const workApi = {
  // Get all work items (tasks + slots)
  getMyWork: async () => {
    const response = await api.get('/work/my-work');
    return response.data;
  }
};

export default workApi;
