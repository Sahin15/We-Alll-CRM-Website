/** Human-readable labels for HMS pipeline stages */
export const STAGE_LABELS = {
  sourced: "Applied",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview scheduled",
  interviewed: "Interview completed",
  selected: "Selected",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const STAGE_VARIANT = {
  sourced: "secondary",
  shortlisted: "info",
  interview_scheduled: "warning",
  interviewed: "primary",
  selected: "success",
  rejected: "danger",
  withdrawn: "dark",
};

export const INTERVIEW_MODE_LABELS = {
  in_person: "In person",
  video: "Video call",
  phone: "Phone",
};

export const INTERVIEW_STATUS_VARIANT = {
  scheduled: "warning",
  completed: "success",
  cancelled: "secondary",
  no_show: "danger",
};

export const PIPELINE_STEPS = [
  "sourced",
  "shortlisted",
  "interview_scheduled",
  "interviewed",
  "selected",
];

export function stageLabel(stage) {
  return STAGE_LABELS[stage] || stage?.replace(/_/g, " ") || "—";
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Merge stage history and interview events into a single timeline (newest first).
 */
export function buildApplicationTimeline(application) {
  const events = [];

  (application?.stageHistory || []).forEach((entry, index) => {
    events.push({
      id: `stage-${index}-${entry.stage}`,
      type: "stage",
      title: stageLabel(entry.stage),
      at: entry.changedAt,
      by: entry.changedBy?.name,
      notes: entry.notes,
    });
  });

  (application?.interviews || []).forEach((interview) => {
    events.push({
      id: `interview-scheduled-${interview._id}`,
      type: "interview",
      title: `${interview.title || "Interview"} (Round ${interview.round}) scheduled`,
      at: interview.createdAt || interview.scheduledAt,
      by: interview.scheduledBy?.name,
      notes: `${INTERVIEW_MODE_LABELS[interview.mode] || interview.mode} · ${formatDateTime(interview.scheduledAt)}`,
    });
    if (interview.completedAt) {
      events.push({
        id: `interview-done-${interview._id}`,
        type: "interview",
        title: `${interview.title || "Interview"} (Round ${interview.round}) ${interview.status}`,
        at: interview.completedAt,
        by: interview.completedBy?.name,
        notes: interview.remarks,
      });
    }
  });

  return events.sort((a, b) => new Date(b.at) - new Date(a.at));
}
