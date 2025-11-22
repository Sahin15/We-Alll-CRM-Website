import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Mock data for now - replace with actual database operations
let announcements = [
  {
    _id: '1',
    title: 'Welcome to the Team!',
    content: 'We are excited to have you join our team. Please review the employee handbook.',
    type: 'general',
    isPinned: true,
    createdBy: { name: 'HR Department' },
    createdAt: new Date('2024-11-15'),
  },
  {
    _id: '2',
    title: 'Holiday Notice',
    content: 'Office will be closed on December 25th for Christmas.',
    type: 'holiday',
    isPinned: false,
    createdBy: { name: 'Admin' },
    createdAt: new Date('2024-11-10'),
  },
  {
    _id: '3',
    title: 'New Policy Update',
    content: 'Please review the updated remote work policy in the employee portal.',
    type: 'policy',
    isPinned: true,
    createdBy: { name: 'HR Department' },
    createdAt: new Date('2024-11-05'),
  },
];

// @route   GET /api/announcements
// @desc    Get all announcements
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Sort by pinned first, then by date
    const sortedAnnouncements = announcements.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(sortedAnnouncements);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/announcements
// @desc    Create announcement
// @access  Private (Admin/HR only)
router.post('/', protect, authorize('admin', 'superadmin', 'hr'), async (req, res) => {
  try {
    const { title, content, type, isPinned, department } = req.body;

    const newAnnouncement = {
      _id: String(announcements.length + 1),
      title,
      content,
      type: type || 'general',
      isPinned: isPinned || false,
      department,
      createdBy: { name: req.user.name, _id: req.user._id },
      createdAt: new Date(),
    };

    announcements.push(newAnnouncement);
    res.status(201).json(newAnnouncement);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/announcements/:id
// @desc    Update announcement
// @access  Private (Admin/HR only)
router.put('/:id', protect, authorize('admin', 'superadmin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, isPinned } = req.body;

    const index = announcements.findIndex(a => a._id === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    announcements[index] = {
      ...announcements[index],
      title: title || announcements[index].title,
      content: content || announcements[index].content,
      type: type || announcements[index].type,
      isPinned: isPinned !== undefined ? isPinned : announcements[index].isPinned,
      updatedAt: new Date(),
    };

    res.json(announcements[index]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/announcements/:id
// @desc    Delete announcement
// @access  Private (Admin/HR only)
router.delete('/:id', protect, authorize('admin', 'superadmin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const index = announcements.findIndex(a => a._id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    announcements.splice(index, 1);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
