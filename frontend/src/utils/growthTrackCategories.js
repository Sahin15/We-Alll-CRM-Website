/** @typedef {{ value: string, label: string }} GrowthTrackCategoryOption */

/** @type {GrowthTrackCategoryOption[]} */
export const GROWTH_TRACK_PROBLEM_CATEGORIES = [
  { value: "productivity", label: "Productivity & Efficiency" },
  { value: "attendance", label: "Attendance & Punctuality" },
  { value: "quality", label: "Work Quality & Accuracy" },
  { value: "communication", label: "Team Communication" },
  { value: "deadline management", label: "Deadline & Speed" },
  { value: "task ownership", label: "Ownership & Responsibility" },
];

const LABEL_BY_VALUE = Object.fromEntries(
  GROWTH_TRACK_PROBLEM_CATEGORIES.map((c) => [c.value, c.label])
);

/**
 * @param {string} value
 * @returns {string}
 */
export function getCategoryLabel(value) {
  if (!value) return "";
  return LABEL_BY_VALUE[value] || value;
}

/**
 * @param {object|null|undefined} notice
 * @returns {string[]}
 */
export function getNoticeProblemCategories(notice) {
  if (!notice) return [];
  if (Array.isArray(notice.problemCategories) && notice.problemCategories.length > 0) {
    return notice.problemCategories;
  }
  if (notice.problemCategory) {
    return [notice.problemCategory];
  }
  return [];
}
