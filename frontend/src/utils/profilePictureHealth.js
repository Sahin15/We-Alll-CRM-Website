import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
 * Automatically fix broken profile pictures
 * @param {Function} refreshUser - Function to refresh user data
 * @returns {Promise<boolean>} True if fix was applied
 */
export const autoFixBrokenProfilePicture = async (refreshUser) => {
  try {
    const health = await checkProfilePictureHealth();
    
    if (health.hasProfilePicture && !health.accessible) {
      console.warn("Broken profile picture detected, clearing from database");
      
      const token = localStorage.getItem("token");
      if (!token) return false;

      await axios.patch(
        `${API_BASE_URL}/users/clear-broken-profile-picture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error("Auto-fix failed:", error);
    return false;
  }
};

/**
 * Start periodic health checks for profile pictures
 * @param {Function} refreshUser - Function to refresh user data
 * @param {number} intervalMs - Check interval in milliseconds (default: 5 minutes)
 * @returns {Function} Cleanup function to stop the checks
 */
export const startProfilePictureHealthMonitor = (refreshUser, intervalMs = 5 * 60 * 1000) => {
  let isRunning = true;
  
  const runCheck = async () => {
    if (!isRunning) return;
    
    try {
      const wasFixed = await autoFixBrokenProfilePicture(refreshUser);
      if (wasFixed) {
        console.log("Profile picture auto-fixed");
      }
    } catch (error) {
      console.error("Health monitor error:", error);
    }
    
    if (isRunning) {
      setTimeout(runCheck, intervalMs);
    }
  };

  // Start the first check after a short delay
  setTimeout(runCheck, 10000); // 10 seconds

  // Return cleanup function
  return () => {
    isRunning = false;
  };
};