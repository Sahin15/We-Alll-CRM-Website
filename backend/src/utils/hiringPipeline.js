/** @typedef {'sourced'|'shortlisted'|'interview_scheduled'|'interviewed'|'selected'|'rejected'|'withdrawn'} HiringStage */

export const HIRING_STAGES = [
  "sourced",
  "shortlisted",
  "interview_scheduled",
  "interviewed",
  "selected",
  "rejected",
  "withdrawn",
];

export const INTERVIEW_MODES = ["in_person", "video", "phone"];
export const INTERVIEW_STATUSES = ["scheduled", "completed", "cancelled", "no_show"];
export const INTERVIEW_RECOMMENDATIONS = ["proceed", "reject", "hold"];

/** Allowed forward transitions (reject/withdraw from most active stages handled separately). */
const STAGE_TRANSITIONS = {
  sourced: ["shortlisted", "rejected", "withdrawn"],
  shortlisted: ["interview_scheduled", "rejected", "withdrawn"],
  interview_scheduled: ["interviewed", "rejected", "withdrawn"],
  interviewed: ["selected", "interview_scheduled", "rejected", "withdrawn"],
  selected: ["rejected", "withdrawn"],
  rejected: [],
  withdrawn: [],
};

/**
 * @param {HiringStage} from
 * @param {HiringStage} to
 * @returns {{ allowed: boolean, message?: string }}
 */
export function validateStageTransition(from, to) {
  if (!HIRING_STAGES.includes(from) || !HIRING_STAGES.includes(to)) {
    return { allowed: false, message: "Invalid stage" };
  }
  if (from === to) {
    return { allowed: false, message: "Application is already in this stage" };
  }
  const allowed = STAGE_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return {
      allowed: false,
      message: `Cannot move from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}`,
    };
  }
  return { allowed: true };
}

/**
 * @param {HiringStage} stage
 * @param {string} [decisionReason]
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateDecisionReason(stage, decisionReason) {
  if (stage !== "rejected") return { valid: true };
  if (!decisionReason?.trim()) {
    return { valid: false, message: "Rejection reason is required" };
  }
  return { valid: true };
}

/**
 * @param {HiringStage} stage
 * @param {{ interviews?: Array<{ status: string }> }} application
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateSelectStage(stage, application) {
  if (stage !== "selected") return { valid: true };
  const hasCompletedInterview = (application.interviews || []).some(
    (i) => i.status === "completed"
  );
  if (!hasCompletedInterview) {
    return {
      valid: false,
      message: "At least one completed interview is required before selecting a candidate",
    };
  }
  return { valid: true };
}

export function stageLabel(stage) {
  const labels = {
    sourced: "Applied",
    shortlisted: "Shortlisted",
    interview_scheduled: "Interview scheduled",
    interviewed: "Interview completed",
    selected: "Selected",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };
  return labels[stage] || stage;
}
