/**
 * Client Work Routes
 * Routes for client-specific work tracking and reporting
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getClientWorkOverview,
  getClientSlots,
  getClientWorkTimeline,
  getClientWorkStatistics
} from '../controllers/clientWorkController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Client work overview routes
router.get('/:clientId/work-overview', getClientWorkOverview);
router.get('/:clientId/slots', getClientSlots);
router.get('/:clientId/timeline', getClientWorkTimeline);
router.get('/:clientId/statistics', getClientWorkStatistics);

export default router;