import Slot from '../models/slotModel.js';
import Project from '../models/projectModel.js';
import User from '../models/userModel.js';
import { 
  notifySlotAssigned, 
  notifyProjectHeadStatusUpdate, 
  notifyProjectHeadCreativeUploaded,
  notifySlotComment 
} from '../utils/slotNotifications.js';
import logger from '../utils/logger.js';
import { optimizedSlotPopulate, buildTextSearch, buildDateRangeQuery } from '../utils/queryOptimizer.js';

// @desc    Get all slots (optimized but backward compatible)
// @route   GET /api/slots
// @access  Private
export const getAllSlots = async (req, res) => {
  try {
    const { 
      project, 
      assignedTo, 
      status, 
      platform, 
      startDate, 
      endDate,
      search 
    } = req.query;

    // Build query
    let query = {};

    if (project) query.project = project;
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;
    if (platform) query.platforms = platform;

    // Date range filter
    Object.assign(query, buildDateRangeQuery(startDate, endDate, 'dueDate'));

    // Search filter
    if (search) {
      Object.assign(query, buildTextSearch(search, ['title', 'description', 'brief', 'occasion']));
    }

    logger.info('getAllSlots - User:', req.user.email);

    // Optimized query WITHOUT pagination (backward compatible)
    const slots = await Slot.find(query)
      .select('title description status priority dueDate assignedTo project client workType brief designStatus postingDate')
      .populate(optimizedSlotPopulate())
      .sort({ dueDate: 1 })
      .lean();

    logger.success(`Found ${slots.length} slots`);

    // Return simple response (backward compatible)
    res.json({
      success: true,
      count: slots.length,
      data: slots
    });
  } catch (error) {
    logger.error('Error fetching slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching slots',
      error: error.message
    });
  }
};

// @desc    Get slots by project (optimized but backward compatible)
// @route   GET /api/slots/project/:projectId
// @access  Private
export const getSlotsByProject = async (req, res) => {
  try {
    const slots = await Slot.find({ project: req.params.projectId })
      .select('title description status priority dueDate assignedTo workType project client metadata platforms postType occasion')
      .populate('assignedTo', 'name email designation')
      .populate('project', 'name')
      .populate('client', 'name')
      .sort({ dueDate: 1 })
      .lean();

    res.json({
      success: true,
      count: slots.length,
      data: slots
    });
  } catch (error) {
    logger.error('Error fetching project slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching slots',
      error: error.message
    });
  }
};

// Legacy function - keeping for backward compatibility
export const getSlotsByProjectLegacy = async (req, res) => {
  try {
    const slots = await Slot.find({ project: req.params.projectId })
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name')
      .sort({ postingDate: 1 });

    res.json({
      success: true,
      count: slots.length,
      data: slots
    });
  } catch (error) {
    console.error('Error fetching project slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project slots',
      error: error.message
    });
  }
};

// @desc    Get slots assigned to employee
// @route   GET /api/slots/my-slots
// @access  Private (Employee)
export const getMySlots = async (req, res) => {
  try {
    const slots = await Slot.find({ assignedTo: req.user._id })
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name')
      .sort({ postingDate: 1 });

    res.json({
      success: true,
      count: slots.length,
      data: slots
    });
  } catch (error) {
    console.error('Error fetching my slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your slots',
      error: error.message
    });
  }
};

// @desc    Get single slot
// @route   GET /api/slots/:id
// @access  Private
export const getSlotById = async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id)
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name')
      .populate('comments.user', 'name');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    res.json({
      success: true,
      data: slot
    });
  } catch (error) {
    console.error('Error fetching slot:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching slot',
      error: error.message
    });
  }
};

