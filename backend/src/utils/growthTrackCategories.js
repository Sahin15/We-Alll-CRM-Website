export const GROWTH_TRACK_PROBLEM_CATEGORY_VALUES = Object.freeze([
  "attendance",
  "productivity",
  "quality",
  "communication",
  "deadline management",
  "task ownership",
]);

const ALLOWED = new Set(GROWTH_TRACK_PROBLEM_CATEGORY_VALUES);

/**
 * @param {object} body - request body
 * @returns {{ categories: string[] } | { error: string }}
 */
export function parseProblemCategoriesFromBody(body) {
  let raw = body?.problemCategories;

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = raw.trim() ? [raw.trim()] : [];
    }
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    if (body?.problemCategory) {
      raw = [body.problemCategory];
    }
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "At least one problem category is required" };
  }

  const categories = [...new Set(raw.map((item) => String(item).trim()).filter(Boolean))];

  for (const category of categories) {
    if (!ALLOWED.has(category)) {
      return { error: `Invalid problem category: ${category}` };
    }
  }

  return { categories };
}
