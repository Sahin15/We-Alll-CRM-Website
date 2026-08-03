import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "displayPreferences";
const THEME_COLORS = { light: "#6366f1", dark: "#0b0d12" };

const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
};

export const getStoredTheme = () => {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return "light";
    const prefs = JSON.parse(raw);
    return prefs?.theme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

export const applyThemeToDocument = (theme) => {
  const resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-bs-theme", resolved);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_COLORS[resolved]);
  }
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getStoredTheme);

  const persistTheme = useCallback((nextTheme) => {
    const resolved = nextTheme === "dark" ? "dark" : "light";
    try {
      const raw = safeLocalStorage.getItem(STORAGE_KEY);
      const prefs = raw ? JSON.parse(raw) : {};
      safeLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...prefs, theme: resolved })
      );
    } catch {
      safeLocalStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ theme: resolved })
      );
    }
    return resolved;
  }, []);

  const setTheme = useCallback(
    (nextTheme) => {
      const resolved = persistTheme(nextTheme);
      setThemeState(resolved);
      applyThemeToDocument(resolved);
    },
    [persistTheme]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const getDisplayPreferences = useCallback(() => {
    try {
      const raw = safeLocalStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const updateDisplayPreferences = useCallback(
    (updates) => {
      try {
        const current = getDisplayPreferences();
        const merged = { ...current, ...updates };
        safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        if (updates.theme !== undefined) {
          const resolved = updates.theme === "dark" ? "dark" : "light";
          setThemeState(resolved);
          applyThemeToDocument(resolved);
        }
        return merged;
      } catch {
        return getDisplayPreferences();
      }
    },
    [getDisplayPreferences]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        getDisplayPreferences,
        updateDisplayPreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