// @desc    Create new slot
// @route   POST /api/slots
// @access  Private (Project Head, Admin, Superadmin)
export const createSlot = async (req, res) => {
  try {
    const {
      // Universal fields
      client,
      project,
      title,
      description,
      workType,
      priority,
      assignedTo,
      startDate,
      dueDate,
      metadata,
      
      // Legacy fields (for backward compatibility)
      postType,
      platforms,
      contentBucket,
      occasion,
      brief,
      caption,
      hashtags,
      referenceLinks,
      designDeadline,
      postingDate
    } = req.body;

    // Determine if this is new format or legacy format
    const isNewFormat = title && description && workType && dueDate;
    const isLegacyFormat = postType && platforms && brief && designDeadline && postingDate;

    // Validate required fields based on format
    if (!isNewFormat && !isLegacyFormat) {
      return res.status(400).json({
        success: false,
        message: 'Please provide required fields: title, description, workType, assignedTo, dueDate'
      });
    }

    if (!project || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Project and assignedTo are required'
      });
    }

    // Verify project exists
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Verify assigned employee exists
    const employeeExists = await User.findById(assignedTo);
    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: 'Assigned employee not found'
      });
    }

    // Prepare slot data
    const slotData = {
      client: client || projectExists.client,
      project,
      assignedTo,
      createdBy: req.user._id,
    };

    // Handle new format
    if (isNewFormat) {
      slotData.title = title;
      slotData.description = description;
      slotData.workType = workType;
      slotData.priority = priority || 'Medium';
      slotData.startDate = startDate;
      slotData.dueDate = dueDate;
      slotData.status = 'Pending';
      slotData.metadata = metadata || {};
      
      // If legacy fields provided, add them too
      if (postType) slotData.postType = postType;
      if (platforms) slotData.platforms = platforms;
      if (contentBucket) slotData.contentBucket = contentBucket;
      if (occasion) slotData.occasion = occasion;
      if (brief) slotData.brief = brief;
      if (caption) slotData.caption = caption;
      if (hashtags) slotData.hashtags = hashtags;
      if (referenceLinks) slotData.referenceLinks = referenceLinks;
      if (designDeadline) slotData.designDeadline = designDeadline;
      if (postingDate) slotData.postingDate = postingDate;
    } 
    // Handle legacy format (convert to new format)
    else {
      slotData.title = brief.substring(0, 100);
      slotData.description = brief;
      slotData.workType = 'Social Media Post';
      slotData.priority = 'Medium';
      slotData.dueDate = designDeadline;
      slotData.status = 'Pending';
      
      // Keep legacy fields
      slotData.postType = postType;
      slotData.platforms = platforms;
      slotData.contentBucket = contentBucket;
      slotData.occasion = occasion;
      slotData.brief = brief;
      slotData.caption = caption;
      slotData.hashtags = hashtags;
      slotData.referenceLinks = referenceLinks;
      slotData.designDeadline = designDeadline;
      slotData.postingDate = postingDate;
      slotData.designStatus = 'Planned';
      
      // Store legacy-specific data in metadata
      slotData.metadata = {
        platforms,
        postType,
        postingDate,
        contentBucket
      };
    }

    // Create slot
    const slot = await Slot.create(slotData);

    const populatedSlot = await Slot.findById(slot._id)
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name');

    // Auto-update project progress when new work assignment is created
    if (project) {
      try {
        const { calculateProjectProgress } = await import('./projectController.js');
        const newProgress = await calculateProjectProgress(project);
        
        const projectDoc = await Project.findById(project);
        if (projectDoc) {
          projectDoc.progress = newProgress;
          if (newProgress > 0) projectDoc.status = "In Progress";
          await projectDoc.save();
          console.log(`✅ Auto-updated project progress: ${newProgress}%`);
        }
      } catch (error) {
        console.error('Error auto-updating project progress:', error);
      }
    }

    // Send notification to assigned employee
    if (populatedSlot.assignedTo) {
      notifySlotAssigned(populatedSlot, populatedSlot.assignedTo).catch(err => 
        console.error('Failed to send assignment notification:', err)
      );
    }

    res.status(201).json({
      success: true,
      message: 'Work assignment created successfully',
      data: populatedSlot
    });
  } catch (error) {
    console.error('Error creating slot:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating work assignment',
      error: error.message
    });
  }
};

// @desc    Update slot
// @route   PUT /api/slots/:id
// @access  Private (Project Head, Admin, Superadmin)
export const updateSlot = async (req, res) => {
  try {
    let slot = await Slot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    // Update slot
    slot = await Slot.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name');

    res.json({
      success: true,
      message: 'Slot updated successfully',
      data: slot
    });
  } catch (error) {
    console.error('Error updating slot:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating slot',
      error: error.message
    });
  }
};

