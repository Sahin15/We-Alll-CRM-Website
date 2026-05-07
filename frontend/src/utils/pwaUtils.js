/**
 * PWA utility functions for filtering todos and sorting leads.
 */

/**
 * Roles that have access to the Follow-Up (leads) tab.
 */
export const LEADS_ROLES = [
  'admin',
  'superadmin',
  'hr',
  'employee',
  'hod',
  'accounts',
  'manager',
  'sales',
];

/**
 * Normalize a Date object to midnight (date-only, no time component).
 * @param {Date} date
 * @returns {Date}
 */
function toDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Parse an ISO date string to a date-only Date (strips time).
 * @param {string} isoString
 * @returns {Date}
 */
function parseDateOnly(isoString) {
  const d = new Date(isoString);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Filter a list of todos by the given filter type.
 *
 * @param {Array} todos - Array of todo objects
 * @param {'all'|'pending'|'completed'|'overdue'} filter - Filter type
 * @param {Date} today - Reference date for comparisons
 * @returns {Array} Filtered todos
 */
export function filterTodos(todos, filter, today) {
  const todayOnly = toDateOnly(today);

  const sortByDueDate = (arr) => [...arr].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return parseDateOnly(a.dueDate) - parseDateOnly(b.dueDate);
  });

  switch (filter) {
    case 'all':
      return sortByDueDate(todos);

    case 'completed':
      return sortByDueDate(todos.filter((t) => t.status === 'completed'));

    case 'pending':
      return sortByDueDate(todos.filter((t) => {
        if (t.status === 'completed') return false;
        if (!t.dueDate) return true;
        return parseDateOnly(t.dueDate) >= todayOnly;
      }));

    case 'overdue':
      return sortByDueDate(todos.filter((t) => {
        if (t.status === 'completed') return false;
        if (!t.dueDate) return false;
        return parseDateOnly(t.dueDate) < todayOnly;
      }));

    default:
      return sortByDueDate(todos);
  }
}

/**
 * Sort leads by follow-up date: overdue → today → future.
 * Leads without a followUpDate are treated as future.
 * Sort is stable within each group.
 *
 * @param {Array} leads - Array of lead objects
 * @param {Date} today - Reference date for comparisons
 * @returns {Array} New sorted array (original array is not mutated)
 */
export function sortLeads(leads, today) {
  const todayOnly = toDateOnly(today);

  /**
   * Returns a sort bucket for a lead:
   *   0 = overdue, 1 = today, 2 = future (or no date)
   */
  function bucket(lead) {
    if (!lead.followUpDate) return 2;
    const d = parseDateOnly(lead.followUpDate);
    if (d < todayOnly) return 0;
    if (d.getTime() === todayOnly.getTime()) return 1;
    return 2;
  }

  // Spread to avoid mutating the original array; use index for stable sort.
  return leads
    .map((lead, index) => ({ lead, index, bucket: bucket(lead) }))
    .sort((a, b) => a.bucket - b.bucket || a.index - b.index)
    .map(({ lead }) => lead);
}
