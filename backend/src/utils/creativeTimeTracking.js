/**
 * Server-backed time tracking for creative revision work sessions.
 */

/**
 * Ensure timeTracking object exists on a revision document.
 * @param {object} revision
 */
export function ensureRevisionTimeTracking(revision) {
  if (!revision.timeTracking) {
    revision.timeTracking = {
      workStartedAt: null,
      activeTimerStartedAt: null,
      accumulatedActiveSeconds: 0,
      lastStoppedAt: null,
      stopReason: null,
      holdSegments: [],
    };
  }
  if (!Array.isArray(revision.timeTracking.holdSegments)) {
    revision.timeTracking.holdSegments = [];
  }
  return revision.timeTracking;
}

/**
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/**
 * @param {Date|string|null|undefined} date
 * @returns {string}
 */
export function formatClockTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * @param {object} revision
 * @param {Date} [now]
 * @returns {number}
 */
export function getRevisionElapsedSeconds(revision, now = new Date()) {
  const tt = revision?.timeTracking || {};
  let total = Number(tt.accumulatedActiveSeconds) || 0;
  if (tt.activeTimerStartedAt) {
    const started = new Date(tt.activeTimerStartedAt).getTime();
    const elapsed = Math.max(0, Math.floor((now.getTime() - started) / 1000));
    total += elapsed;
  }
  return total;
}

/**
 * Start or resume the revision timer.
 * @param {object} revision
 * @param {Date} [now]
 */
export function startRevisionTimer(revision, now = new Date()) {
  const tt = ensureRevisionTimeTracking(revision);
  if (!tt.workStartedAt) {
    tt.workStartedAt = now;
  }
  tt.activeTimerStartedAt = now;
  tt.stopReason = null;
}

/**
 * Pause the revision timer and accumulate elapsed time.
 * @param {object} revision
 * @param {"submit"|"hold"} reason
 * @param {Date} [now]
 * @returns {number} seconds added this segment
 */
export function pauseRevisionTimer(revision, reason, now = new Date()) {
  const tt = ensureRevisionTimeTracking(revision);
  let segmentSeconds = 0;
  if (tt.activeTimerStartedAt) {
    const started = new Date(tt.activeTimerStartedAt).getTime();
    segmentSeconds = Math.max(0, Math.floor((now.getTime() - started) / 1000));
    tt.accumulatedActiveSeconds = (Number(tt.accumulatedActiveSeconds) || 0) + segmentSeconds;
    tt.activeTimerStartedAt = null;
  }
  tt.lastStoppedAt = now;
  tt.stopReason = reason;
  if (reason === "submit") {
    revision.actualHours = Math.round((tt.accumulatedActiveSeconds / 3600) * 100) / 100;
  }
  return segmentSeconds;
}

/**
 * Record an open hold segment on the current revision.
 * @param {object} revision
 * @param {Date} [now]
 */
export function openHoldSegment(revision, now = new Date()) {
  const tt = ensureRevisionTimeTracking(revision);
  tt.holdSegments.push({
    heldAt: now,
    resumedAt: null,
    pausedSeconds: 0,
  });
}

/**
 * Close the latest open hold segment on a revision.
 * @param {object} revision
 * @param {Date} [now]
 */
export function closeHoldSegment(revision, now = new Date()) {
  const tt = ensureRevisionTimeTracking(revision);
  const open = [...tt.holdSegments].reverse().find((seg) => seg.heldAt && !seg.resumedAt);
  if (!open) return;
  open.resumedAt = now;
  open.pausedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(open.heldAt).getTime()) / 1000)
  );
}

/**
 * @param {object} revision
 * @param {Date} [now]
 * @returns {object}
 */
export function buildRevisionTimePayload(revision, now = new Date()) {
  const tt = revision?.timeTracking || {};
  const elapsedSeconds = getRevisionElapsedSeconds(revision, now);
  return {
    revisionNumber: revision.revisionNumber,
    elapsedSeconds,
    elapsedFormatted: formatDuration(elapsedSeconds),
    workStartedAt: tt.workStartedAt || null,
    submittedAt: revision.submittedAt || null,
    reviewedAt: revision.reviewedAt || null,
    approvedAt: revision.approvedAt || null,
    lastStoppedAt: tt.lastStoppedAt || null,
    stopReason: tt.stopReason || null,
    isTimerRunning: Boolean(tt.activeTimerStartedAt),
    holdSegments: (tt.holdSegments || []).map((seg) => ({
      heldAt: seg.heldAt,
      resumedAt: seg.resumedAt,
      pausedSeconds: seg.pausedSeconds,
      pausedFormatted: formatDuration(seg.pausedSeconds),
    })),
  };
}

/**
 * Build time summary for API responses.
 * @param {object} workItem
 * @param {object|null} currentRevision
 * @param {object[]} [allRevisions]
 * @param {Date} [now]
 */
export function buildTimeSummary(workItem, currentRevision, allRevisions = [], now = new Date()) {
  const revisionPayloads = (allRevisions.length ? allRevisions : currentRevision ? [currentRevision] : [])
    .sort((a, b) => a.revisionNumber - b.revisionNumber)
    .map((rev) => buildRevisionTimePayload(rev, now));

  const totalSeconds = revisionPayloads.reduce((sum, r) => sum + r.elapsedSeconds, 0);
  const tt = currentRevision?.timeTracking || {};

  return {
    currentRevisionNumber: currentRevision?.revisionNumber ?? null,
    elapsedSeconds: currentRevision ? getRevisionElapsedSeconds(currentRevision, now) : 0,
    elapsedFormatted: currentRevision
      ? formatDuration(getRevisionElapsedSeconds(currentRevision, now))
      : "0s",
    isTimerRunning: Boolean(tt.activeTimerStartedAt),
    workStartedAt: tt.workStartedAt || null,
    lastStoppedAt: tt.lastStoppedAt || null,
    totalSeconds,
    totalFormatted: formatDuration(totalSeconds),
    revisions: revisionPayloads,
    holdResumeLog: (workItem?.holdResumeLog || []).map((entry) => ({
      heldAt: entry.heldAt,
      resumedAt: entry.resumedAt,
      heldBy: entry.heldBy,
    })),
  };
}