// @desc    Update slot status (for employees)
// @route   PATCH /api/slots/:id/status
// @access  Private (Assigned Employee)
export const updateSlotStatus = async (req, res) => {
  try {
    const { status, designStatus, approvalStatus, rejectionReason } = req.body;

    // Support both new 'status' and legacy 'designStatus'
    const newStatus = status || designStatus;

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const slot = await Slot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found'
      });
    }

    // Update status (new format)
    if (status) {
      // Validate status is in the enum
      const validStatuses = ["Pending", "In Progress", "Review", "Revision", "Approved", "Completed", "Cancelled"];
      if (validStatuses.includes(status)) {
        slot.status = status;
      }
      
      // Map new status to legacy designStatus for backward compatibility
      const statusMap = {
        'Pending': 'Planned',
        'In Progress': 'In Design',
        'Review': 'Ready for Review',
        'Approved': 'Approved',
        'Revision': 'Revision Needed',
        'Completed': 'Approved'
      };
      
      const mappedDesignStatus = statusMap[status];
      if (mappedDesignStatus) {
        slot.designStatus = mappedDesignStatus;
      }
    }
    
    // Update legacy designStatus
    if (designStatus) {
      // Validate designStatus is in the enum
      const validDesignStatuses = ["Planned", "In Design", "Ready for Review", "Approved", "Revision Needed", "Needs Revision"];
      if (validDesignStatuses.includes(designStatus)) {
        slot.designStatus = designStatus;
      }
      
      // Map legacy status to new status
      const legacyMap = {
        'Planned': 'Pending',
        'In Design': 'In Progress',
        'Ready for Review': 'Review',
        'Approved': 'Approved',
        'Revision Needed': 'Revision',
        'Needs Revision': 'Revision'
      };
      
      const mappedStatus = legacyMap[designStatus];
      if (mappedStatus) {
        slot.status = mappedStatus;
      }
    }

    // Handle approval workflow
    if (approvalStatus) {
      slot.approvalStatus = approvalStatus;
      if (approvalStatus === 'Approved') {
        slot.approvedBy = req.user._id;
        slot.approvedAt = new Date();
        slot.status = 'Approved';
      } else if (approvalStatus === 'Rejected') {
        slot.status = 'Revision';
        slot.rejectionReason = rejectionReason;
      }
    }

    await slot.save({ validateModifiedOnly: true });

    const updatedSlot = await Slot.findById(slot._id)
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');

    // Auto-update project progress when work assignment status changes
    if (updatedSlot.project?._id) {
      try {
        const { calculateProjectProgress } = await import('./projectController.js');
        const newProgress = await calculateProjectProgress(updatedSlot.project._id);
        
        const project = await Project.findById(updatedSlot.project._id);
        if (project) {
          project.progress = newProgress;
          
          // Auto-update project status based on progress
          if (newProgress === 0) project.status = "Pending";
          else if (newProgress > 0 && newProgress < 100) project.status = "In Progress";
          else if (newProgress === 100) project.status = "Completed";
          
          await project.save();
          console.log(`✅ Auto-updated project progress: ${newProgress}%`);
        }
        
        // Notify project head about status update
        const populatedProject = await Project.findById(updatedSlot.project._id).populate('projectHead');
        if (populatedProject?.projectHead && populatedProject.projectHead._id.toString() !== req.user._id.toString()) {
          notifyProjectHeadStatusUpdate(updatedSlot, populatedProject.projectHead, newStatus).catch(err =>
            console.error('Failed to send status update notification:', err)
          );
        }
      } catch (error) {
        console.error('Error auto-updating project progress:', error);
        // Don't fail the request if progress update fails
      }
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: updatedSlot
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message
    });
  }
};

// @desc    Add comment to slot
// @route   POST /api/slots/:id/comments
// @access  Private
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const slot = await Slot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    slot.comments.push({
      user: req.user._id,
      text
    });

    await slot.save();

    const updatedSlot = await Slot.findById(slot._id)
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name')
      .populate('comments.user', 'name');

    // Notify relevant users about the comment
    const recipients = [];
    if (updatedSlot.assignedTo) recipients.push(updatedSlot.assignedTo);
    if (updatedSlot.createdBy) recipients.push(updatedSlot.createdBy);
    
    const project = await Project.findById(updatedSlot.project._id).populate('projectHead');
    if (project?.projectHead) recipients.push(project.projectHead);

    if (recipients.length > 0) {
      notifySlotComment(updatedSlot, req.user, recipients).catch(err =>
        console.error('Failed to send comment notifications:', err)
      );
    }

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: updatedSlot
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
};

