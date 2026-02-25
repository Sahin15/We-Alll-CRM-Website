import { createContext, useState, useEffect, useContext, useRef } from "react";
import { authApi } from "../api/authApi";
import toast from "../utils/toast";
import { startProfilePictureHealthMonitor } from "../utils/profilePictureHealth";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Safe localStorage wrapper for iOS Safari compatibility
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage.getItem failed:', e);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('localStorage.setItem failed:', e);
      return false;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('localStorage.removeItem failed:', e);
      return false;
    }
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(safeLocalStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const healthMonitorCleanup = useRef(null);

  useEffect(() => {
    const initAuth = () => {
      try {
        console.log('[AuthContext] Initializing auth...');
        const storedToken = safeLocalStorage.getItem("token");
        const storedUser = safeLocalStorage.getItem("user");

        console.log('[AuthContext] Token exists:', !!storedToken);
        console.log('[AuthContext] User exists:', !!storedUser);

        if (storedToken && storedUser) {
          setToken(storedToken);
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            console.log('[AuthContext] User loaded:', parsedUser.email);
          } catch (parseError) {
            console.error('[AuthContext] Failed to parse user:', parseError);
            // Clear corrupted data
            safeLocalStorage.removeItem("token");
            safeLocalStorage.removeItem("user");
          }
        } else {
          console.log('[AuthContext] No stored credentials found');
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        // Clear potentially corrupted data
        safeLocalStorage.removeItem("token");
        safeLocalStorage.removeItem("user");
      } finally {
        // Set loading to false immediately - no async operations needed
        setLoading(false);
        console.log('[AuthContext] Auth initialization complete');
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      // Clear any existing data before login
      safeLocalStorage.removeItem("token");
      safeLocalStorage.removeItem("user");

      const response = await authApi.login(credentials);
      const { token, user } = response.data;

      safeLocalStorage.setItem("token", token);
      
      setToken(token);
      
      // Immediately refresh user data from /me endpoint to get complete profile including profile picture
      try {
        const freshUserData = await authApi.getCurrentUser();
        const completeUser = freshUserData.data.user;
        
        safeLocalStorage.setItem("user", JSON.stringify(completeUser));
        setUser(completeUser);
        
        return { success: true, data: { token, user: completeUser } };
      } catch (refreshError) {
        console.error("Failed to refresh user data after login:", refreshError);
        // Fallback to login response data
        safeLocalStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        return { success: true, data: response.data };
      }
    } catch (error) {
      console.error("Login error:", error);
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authApi.register(userData);
      console.log("Registration response:", response.data);
      toast.success("Registration successful! Please login.");
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Registration error:", error);
      console.error("Error response:", error.response);
      const message =
        error.response?.data?.message ||
        "Registration failed. Please try again.";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    safeLocalStorage.removeItem("token");
    safeLocalStorage.removeItem("user");
    setToken(null);
    setUser(null);
    // No toast notification - clean logout experience
  };

  const updateProfile = (updatedUser) => {
    setUser(updatedUser);
    safeLocalStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();
      const updatedUser = response.data.user;
      setUser(updatedUser);
      safeLocalStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error("Error refreshing user:", error);
      return null;
    }
  };

  // Start profile picture health monitoring when user is authenticated
  useEffect(() => {
    if (user && token) {
      // Stop any existing monitor
      if (healthMonitorCleanup.current) {
        healthMonitorCleanup.current();
      }
      
      // Start new monitor
      healthMonitorCleanup.current = startProfilePictureHealthMonitor(refreshUser);
    } else {
      // Stop monitor when user logs out
      if (healthMonitorCleanup.current) {
        healthMonitorCleanup.current();
        healthMonitorCleanup.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (healthMonitorCleanup.current) {
        healthMonitorCleanup.current();
      }
    };
  }, [user, token]);

  const checkPermission = (allowedRoles) => {
    if (!user) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    checkPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
