import mongoose from "mongoose";

const workingDaysCalendarSchema = new mongoose.Schema({
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2050
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    default: null // null means company-wide
  },
  totalDays: {
    type: Number,
    required: true
  },
  weekends: {
    type: Number,
    required: true,
    default: 0
  },
  holidays: {
    type: Number,
    required: true,
    default: 0
  },
  workingDays: {
    type: Number,
    required: true
  },
  holidayDates: [{
    type: Date
  }],
  breakdown: {
    sundays: [{
      type: Date
    }],
    publicHolidays: [{
      type: Date
    }],
    companyHolidays: [{
      type: Date
    }]
  },
  workPattern: {
    type: String,
    enum: ["5-day", "6-day"],
    default: "6-day" // Monday to Saturday
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
workingDaysCalendarSchema.index({ month: 1, year: 1, department: 1 }, { unique: true });
workingDaysCalendarSchema.index({ year: 1, month: 1 });

// Static method to get or create working days for a month
workingDaysCalendarSchema.statics.getWorkingDays = async function(month, year, departmentId = null) {
  try {
    // Try to find existing record
    let workingDaysRecord = await this.findOne({
      month,
      year,
      department: departmentId
    });

    if (workingDaysRecord) {
      return workingDaysRecord;
    }

    // If not found, calculate and create new record
    const WorkingDaysCalculator = (await import("../services/workingDaysCalculator.js")).default;
    const calculator = new WorkingDaysCalculator();
    
    const calculationResult = await calculator.calculateWorkingDays(month, year, departmentId);
    
    workingDaysRecord = await this.create({
      month,
      year,
      department: departmentId,
      ...calculationResult
    });

    return workingDaysRecord;
  } catch (error) {
    
    throw error;
  }
};

// Static method to invalidate cache when holidays are updated
workingDaysCalendarSchema.statics.invalidateCache = async function(month, year, departmentId = null) {
  try {
    const query = { month, year };
    if (departmentId) {
      query.department = departmentId;
    }
    
    await this.deleteMany(query);
  } catch (error) {
    
    throw error;
  }
};

// Instance method to recalculate working days
workingDaysCalendarSchema.methods.recalculate = async function() {
  try {
    const WorkingDaysCalculator = (await import("../services/workingDaysCalculator.js")).default;
    const calculator = new WorkingDaysCalculator();
    
    const calculationResult = await calculator.calculateWorkingDays(
      this.month, 
      this.year, 
      this.department
    );
    
    Object.assign(this, calculationResult);
    await this.save();
    
    return this;
  } catch (error) {
    
    throw error;
  }
};

const WorkingDaysCalendar = mongoose.model("WorkingDaysCalendar", workingDaysCalendarSchema);

export default WorkingDaysCalendar;