// @desc    Upload creative to slot
// @route   POST /api/slots/:id/creatives
// @access  Private (Assigned Employee)
export const uploadCreative = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const slot = await Slot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    // Determine file type
    let fileType = 'document';
    if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
    }

    slot.creatives.push({
      type: fileType,
      url: `/uploads/slots/${req.file.filename}`,
      filename: req.file.originalname,
      uploadedBy: req.user._id
    });

    await slot.save();

    const updatedSlot = await Slot.findById(slot._id)
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name');

    // Notify project head about creative upload
    const project = await Project.findById(updatedSlot.project._id).populate('projectHead');
    if (project?.projectHead && project.projectHead._id.toString() !== req.user._id.toString()) {
      notifyProjectHeadCreativeUploaded(updatedSlot, project.projectHead, req.user).catch(err =>
        console.error('Failed to send creative upload notification:', err)
      );
    }

    res.json({
      success: true,
      message: 'Creative uploaded successfully',
      data: updatedSlot
    });
  } catch (error) {
    console.error('Error uploading creative:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading creative',
      error: error.message
    });
  }
};

// @desc    Delete slot
// @route   DELETE /api/slots/:id
// @access  Private (Project Head, Admin, Superadmin)
export const deleteSlot = async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    await slot.deleteOne();

    res.json({
      success: true,
      message: 'Slot deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting slot',
      error: error.message
    });
  }
};

// @desc    Get slot statistics
// @route   GET /api/slots/stats/:projectId
// @access  Private
export const getSlotStatistics = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const slots = await Slot.find({ project: projectId });

    const stats = {
      total: slots.length,
      posted: slots.filter(s => s.postingStatus === 'Posted').length,
      inProgress: slots.filter(s => 
        ['Planned', 'In Design', 'Ready for Review', 'Needs Revision', 'Approved'].includes(s.designStatus)
      ).length,
      overdue: slots.filter(s => {
        const now = new Date();
        return s.postingDate < now && s.postingStatus !== 'Posted';
      }).length,
      byStatus: {
        planned: slots.filter(s => s.designStatus === 'Planned').length,
        inDesign: slots.filter(s => s.designStatus === 'In Design').length,
        readyForReview: slots.filter(s => s.designStatus === 'Ready for Review').length,
        needsRevision: slots.filter(s => s.designStatus === 'Needs Revision').length,
        approved: slots.filter(s => s.designStatus === 'Approved').length,
        posted: slots.filter(s => s.postingStatus === 'Posted').length
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// ============================================
// HoP Slot Management Functions
// ============================================

/**
 * Get slots created by me (HoP)
 */
export const getMyCreatedSlots = async (req, res) => {
  try {
    const userId = req.user._id;

    const slots = await Slot.find({ createdBy: userId })
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: slots,
      total: slots.length
    });
  } catch (error) {
    console.error('Error fetching created slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching created slots',
      error: error.message
    });
  }
};

/**
 * Get slots for a specific project
 */
export const getProjectSlots = async (req, res) => {
  try {
    const { projectId } = req.params;

    const slots = await Slot.find({ project: projectId })
      .populate('assignedTo', 'name email designation')
      .populate('createdBy', 'name')
      .sort({ postingDate: 1 });

    res.status(200).json({
      success: true,
      data: slots,
      total: slots.length
    });
  } catch (error) {
    console.error('Error fetching project slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project slots',
      error: error.message
    });
  }
};

/**
 * Get my assigned tasks (for employees)
 */
export const getMyTasks = async (req, res) => {
  try {
    const userId = req.user._id;

    const slots = await Slot.find({ assignedTo: userId })
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('createdBy', 'name')
      .sort({ postingDate: 1 });

    res.status(200).json({
      success: true,
      data: slots,
      total: slots.length
    });
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching my tasks',
      error: error.message
    });
  }
};


