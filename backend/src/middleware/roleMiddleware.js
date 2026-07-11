/**
 * Re-exports authorizeRoles from authMiddleware for a single implementation.
 * All route files importing roleMiddleware receive the canonical guard.
 */
export { authorizeRoles, authorize, protect } from './authMiddleware.js';
