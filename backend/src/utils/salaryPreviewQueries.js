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

/**
 * Backfill: pending employee queries after an HR correction should read as resolved.
 * @param {import('mongoose').Document} preview
 * @returns {boolean} whether preview was mutated
 */
export function reconcilePendingQueriesOnPreview(preview) {
  const queries = preview.employeeQueries || [];
  if (!queries.length) return false;

  const correctionTimes = queries
    .filter(isHrCorrectionQuery)
    .map((q) => new Date(q.submittedAt || 0).getTime());

  let dirty = false;
  for (const q of queries) {
    if (!isEmployeeQueryEntry(q) || q.status !== "pending") continue;

    const queryTime = new Date(q.submittedAt || 0).getTime();
    const addressedByCorrection = correctionTimes.some((t) => t >= queryTime);

    if (addressedByCorrection || correctionTimes.length > 0) {
      q.status = "resolved";
      q.hrResponse =
        q.hrResponse || "Addressed via HR salary correction or review";
      q.respondedAt = q.respondedAt || new Date();
      dirty = true;
    }
  }

  if (dirty) {
    syncPreviewStatusAfterQueryChange(preview);
  }
  return dirty;
}
