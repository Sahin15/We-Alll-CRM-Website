import Feedback from "../models/feedbackModel.js";

// Create new feedback
export const createFeedback = async (req, res) => {
  try {
    const {
      category,
      title,
      description,
      priority,
      isAnonymous,
      tags
    } = req.body;

    const employee = req.user?.id;

    // Validate required fields
    if (!category || !title || !description) {
      return res.status(400).json({
        message: "Category, title, and description are required"
      });
    }

    if (!employee) {
      return res.status(400).json({
        message: "User authentication required"
      });
    }

    // Convert isAnonymous string to boolean (FormData sends strings)
    const isAnonymousBool = isAnonymous === 'true' || isAnonymous === true;

    // Handle file attachments if any
    const attachments = [];
    if (req.files && req.files.length > 0) {
      const { uploadDocumentToS3 } = await import("../utils/documentUpload.js");
      
      for (const file of req.files) {
        try {
          const documentUrl = await uploadDocumentToS3(
            file.buffer,
            file.originalname,
            file.mimetype,
            "feedback-attachments"
          );
          attachments.push({
            filename: file.originalname,
            url: documentUrl,
            uploadDate: new Date()
          });
        } catch (uploadError) {
          
          return res.status(400).json({
            message: `Failed to upload attachment "${file.originalname}": ${uploadError.message}`
          });
        }
      }
    }

    const feedback = await Feedback.create({
      employee: isAnonymousBool ? null : employee,
      category,
      title,
      description,
      priority: priority || "medium",
      isAnonymous: isAnonymousBool,
      attachments,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    // Populate employee details for response
    if (!isAnonymousBool) {
      await feedback.populate('employee', 'name email');
    }

    // Add hasUserUpvoted property
    const feedbackObj = feedback.toObject({ virtuals: true });
    feedbackObj.hasUserUpvoted = false; // New feedback, user hasn't upvoted yet

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback: feedbackObj
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get all feedback (Admin/HR only)
export const getAllFeedback = async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      assignedTo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    // Add search filter - combine with AND logic if other filters exist
    if (search) {
      const searchConditions = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $elemMatch: { $regex: search, $options: 'i' } } }
      ];
      
      // If there are other filters, combine them with search using $and
      if (Object.keys(filter).length > 0) {
        const existingFilters = { ...filter };
        filter.$and = [
          existingFilters,
          { $or: searchConditions }
        ];
        // Remove the individual filter keys since they're now in $and
        Object.keys(existingFilters).forEach(key => {
          if (key !== '$and') delete filter[key];
        });
      } else {
        filter.$or = searchConditions;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get feedback with pagination
    const feedback = await Feedback.find(filter)
      .populate('employee', 'name email department')
      .populate('assignedTo', 'name email')
      .populate('respondedBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Feedback.countDocuments(filter);

    // Add hasUserUpvoted property and hide employee info for anonymous feedback
    const userId = req.user.id;
    const feedbackWithUpvoteStatus = feedback.map(item => {
      const feedbackObj = item.toObject({ virtuals: true });
      feedbackObj.hasUserUpvoted = item.hasUserUpvoted(userId);
      
      // Hide employee information for anonymous feedback
      if (feedbackObj.isAnonymous) {
        feedbackObj.employee = null;
      }
      
      return feedbackObj;
    });

    res.status(200).json({
      feedback: feedbackWithUpvoteStatus,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get employee's own feedback
export const getMyFeedback = async (req, res) => {
  try {
    const employee = req.user.id;
    const { status, category, search, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = { employee };
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    // Add search filter - combine with AND logic if other filters exist
    if (search) {
      const searchConditions = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $elemMatch: { $regex: search, $options: 'i' } } }
      ];
      
      // Combine employee filter with search
      const existingFilters = { ...filter };
      filter.$and = [
        existingFilters,
        { $or: searchConditions }
      ];
      // Remove the individual filter keys since they're now in $and
      Object.keys(existingFilters).forEach(key => {
        if (key !== '$and') delete filter[key];
      });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const feedback = await Feedback.find(filter)
      .populate('assignedTo', 'name email')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(filter);

    // Add hasUserUpvoted property to each feedback item
    const userId = req.user.id;
    const feedbackWithUpvoteStatus = feedback.map(item => {
      const feedbackObj = item.toObject({ virtuals: true });
      feedbackObj.hasUserUpvoted = item.hasUserUpvoted(userId);
      return feedbackObj;
    });

    res.status(200).json({
      feedback: feedbackWithUpvoteStatus,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get feedback by ID
export const getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const feedback = await Feedback.findById(id)
      .populate('employee', 'name email department')
      .populate('assignedTo', 'name email')
      .populate('respondedBy', 'name email');

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    // Check permissions
    const isOwner = feedback.employee && feedback.employee._id.toString() === userId;
    const isAdmin = ['admin', 'superadmin', 'hr'].includes(userRole);
    const isAssigned = feedback.assignedTo && feedback.assignedTo._id.toString() === userId;

    if (!isOwner && !isAdmin && !isAssigned) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Add hasUserUpvoted property
    const feedbackObj = feedback.toObject({ virtuals: true });
    feedbackObj.hasUserUpvoted = feedback.hasUserUpvoted(userId);

    res.status(200).json(feedbackObj);
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Update feedback status and response (Admin/HR only)
export const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      adminResponse,
      assignedTo,
      priority,
      tags,
      resolution,
      estimatedResolutionDate
    } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    // Update fields
    if (status) {
      feedback.status = status;
      
      // Set resolution date if status is resolved or closed
      if (status === 'resolved' || status === 'closed') {
        feedback.actualResolutionDate = new Date();
      }
    }

    if (adminResponse) {
      feedback.adminResponse = adminResponse;
      feedback.responseDate = new Date();
      feedback.respondedBy = req.user.id;
    }

    if (assignedTo) feedback.assignedTo = assignedTo;
    if (priority) feedback.priority = priority;
    if (resolution) feedback.resolution = resolution;
    if (estimatedResolutionDate) feedback.estimatedResolutionDate = estimatedResolutionDate;
    
    if (tags) {
      feedback.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    }

    await feedback.save();

    // Populate for response
    await feedback.populate([
      { path: 'employee', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'respondedBy', select: 'name email' }
    ]);

    // Add hasUserUpvoted property
    const feedbackObj = feedback.toObject({ virtuals: true });
    feedbackObj.hasUserUpvoted = feedback.hasUserUpvoted(req.user.id);

    res.status(200).json({
      message: "Feedback updated successfully",
      feedback: feedbackObj
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Toggle upvote on feedback
export const toggleUpvote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    const hasUpvoted = feedback.hasUserUpvoted(userId);

    if (hasUpvoted) {
      // Remove upvote
      feedback.upvotes = feedback.upvotes.filter(
        upvoteId => upvoteId.toString() !== userId
      );
    } else {
      // Add upvote
      feedback.upvotes.push(userId);
    }

    await feedback.save();

    // Calculate upvote count manually to ensure accuracy
    const upvoteCount = feedback.upvotes ? feedback.upvotes.length : 0;

    res.status(200).json({
      message: hasUpvoted ? "Upvote removed" : "Upvote added",
      upvoteCount: upvoteCount,
      hasUpvoted: !hasUpvoted
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get feedback statistics (Admin/HR only)
export const getFeedbackStatistics = async (req, res) => {
  try {
    const stats = await Feedback.getStatistics();
    res.status(200).json(stats);
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get trending feedback (Admin/HR only)
export const getTrendingFeedback = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const trending = await Feedback.getTrending(parseInt(limit));
    res.status(200).json(trending);
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Delete feedback (Admin only or own feedback if not responded)
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    // Check permissions
    const isOwner = feedback.employee ? feedback.employee.toString() === userId : false;
    const isAdmin = ['admin', 'superadmin'].includes(userRole);
    const hasResponse = feedback.adminResponse || feedback.responseDate;

    // Only allow deletion if:
    // 1. User is admin/superadmin, OR
    // 2. User is owner and feedback hasn't been responded to
    if (!isAdmin && (!isOwner || hasResponse)) {
      return res.status(403).json({
        message: "Cannot delete feedback that has been responded to"
      });
    }

    await Feedback.findByIdAndDelete(id);

    res.status(200).json({
      message: "Feedback deleted successfully"
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};