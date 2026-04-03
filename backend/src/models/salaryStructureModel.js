import mongoose from "mongoose";

const salaryStructureSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee is required"],
    },
    effectiveFrom: {
      type: Date,
      required: [true, "Effective from date is required"],
    },
    effectiveTo: {
      type: Date,
      default: null, // null means currently active
    },
    
    // Earnings
    basicSalary: {
      type: Number,
      required: [true, "Basic salary is required"],
      min: [0, "Basic salary cannot be negative"],
    },
    hra: {
      type: Number,
      default: 0,
      min: [0, "HRA cannot be negative"],
    },
    specialAllowance: {
      type: Number,
      default: 0,
      min: [0, "Special allowance cannot be negative"],
    },
    transportAllowance: {
      type: Number,
      default: 0,
      min: [0, "Transport allowance cannot be negative"],
    },
    medicalAllowance: {
      type: Number,
      default: 0,
      min: [0, "Medical allowance cannot be negative"],
    },
    otherAllowances: [
      {
        name: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        isTaxable: {
          type: Boolean,
          default: true,
        },
      },
    ],
    
    // Deductions
    providentFund: {
      type: Number,
      default: 0,
      min: [0, "PF cannot be negative"],
    },
    professionalTax: {
      type: Number,
      default: 0,
      min: [0, "Professional tax cannot be negative"],
    },
    tds: {
      type: Number,
      default: 0,
      min: [0, "TDS cannot be negative"],
    },
    esi: {
      type: Number,
      default: 0,
      min: [0, "ESI cannot be negative"],
    },
    otherDeductions: [
      {
        name: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        reason: String,
      },
    ],
    
    // Calculated fields
    grossSalary: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      default: 0,
    },
    ctc: {
      type: Number,
      default: 0,
    },
    
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["draft", "active", "superseded"],
      default: "draft",
    },
    notes: {
      type: String,
      trim: true,
    },
    
    // Template tracking (enhanced fields)
    generatedFromTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryStructureTemplate",
      default: null
    },
    templateVersion: {
      type: Number,
      default: null
    },
    
    // Enhanced tracking for new payroll system
    isActive: {
      type: Boolean,
      default: true
    },
  },
  {
    timestamps: true,
  }
);

// Calculate gross salary before saving
salaryStructureSchema.pre("save", function (next) {
  // Calculate gross salary (all earnings)
  let gross = this.basicSalary + this.hra + this.specialAllowance + 
              this.transportAllowance + this.medicalAllowance;
  
  // Add other allowances
  if (this.otherAllowances && this.otherAllowances.length > 0) {
    gross += this.otherAllowances.reduce((sum, allowance) => sum + allowance.amount, 0);
  }
  
  this.grossSalary = gross;
  
  // Calculate total deductions
  let deductions = this.providentFund + this.professionalTax + this.tds + this.esi;
  
  // Add other deductions
  if (this.otherDeductions && this.otherDeductions.length > 0) {
    deductions += this.otherDeductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  }
  
  this.totalDeductions = deductions;
  
  // Calculate net salary
  this.netSalary = this.grossSalary - this.totalDeductions;
  
  // Calculate annual CTC (gross salary * 12)
  this.ctc = this.grossSalary * 12;
  
  next();
});

// Index for faster queries
salaryStructureSchema.index({ employee: 1, effectiveFrom: -1 });
salaryStructureSchema.index({ status: 1 });

// Static method to get active salary structure for an employee
salaryStructureSchema.statics.getActiveStructure = async function(employeeId) {
  return this.findOne({
    employee: employeeId,
    status: "active"
  })
  .sort({ effectiveFrom: -1 })
  .populate("employee", "name email employeeId designation department");
};

const SalaryStructure = mongoose.model("SalaryStructure", salaryStructureSchema);

export default SalaryStructure;
