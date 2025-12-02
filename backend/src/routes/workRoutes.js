import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Slot from '../models/slotModel.js';

const router = express.Router();

// Get all work items (slots) for logged-in employee
router.get('/my-work', protect, async (req, res) => {
  try {
    // Get slots assigned to this user
    const slots = await Slot.find({ assignedTo: req.user._id })
      .populate('project', 'name')
      .populate('client', 'name')
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name')
      .sort({ postingDate: 1 });

    // Transform slots into unified work items
    const workItems = slots.map(slot => ({
      _id: slot._id,
      type: 'content',
      title: slot.brief,
      description: slot.caption,
      status: slot.designStatus,
      priority: slot.contentBucket,
      startDate: slot.designDeadline,
      dueDate: slot.postingDate,
      project: slot.project,
      client: slot.client,
      assignedTo: slot.assignedTo,
      createdBy: slot.createdBy,
      platforms: slot.platforms,
      postType: slot.postType,
      occasion: slot.occasion,
      createdAt: slot.createdAt,
      updatedAt: slot.updatedAt,
      // Include full slot data for details modal
      slotData: slot
    }));

    res.json({
      success: true,
      count: workItems.length,
      data: workItems
    });
  } catch (error) {
    console.error('Error fetching work items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work items',
      error: error.message
    });
  }
});

export default router;
