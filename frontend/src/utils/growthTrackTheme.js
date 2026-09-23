/** @typedef {'concern' | 'improvement' | 'critical'} GrowthTrackStage */

export const GROWTH_TRACK_THEME_BODY_CLASS = "growth-track-theme-active";

const STAGE_CLASS_MAP = {
  concern: "growth-track-theme-concern",
  improvement: "growth-track-theme-improvement",
  critical: "growth-track-theme-critical",
};

const ALL_STAGE_CLASSES = Object.values(STAGE_CLASS_MAP);

/** @type {GrowthTrackStage[]} */
export const GROWTH_TRACK_STAGES = ["concern", "improvement", "critical"];

/**
 * Apply global layout theme for the employee's active Growth Track stage.
 *
 * @param {GrowthTrackStage | string | null | undefined} stage
 */
export function applyGrowthTrackThemeToBody(stage) {
  const body = document.body;
  const root = document.documentElement;

  body.classList.remove(GROWTH_TRACK_THEME_BODY_CLASS, ...ALL_STAGE_CLASSES, "pip-active");
  delete root.dataset.growthTrackStage;

  if (!stage || !STAGE_CLASS_MAP[stage]) {
    return;
  }

  body.classList.add(GROWTH_TRACK_THEME_BODY_CLASS, STAGE_CLASS_MAP[stage]);
  root.dataset.growthTrackStage = stage;

  if (stage === "critical") {
    body.classList.add("pip-active");
  }
}

/** Remove Growth Track theme classes from the document. */
export function clearGrowthTrackThemeFromBody() {
  applyGrowthTrackThemeToBody(null);
}

/** Custom event name — dispatch after track mutations to refresh theme. */
export const GROWTH_TRACK_THEME_REFRESH_EVENT = "growth-track-theme-refresh";
