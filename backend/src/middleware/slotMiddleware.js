import Slot from '../models/slotModel.js';
import Project from '../models/projectModel.js';
import logger from '../utils/logger.js';
import { canCreateWorkAssignment } from '../utils/permissions.js';

// Check if user can create slots (Project Head, Admin, Superadmin, or Team Member for themselves)
export const canCreateSlot = async (req, res, next) => {
  try {
    const { project, assignedTo } = req.body;

    if (!project) {
      return res.status(400).json({
        success: false,
        message: 'Project is required'
      });
    }

    const projectDoc = await Project.findById(project).select('projectHead teamMembers department').lean();
    
    if (!projectDoc) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Use centralized permission check
    if (canCreateWorkAssignment(req.user, projectDoc, assignedTo)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to create work assignments for this project.'
    });
  } catch (error) {
    logger.error('Error in canCreateSlot middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking permissions',
      error: error.message
    });
  }
};

// Check if user can edit slots (Project Head, Admin, Superadmin)
export const canEditSlot = async (req, res, next) => {
  try {
    const slotId = req.params.id;
    const slot = await Slot.findById(slotId).populate('project');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    // Superadmin, Admin, and HoD can edit any slot
    if (['superadmin', 'admin', 'hod'].includes(req.user.role)) {
      return next();
    }

    // Check if user is the project head
    if (slot.project?.projectHead && slot.project.projectHead.toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to edit this slot'
    });
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      message: 'Error checking permissions',
      error: error.message
    });
  }
};

// Check if user can delete slots (Project Head, Admin, Superadmin)
export const canDeleteSlot = async (req, res, next) => {
  try {
    const slotId = req.params.id;
    const slot = await Slot.findById(slotId).populate('project');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    // Superadmin, Admin, and HoD can delete any slot
    if (['superadmin', 'admin', 'hod'].includes(req.user.role)) {
      return next();
    }

    // Check if user is the project head
    if (slot.project?.projectHead && slot.project.projectHead.toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to delete this slot'
    });
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      message: 'Error checking permissions',
      error: error.message
    });
  }
};

// Check if user can view slot (Anyone can view slots they're involved with)
export const canViewSlot = async (req, res, next) => {
  try {
    const slotId = req.params.id;
    const slot = await Slot.findById(slotId).populate('project');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    // Superadmin, Admin, and HoD can view any slot
    if (['superadmin', 'admin', 'hod'].includes(req.user.role)) {
      return next();
    }

    // Project head can view slots in their project
    if (slot.project?.projectHead && slot.project.projectHead.toString() === req.user._id.toString()) {
      return next();
    }

    // Assigned employee can view their slot
    if (slot.assignedTo && slot.assignedTo.toString() === req.user._id.toString()) {
      return next();
    }

    // Creator can view their slot
    if (slot.createdBy && slot.createdBy.toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to view this slot'
    });
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      message: 'Error checking permissions',
      error: error.message
    });
  }
};

// Check if user can update slot status (Assigned employee, Project Head, Admin, Superadmin)
export const canUpdateStatus = async (req, res, next) => {
  try {
    const slotId = req.params.id;
    const slot = await Slot.findById(slotId).populate('project');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    // Superadmin, Admin, and HoD can update any slot status
    if (['superadmin', 'admin', 'hod'].includes(req.user.role)) {
      return next();
    }

    // Project head can update slot status
    if (slot.project?.projectHead && slot.project.projectHead.toString() === req.user._id.toString()) {
      return next();
    }

    // Assigned employee can update their slot status
    if (slot.assignedTo && slot.assignedTo.toString() === req.user._id.toString()) {
      return next();
    }

    ,
      projectHead: slot.project?.projectHead?.toString()
    });

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to update this slot status'
    });
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      message: 'Error checking permissions',
      error: error.message
    });
  }
};

// Check if user can upload creatives (Assigned employee, Project Head, Admin, Superadmin)
export const canUploadCreative = async (req, res, next) => {
  try {
    const slotId = req.params.id;
    const slot = await Slot.findById(slotId).populate('project');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    // Superadmin, Admin, and HoD can upload to any slot
    if (['superadmin', 'admin', 'hod'].includes(req.user.role)) {
      return next();
    }

    // Project head can upload to slots in their project
    if (slot.project?.projectHead && slot.project.projectHead.toString() === req.user._id.toString()) {
      return next();
    }

    // Assigned employee can upload to their slot
    if (slot.assignedTo && slot.assignedTo.toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to upload creatives to this slot'
    });
  } catch (error) {
    
    return res.status(500).json({
      success: false,
      message: 'Error checking permissions',
      error: error.message
    });
  }
};
