/**
 * Shared work item status helpers for lists and dashboards.
 */

export const CREATIVE_ACTIVE_STATUSES = [
  'To Do',
  'Assigned',
  'Backlog',
  'In Progress',
  'Rework In Progress',
  'Submitted for Review',
  'Changes Requested',
  'QA Review',
  'Approved',
  'Delivered',
  'Awaiting Posting',
  'Posted',
];

export const CREATIVE_TERMINAL_STATUSES = ['Closed', 'Cancelled', 'Done'];

/**
 * List/table label for creative items — aligns terminal Closed with standard Done.
 * @param {string} status
 * @returns {string}
 */
export const getCreativeListDisplayStatus = (status) => {
  if (status === 'Closed') return 'Done';
  return status;
};

/**
 * Badge variant for creative items in list views (Closed shown as Done/success).
 * @param {string} status
 * @returns {string}
 */
export const getCreativeListBadgeVariant = (status) => {
  const display = getCreativeListDisplayStatus(status);
  if (display === 'Done') return 'success';
  return getCreativeStatusBadgeVariant(status);
};

/**
 * @param {string} status
 * @returns {string}
 */
export const getCreativeStatusBadgeVariant = (status) => {
  const map = {
    'To Do': 'secondary',
    Assigned: 'secondary',
    Backlog: 'secondary',
    'In Progress': 'primary',
    'Rework In Progress': 'info',
    'Submitted for Review': 'warning',
    'Changes Requested': 'danger',
    'QA Review': 'warning',
    Approved: 'success',
    Delivered: 'success',
    'Awaiting Posting': 'info',
    Posted: 'success',
    Closed: 'dark',
    Cancelled: 'danger',
    Done: 'success',
  };
  return map[status] || 'secondary';
};

export {
  getCreativeStatusProgress,
  isCreativeWorkflowItem,
} from './creativeWorkflowAccess';
