import { useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import growthTrackApi from "../../api/growthTrackApi";
import {
  applyGrowthTrackThemeToBody,
  clearGrowthTrackThemeFromBody,
  GROWTH_TRACK_THEME_REFRESH_EVENT,
} from "../../utils/growthTrackTheme.js";

/**
 * Loads the signed-in user's active Growth Track and applies global layout theme by stage.
 * Mounted once in MainLayout so all authenticated pages share concern / improvement / critical styling.
 */
const GrowthTrackThemeSync = () => {
  const { user, canAccess } = useAuth();

  const syncTheme = useCallback(async () => {
    if (!user) {
      clearGrowthTrackThemeFromBody();
      return;
    }

    const mayHaveSelfTrack =
      canAccess?.("growth_track.view", ["employee", "sales", "admin", "superadmin", "hr", "manager", "hod"]) ??
      true;

    if (!mayHaveSelfTrack) {
      clearGrowthTrackThemeFromBody();
      return;
    }

    try {
      const res = await growthTrackApi.getMyActiveTrack();
      const track = res.data;

      if (
        track &&
        (track.status === "active" || track.status === "extended") &&
        track.stage
      ) {
        applyGrowthTrackThemeToBody(track.stage);
      } else {
        clearGrowthTrackThemeFromBody();
      }
    } catch {
      clearGrowthTrackThemeFromBody();
    }
  }, [user, canAccess]);

  useEffect(() => {
    syncTheme();
  }, [syncTheme]);

  useEffect(() => {
    const onRefresh = () => {
      syncTheme();
    };
    window.addEventListener(GROWTH_TRACK_THEME_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(GROWTH_TRACK_THEME_REFRESH_EVENT, onRefresh);
  }, [syncTheme]);

  useEffect(() => {
    return () => clearGrowthTrackThemeFromBody();
  }, []);

  return null;
};

export default GrowthTrackThemeSync;
