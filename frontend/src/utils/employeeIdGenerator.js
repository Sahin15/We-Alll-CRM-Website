/**
 * Generate Employee ID based on joining date and sequence number
 * Format: WA-YY-XXXX (e.g., WA-26-0002)
 * 
 * @param {Date|string} joiningDate - The employee's joining date
 * @param {number} sequenceNumber - The sequence number for the employee
 * @returns {string} - Generated employee ID
 */
export const generateEmployeeId = (joiningDate, sequenceNumber) => {
  if (!joiningDate) {
    throw new Error('Joining date is required');
  }

  if (!sequenceNumber || sequenceNumber < 1) {
    throw new Error('Sequence number must be greater than 0');
  }

  // Extract year from joining date (last 2 digits)
  const year = new Date(joiningDate).getFullYear().toString().slice(-2);
  
  // Format sequence number with leading zeros (4 digits)
  const sequence = String(sequenceNumber).padStart(4, '0');
  
  // Format: WA-YY-XXXX (e.g., WA-26-0002)
  return `WA-${year}-${sequence}`;
};

/**
 * Generate a new employee ID for an employee
 * This function gets the next sequence number from the backend
 * 
 * @param {string} joiningDate - The employee's joining date
 * @param {string} employmentType - The employment type (full-time, part-time, intern, etc.)
 * @returns {Promise<string>} - Generated employee ID
 */
export const generateNewEmployeeId = async (joiningDate, employmentType) => {
  if (!joiningDate) {
    throw new Error('Joining date is required');
  }

  // Only permanent employees (full-time) can get employee IDs
  if (employmentType !== 'full-time') {
    throw new Error('Only permanent (full-time) employees can be assigned an employee ID');
  }

  try {
    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    // Call backend to get the next sequence number
    const response = await fetch('/api/users/next-employee-id-sequence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        joiningDate,
        employmentType
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate employee ID');
    }

    const data = await response.json();
    return data.employeeId;
  } catch (error) {
    throw new Error(error.message || 'Failed to generate employee ID');
  }
};
