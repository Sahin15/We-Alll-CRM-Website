import WorkItem from '../../models/workItemModel.js';
import { requirePermission } from '../aiAccess.js';
import { isWorkItemForMyWork } from '../../utils/workItemStatusUtils.js';

const FINISHED = ['Done', 'Closed', 'Cancelled', 'Delivered', 'Posted'];

/**
 * Same assignee scope as My Work. Always the authenticated user.
 * @param {object} user
 */
function assignedQuery(user) {
  const userRef = { $in: [user._id, String(user._id)] };
  return {
    isDeleted: { $ne: true },
    visibility: 'active',
    $or: [
      { assignedTo: userRef },
      { assignedToMultiple: userRef },
      {
        requiresPosting: true,
        postingAssignedTo: userRef,
        status: { $nin: ['Closed', 'Cancelled'] },
      },
    ],
  };
}

/**
 * @param {object} user
 */
async function loadAssigned(user) {
  requirePermission(
    user,
    'work.item.view',
    'You do not have permission to view assigned work.'
  );

  const rows = await WorkItem.find(assignedQuery(user))
    .select('title status dueDate createdBy assignedTo assignedToMultiple postingAssignedTo requiresPosting project')
    .populate('project', 'name')
    .sort({ dueDate: 1 })
    .limit(50)
    .lean();

  return rows.filter((item) => isWorkItemForMyWork(item, user._id));
}

/**
 * @param {object} item
 */
function publicTask(item) {
  return {
    title: item.title,
    status: item.status,
    dueDate: item.dueDate || null,
    projectName: item.project?.name || '',
  };
}

/**
 * @param {object} user
 */
export async function getMyTasks(user) {
  const items = (await loadAssigned(user))
    .filter((item) => !FINISHED.includes(item.status))
    .slice(0, 15)
    .map(publicTask);

  return { type: 'task_list', count: items.length, items };
}

/**
 * @param {object} user
 */
export async function getWorkStatus(user) {
  const items = await loadAssigned(user);
  const pending = items.filter((item) => !FINISHED.includes(item.status)).length;
  return {
    type: 'work_status',
    total: items.length,
    pending,
    finished: items.length - pending,
  };
}
