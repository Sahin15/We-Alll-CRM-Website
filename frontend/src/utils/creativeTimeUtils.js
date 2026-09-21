/**
 * Creative work time display helpers (mirrors backend creativeTimeTracking.js).
 */

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
  if (!date) return '';
  return new Date(date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * @param {Date|string|null|undefined} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * @param {object|null|undefined} revision
 * @param {Date} [now]
 * @returns {number}
 */
export function getRevisionElapsedSeconds(revision, now = new Date()) {
  const tt = revision?.timeTracking || {};
  let total = Number(tt.accumulatedActiveSeconds) || 0;
  if (tt.activeTimerStartedAt) {
    const started = new Date(tt.activeTimerStartedAt).getTime();
    total += Math.max(0, Math.floor((now.getTime() - started) / 1000));
  }
  if (revision?.timeSummary?.elapsedSeconds != null && !tt.activeTimerStartedAt) {
    return revision.timeSummary.elapsedSeconds;
  }
  return total;
}

/**
 * Human-readable review decision for timeline.
 * @param {object} rev
 * @returns {string}
 */
export function formatReviewDecisionLabel(rev) {
  if (rev.lastDecision === 'approve') return 'Approved → QA';
  if (rev.lastDecision === 'minor') return 'Minor changes requested';
  if (rev.lastDecision === 'major') return 'Major changes requested';
  if (rev.lastDecision === 'reject' || rev.lastDecision === 'send_back') return 'Rejected';
  if (rev.status === 'approved') return 'Approved → QA';
  if (rev.status === 'changes_requested') return 'Changes requested';
  return 'Reviewed';
}

/** Post-revision pipeline only — assignee/review times live on revision rows. */
const DELIVERY_MILESTONE_LABELS = {
  Delivered: 'Marked delivered',
  'Awaiting Posting': 'Awaiting posting',
  Posted: 'Live posts submitted',
  Closed: 'Marked done',
};

/**
 * Delivery/posting milestones from work item (excludes QA steps shown on revisions).
 * @param {object|null|undefined} workItem
 */
export function getDeliveryMilestones(workItem) {
  if (!workItem) return [];

  const milestones = [];
  const seen = new Set();

  (workItem.statusHistory || []).forEach((entry) => {
    const status = entry?.status;
    if (!status || !DELIVERY_MILESTONE_LABELS[status]) return;
    const at = entry.changedAt;
    const key = `${status}-${new Date(at).getTime()}`;
    if (seen.has(key)) return;
    seen.add(key);
    milestones.push({
      at,
      label: DELIVERY_MILESTONE_LABELS[status],
      sortKey: new Date(at).getTime(),
    });
  });

  if (workItem.postingSubmittedAt) {
    const at = workItem.postingSubmittedAt;
    const key = `Posted-${new Date(at).getTime()}`;
    if (!seen.has(key)) {
      milestones.push({
        at,
        label: DELIVERY_MILESTONE_LABELS.Posted,
        sortKey: new Date(at).getTime(),
      });
    }
  }

  return milestones.sort((a, b) => a.sortKey - b.sortKey);
}

/**
 * Single chronological timeline — assignee revision steps + delivery milestones (no duplicates).
 * @param {object[]} revisions
 * @param {object|null|undefined} workItem
 * @returns {{ at: Date|string, sortKey: number, primary: string, secondary?: string }[]}
 */
export function buildUnifiedStepTimeline(revisions = [], workItem = null) {
  /** @type {{ at: Date|string, sortKey: number, primary: string, secondary?: string }[]} */
  const events = [];

  const sorted = [...revisions].sort(
    (a, b) => (a.revisionNumber || 0) - (b.revisionNumber || 0)
  );

  sorted.forEach((rev) => {
    const ts = rev.timeSummary || {};
    const revLabel =
      rev.revisionNumber === 1
        ? `Revision ${rev.revisionNumber}`
        : `Revision ${rev.revisionNumber} (rework)`;
    const duration =
      ts.elapsedFormatted || formatDuration(ts.elapsedSeconds || 0);
    const startedAt = ts.workStartedAt || rev.timeTracking?.workStartedAt;
    const submittedAt = ts.submittedAt || rev.submittedAt;
    const reviewedAt = ts.reviewedAt || rev.reviewedAt;
    const approvedAt = ts.approvedAt || rev.approvedAt;
    const holdSegments = ts.holdSegments || rev.timeTracking?.holdSegments || [];

    if (startedAt) {
      events.push({
        at: startedAt,
        sortKey: new Date(startedAt).getTime(),
        primary: `${revLabel} started`,
        secondary: duration !== '0s' ? `Work time: ${duration}` : undefined,
      });
    }

    holdSegments.forEach((seg) => {
      if (!seg.heldAt) return;
      events.push({
        at: seg.heldAt,
        sortKey: new Date(seg.heldAt).getTime(),
        primary: `${revLabel} held`,
        secondary: seg.resumedAt
          ? `Resumed ${formatClockTime(seg.resumedAt)} (${formatDuration(seg.pausedSeconds)})`
          : 'Still on hold',
      });
    });

    if (submittedAt) {
      events.push({
        at: submittedAt,
        sortKey: new Date(submittedAt).getTime(),
        primary: `${revLabel} submitted for review`,
      });
    }

    if (reviewedAt) {
      events.push({
        at: reviewedAt,
        sortKey: new Date(reviewedAt).getTime(),
        primary: `${revLabel} reviewed`,
        secondary: formatReviewDecisionLabel(rev),
      });
    }

    if (approvedAt && approvedAt !== reviewedAt) {
      events.push({
        at: approvedAt,
        sortKey: new Date(approvedAt).getTime(),
        primary: `${revLabel} approved for QA`,
      });
    }
  });

  getDeliveryMilestones(workItem).forEach((m) => {
    events.push({
      at: m.at,
      sortKey: m.sortKey,
      primary: m.label,
    });
  });

  events.sort((a, b) => a.sortKey - b.sortKey);
  return events;
}
