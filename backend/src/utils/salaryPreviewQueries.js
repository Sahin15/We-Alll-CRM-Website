/**
 * Salary preview employee query helpers (exclude HR correction log lines).
 */

const HR_CORRECTION_PREFIX = /^hr correction:/i;

/**
 * @param {{ query?: string }|null|undefined} entry
 * @returns {boolean}
 */
export function isHrCorrectionQuery(entry) {
  if (!entry?.query || typeof entry.query !== "string") return false;
  return HR_CORRECTION_PREFIX.test(entry.query.trim());
}

/**
 * @param {{ query?: string }|null|undefined} entry
 * @returns {boolean}
 */
export function isEmployeeQueryEntry(entry) {
  return Boolean(entry?.query) && !isHrCorrectionQuery(entry);
}

/**
 * @param {import('mongoose').Document} preview
 */
export function syncPreviewStatusAfterQueryChange(preview) {
  const hasPending = (preview.employeeQueries || []).some(
    (q) => isEmployeeQueryEntry(q) && q.status === "pending"
  );
  if (!hasPending && preview.status === "query_raised") {
    preview.status = "under_review";
  } else if (hasPending) {
    preview.status = "query_raised";
  }
}

/**
 * Mark pending employee queries resolved (e.g. after salary correction).
 * @param {import('mongoose').Document} preview
 * @param {import('mongoose').Types.ObjectId|string} hrUserId
 * @param {string} hrResponse
 */
export function resolvePendingEmployeeQueries(preview, hrUserId, hrResponse) {
  for (const q of preview.employeeQueries || []) {
    if (isEmployeeQueryEntry(q) && q.status === "pending") {
      q.hrResponse = hrResponse;
      q.respondedAt = new Date();
      q.respondedBy = hrUserId;
      q.status = "resolved";
    }
  }
  syncPreviewStatusAfterQueryChange(preview);
}

/**
 * Mongo match for employee query lines (not HR correction audit rows).
 * @returns {object}
 */
export function employeeQueryLineMatch(extra = {}) {
  return {
    "employeeQueries.query": { $exists: true, $not: HR_CORRECTION_PREFIX },
    ...extra,
  };
}
