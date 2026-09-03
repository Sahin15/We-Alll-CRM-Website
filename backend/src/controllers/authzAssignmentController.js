import { asyncHandler, sendSuccess } from '../middleware/errorHandler.js';
import {
  getUserAssignmentPayload,
  replaceUserAssignments,
} from '../authz/userGrantService.js';

/**
 * GET /api/v1/authz/users/:userId/assignments
 */
export const getUserAssignments = asyncHandler(async (req, res) => {
  const payload = await getUserAssignmentPayload(req.params.userId);
  sendSuccess(res, payload, 'User permission assignments retrieved');
});

/**
 * PUT /api/v1/authz/users/:userId/assignments
 * Body: { assignments: [{ permission, scope?, effect?, note? }] }
 */
export const updateUserAssignments = asyncHandler(async (req, res) => {
  const { assignments } = req.body;
  const payload = await replaceUserAssignments(
    req.params.userId,
    assignments,
    req.user._id
  );
  sendSuccess(res, payload, 'User permission assignments updated');
});
