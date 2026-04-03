import Holiday from '../models/holidayModel.js';

// Get all holidays
export const getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find()
      .populate('createdBy', 'name email')
      .sort({ date: 1 });
    
    res.json({
      success: true,
      data: holidays
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch holidays',
      error: error.message
    });
  }
};

// Get upcoming holidays (next 30 days)
export const getUpcomingHolidays = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    thirtyDaysFromNow.setHours(23, 59, 59, 999); // End of day
    
    const holidays = await Holiday.find({
      date: {
        $gte: today,
        $lte: thirtyDaysFromNow
      }
    })
    .populate('createdBy', 'name email')
    .sort({ date: 1 })
    .limit(10); // Limit to 10 upcoming holidays
    
    res.json({
      success: true,
      data: holidays
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming holidays',
      error: error.message
    });
  }
};

// Create holiday (HR/Admin only)
export const createHoliday = async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    
    // Validate required fields
    if (!name || !date) {
      return res.status(400).json({
        success: false,
        message: 'Name and date are required'
      });
    }
    
    // Check if holiday already exists on the same date
    const existingHoliday = await Holiday.findOne({
      date: new Date(date),
      name: { $regex: new RegExp(name, 'i') }
    });
    
    if (existingHoliday) {
      return res.status(400).json({
        success: false,
        message: 'A holiday with this name already exists on this date'
      });
    }
    
    const holiday = new Holiday({
      name: name.trim(),
      date: new Date(date),
      type: type || 'public',
      description: description?.trim(),
      isOptional: false, // Always set to false since we removed the option
      createdBy: req.user.id
    });
    
    await holiday.save();
    await holiday.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      data: holiday,
      message: 'Holiday created successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to create holiday',
      error: error.message
    });
  }
};

// Update holiday (HR/Admin only)
export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, type, description } = req.body;
    
    // Validate required fields
    if (!name || !date) {
      return res.status(400).json({
        success: false,
        message: 'Name and date are required'
      });
    }
    
    const holiday = await Holiday.findByIdAndUpdate(
      id,
      { 
        name: name.trim(),
        date: new Date(date),
        type: type || 'public',
        description: description?.trim(),
        isOptional: false, // Always set to false since we removed the option
        updatedAt: Date.now() 
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    res.json({
      success: true,
      data: holiday,
      message: 'Holiday updated successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to update holiday',
      error: error.message
    });
  }
};

// Delete holiday (HR/Admin only)
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    
    const holiday = await Holiday.findByIdAndDelete(id);
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete holiday',
      error: error.message
    });
  }
};