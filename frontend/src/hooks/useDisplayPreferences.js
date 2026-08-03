import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import toast from "../utils/toast";

const DEFAULT_DISPLAY_PREFS = {
  theme: "light",
  language: "en",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
};

export const useDisplayPreferences = () => {
  const { theme, setTheme, getDisplayPreferences, updateDisplayPreferences } =
    useTheme();
  const [displayPrefs, setDisplayPrefs] = useState(() => ({
    ...DEFAULT_DISPLAY_PREFS,
    ...getDisplayPreferences(),
    theme,
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayPrefs((prev) => ({
      ...prev,
      ...getDisplayPreferences(),
      theme,
    }));
  }, [theme, getDisplayPreferences]);

  const handleThemeChange = useCallback(
    (nextTheme) => {
      setDisplayPrefs((prev) => ({ ...prev, theme: nextTheme }));
      setTheme(nextTheme);
    },
    [setTheme]
  );

  const saveDisplayPreferences = useCallback(async () => {
    try {
      setSaving(true);
      updateDisplayPreferences(displayPrefs);
      toast.success("Display preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }, [displayPrefs, updateDisplayPreferences]);

  return {
    displayPrefs,
    setDisplayPrefs,
    handleThemeChange,
    saveDisplayPreferences,
    saving,
  };
};

export default useDisplayPreferences;
