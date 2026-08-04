import { createContext, useState, useEffect, useContext, useRef, useCallback } from "react";
import { authApi } from "../api/authApi";
import authzApi from "../api/authzApi";
import { isAuthzV2AnyModuleEnabled } from "../utils/authzFlags";
import { hasPermissionAccess } from "../utils/authzAccess";
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
  const [authzEffective, setAuthzEffective] = useState(null);
  const [authzLoading, setAuthzLoading] = useState(false);
  const healthMonitorCleanup = useRef(null);

  const loadAuthzEffective = useCallback(async (_options = {}) => {
    // Always set authzLoading so PermissionRoute waits for first resolution.
    // App boot uses a separate `loading` flag and is not blocked by this.
    setAuthzLoading(true);
    try {
      const data = await authzApi.getEffective();
      setAuthzEffective(data);
      return data;
    } catch {
      setAuthzEffective(null);
      return null;
    } finally {
      setAuthzLoading(false);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = safeLocalStorage.getItem("token");
        const storedUser = safeLocalStorage.getItem("user");

        if (storedToken && storedUser) {
          setToken(storedToken);
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // Unblock UI immediately with cached session — refresh in background
            setLoading(false);

            // Refresh profile + authz without blocking first paint
            authApi
              .getCurrentUser()
              .then((response) => {
                const freshUser = response?.data?.user;
                if (freshUser) {
                  setUser(freshUser);
                  safeLocalStorage.setItem("user", JSON.stringify(freshUser));
                }
              })
              .catch(() => {
                // Keep cached user if refresh fails (offline, etc.)
              });
            loadAuthzEffective({ silent: true });
            return;
          } catch (parseError) {
            safeLocalStorage.removeItem("token");
            safeLocalStorage.removeItem("user");
          }
        }
      } catch (error) {
        safeLocalStorage.removeItem("token");
        safeLocalStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [loadAuthzEffective]);

  const login = async (credentials) => {
    try {
      // Clear any existing data before login
      safeLocalStorage.removeItem("token");
      safeLocalStorage.removeItem("user");

      const response = await authApi.login(credentials);
      const { token, user } = response.data;

      safeLocalStorage.setItem("token", token);
      safeLocalStorage.setItem("user", JSON.stringify(user));
      setToken(token);
      setUser(user);

      // Refresh full profile in background (don't block login)
      authApi.getCurrentUser()
        .then((freshUserData) => {
          const completeUser = freshUserData?.data?.user;
          if (!completeUser) return;
          safeLocalStorage.setItem("user", JSON.stringify(completeUser));
          setUser(completeUser);
        })
        .catch(() => {});

      await loadAuthzEffective();

      return { success: true, data: { token, user } };
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authApi.register(userData);
      toast.success("Registration successful! Please login.");
      return { success: true, data: response.data };
    } catch (error) {
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
    setAuthzEffective(null);
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

  useEffect(() => {
    if (!token) return undefined;

    const refreshOnFocus = () => {
      loadAuthzEffective({ silent: true });
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refreshOnFocus();
      }
    });

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [token, loadAuthzEffective]);

  const checkPermission = (allowedRoles) => {
    if (!user) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  };

  /**
   * Authorization V2 permission check (uses effective API when flag enabled).
   * @param {string} permission
   * @returns {boolean}
   */
  const canPermission = (permission) => {
    if (!user) return false;
    if (authzEffective?.permissions) {
      if (authzEffective.permissions.includes("platform.admin")) {
        return true;
      }
      return authzEffective.permissions.includes(permission);
    }
    if (isAuthzV2AnyModuleEnabled() || authzLoading) {
      return false;
    }
    return false;
  };

  /**
   * Page-level access: V2 permission when effective permissions are loaded, else legacy roles.
   * @param {string} permission
   * @param {string[]} [fallbackRoles]
   * @param {{ requiresDepartmentHead?: boolean }} [options]
   * @returns {boolean}
   */
  const canAccess = (permission, fallbackRoles = [], options = {}) => {
    return hasPermissionAccess({
      user,
      canPermission,
      checkPermission,
      authzEffective,
      authzLoading,
      permission,
      fallbackRoles,
      requiresDepartmentHead: options.requiresDepartmentHead,
    });
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    authzEffective,
    authzLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    checkPermission,
    canPermission,
    canAccess,
    loadAuthzEffective,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
