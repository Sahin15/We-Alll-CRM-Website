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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const healthMonitorCleanup = useRef(null);

  useEffect(() => {
    let isMounted = true; // Prevent state updates if unmounted
    
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        if (!isMounted) return;
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Skip refresh on init to avoid rate limiting - user data is already in localStorage
        // User data will be refreshed on next login or manual profile update
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    initAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials) => {
    try {
      console.log("Login attempt with email:", credentials.email);

      // Clear any existing data before login
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const response = await authApi.login(credentials);
      const { token, user } = response.data;

      console.log("Login response received:", {
        userName: user.name,
        userEmail: user.email,
        userId: user.id,
        userRole: user.role,
      });

      localStorage.setItem("token", token);
      
      setToken(token);
      
      // Immediately refresh user data from /me endpoint to get complete profile including profile picture
      try {
        const freshUserData = await authApi.getCurrentUser();
        const completeUser = freshUserData.data.user;
        
        console.log(`[AUTH] Login - Profile picture: ${completeUser?.profilePicture || 'null'}`);
        
        localStorage.setItem("user", JSON.stringify(completeUser));
        setUser(completeUser);
        
        return { success: true, data: { token, user: completeUser } };
      } catch (refreshError) {
        console.error("Failed to refresh user data after login:", refreshError);
        // Fallback to login response data
        localStorage.setItem("user", JSON.stringify(user));
        console.log(`[AUTH] Login (fallback) - Profile picture: ${user?.profilePicture || 'null'}`);
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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    // No toast notification - clean logout experience
  };

  const updateProfile = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
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
