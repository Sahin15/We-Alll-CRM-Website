import axios from "axios";

// Production-first API URL configuration
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.PROD) {
    return '/api';
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Check if the current user's profile picture is accessible
 * @returns {Promise<Object>} Health check result
 */
export const checkProfilePictureHealth = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token");
    }

    const response = await axios.get(
      `${API_BASE_URL}/upload/profile-picture/health`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Profile picture health check failed:", error);
    throw error;
  }
};

/**
 * Check profile picture health without modifying the database.
 * Previously this auto-cleared URLs on transient failures, which removed valid uploads.
 */
export const autoFixBrokenProfilePicture = async () => {
  try {
    const health = await checkProfilePictureHealth();

    if (health.hasProfilePicture && !health.accessible && health.error) {
      console.warn("Profile picture may be missing in storage:", health.error);
    }

    return false;
  } catch (error) {
    console.error("Profile picture health check failed:", error);
    return false;
  }
};

/**
 * Start periodic health checks for profile pictures
 * @param {Function} refreshUser - Function to refresh user data
 * @param {number} intervalMs - Check interval in milliseconds (default: 30 minutes)
 * @returns {Function} Cleanup function to stop the checks
 */
export const startProfilePictureHealthMonitor = (_refreshUser, intervalMs = 30 * 60 * 1000) => {
  let isRunning = true;
  let checkCount = 0;
  
  const runCheck = async () => {
    if (!isRunning) return;
    
    try {
      // Only run health check after the first few minutes and limit frequency
      checkCount++;
      if (checkCount >= 3) {
        await autoFixBrokenProfilePicture();
      }
    } catch (error) {
      // Only log actual errors, not routine checks
      if (error.message !== "No authentication token") {
        console.error("Health monitor error:", error);
      }
    }
    
    if (isRunning) {
      setTimeout(runCheck, intervalMs);
    }
  };

  // Start the first check after a longer delay to avoid interference
  setTimeout(runCheck, 5 * 60 * 1000); // 5 minutes

  // Return cleanup function
  return () => {
    isRunning = false;
  };
};