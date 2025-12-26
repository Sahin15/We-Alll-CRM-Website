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
    
    // Only fix if there's a profile picture, it's not accessible, AND there's a real error (not just a warning)
    if (health.hasProfilePicture && !health.accessible && health.error && !health.warning) {
      console.warn("Genuinely broken profile picture detected, clearing from database:", health.error);
      
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

    // Log but don't fix if it's just a warning or timeout
    if (health.warning) {
      console.log("Profile picture health warning (not fixing):", health.warning);
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
 * @param {number} intervalMs - Check interval in milliseconds (default: 30 minutes)
 * @returns {Function} Cleanup function to stop the checks
 */
export const startProfilePictureHealthMonitor = (refreshUser, intervalMs = 30 * 60 * 1000) => {
  let isRunning = true;
  let checkCount = 0;
  
  const runCheck = async () => {
    if (!isRunning) return;
    
    try {
      // Only run health check after the first few minutes and limit frequency
      checkCount++;
      if (checkCount >= 3) {
        const wasFixed = await autoFixBrokenProfilePicture(refreshUser);
        // Only log if something was actually fixed
        if (wasFixed) {
          console.log("Profile picture auto-fixed");
        }
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