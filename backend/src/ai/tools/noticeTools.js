import Announcement from '../../models/announcementModel.js';
import Policy from '../../models/policyModel.js';
import { requirePermission } from '../aiAccess.js';

/**
 * Same visibility rule as the announcements list.
 * @param {{ role?: string }} user
 */
function announcementQuery(user) {
  return {
    $and: [
      {
        $or: [{ targetRoles: { $size: 0 } }, { targetRoles: user?.role }],
      },
      {
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      },
    ],
  };
}

/**
 * Active policies the person is already allowed to open.
 * @param {object} user
 * @param {{ topic?: string }} args
 */
export async function getCompanyNotices(user, args = {}) {
  const topic = args.topic === 'announcements' || args.topic === 'policies' ? args.topic : 'both';
  const announcements = [];
  const policies = [];

  if (topic !== 'policies') {
    requirePermission(
      user,
      'company.announcement.view',
      'You do not have permission to view announcements.'
    );
    const rows = await Announcement.find(announcementQuery(user))
      .select('title type priority')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(5)
      .lean();
    for (const row of rows) {
      announcements.push({ title: row.title || '', type: row.type || '' });
    }
  }

  if (topic !== 'announcements') {
    requirePermission(
      user,
      'company.policy.view',
      'You do not have permission to view policies.'
    );
    const now = new Date();
    const rows = await Policy.find({
      status: 'active',
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gte: now } },
      ],
    })
      .select('title category')
      .sort({ priority: -1, effectiveDate: -1 })
      .limit(5)
      .lean();
    for (const row of rows) {
      policies.push({ title: row.title || '', category: row.category || '' });
    }
  }

  return { type: 'company_notices', topic, announcements, policies };
}
