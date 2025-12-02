import Slot from '../models/slotModel.js';
import Project from '../models/projectModel.js';

// Check if user can create slots (Project Head, Admin, Superadmin)
export const canCreateSlot = async (req, res, next) => {
  try {
    const { project } = req.body;

    // Superadmin and Admin can create slots for any project
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    // Check if user is the project head
    if (project) {
      const projectDoc = await Project.findById(project);
      
      if (!projectDoc) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check if user is the project head
      if (projectDoc.projectHead && projectDoc.projectHead.toString() === req.user._id.toString()) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to create slots for this project'
    });
  } catch (error) {
    console.error('Error in canCreateSlot middleware:', error);
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

    // Superadmin and Admin can edit any slot
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    // Check if user is the project head
    if (slot.project.projectHead && slot.project.projectHead.toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to edit this slot'
    });
  } catch (error) {
    console.error('Error in canEditSlot middleware:', error);
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

    // Superadmin and Admin can delete any slot
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    // Check if user is the project head
    if (slot.project.projectHead && slot.project.projectHead.toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to delete this slot'
    });
  } catch (error) {
    console.error('Error in canDeleteSlot middleware:', error);
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

    // Superadmin and Admin can view any slot
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    // Project head can view slots in their project
    if (slot.project.projectHead && slot.project.projectHead.toString() === req.user._id.toString()) {
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
    console.error('Error in canViewSlot middleware:', error);
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

    // Superadmin and Admin can update any slot status
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    // Project head can update slot status
    if (slot.project.projectHead && slot.project.projectHead.toString() === req.user._id.toString()) {
      return next();
    }

    // Assigned employee can update their slot status
    if (slot.assignedTo && slot.assignedTo.toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to update this slot status'
    });
  } catch (error) {
    console.error('Error in canUpdateStatus middleware:', error);
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

    // Superadmin and Admin can upload to any slot
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    // Project head can upload to slots in their project
    if (slot.project.projectHead && slot.project.projectHead.toString() === req.user._id.toString()) {
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
    console.error('Error in canUploadCreative middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking permissions',
      error: error.message
    });
  }
};
