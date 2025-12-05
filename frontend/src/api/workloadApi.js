import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get workload for a single employee
 */
export const getEmployeeWorkload = async (employeeId) => {
  try {
    const response = await axios.get(
      `${API_URL}/workload/employee/${employeeId}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching employee workload:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get workload for all employees in a department
 */
export const getDepartmentWorkload = async (departmentId) => {
  try {
    const response = await axios.get(
      `${API_URL}/workload/department/${departmentId}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching department workload:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get workload for all team members in a project
 */
export const getProjectWorkload = async (projectId) => {
  try {
    const response = await axios.get(
      `${API_URL}/workload/project/${projectId}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching project workload:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get workload trends for an employee (30-day history)
 */
export const getWorkloadTrends = async (employeeId, days = 30) => {
  try {
    const response = await axios.get(
      `${API_URL}/workload/trends/${employeeId}`,
      { 
        params: { days },
        headers: getAuthHeader() 
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching workload trends:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get workload for multiple employees (batch request)
 */
export const getBatchWorkload = async (employeeIds) => {
  try {
    const response = await axios.post(
      `${API_URL}/workload/batch`,
      { employeeIds },
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching batch workload:', error);
    throw error.response?.data || error;
  }
};

export default {
  getEmployeeWorkload,
  getDepartmentWorkload,
  getProjectWorkload,
  getWorkloadTrends,
  getBatchWorkload
};
