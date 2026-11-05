/**
 * Resolve who assigned work to the team (for Assigned Work + timeline).
 *
 * @param {object|null|undefined} workItem
 * @returns {string|null}
 */
export function getEffectiveAssignedById(workItem) {
  if (!workItem) return null;

  const assignedBy = workItem.assignedBy?._id || workItem.assignedBy;
  if (assignedBy) return assignedBy.toString();

  const slotAssigner = workItem.slotAssignment?.assignedBy;
  if (slotAssigner) {
    return (slotAssigner._id || slotAssigner).toString();
  }

  const creator = workItem.createdBy?._id || workItem.createdBy;
  return creator ? creator.toString() : null;
}
