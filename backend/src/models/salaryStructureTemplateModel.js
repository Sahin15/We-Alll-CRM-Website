import mongoose from "mongoose";

const salaryStructureTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true
  },
  designation: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Salary components
  basicSalary: {
    type: Number,
    required: true,
    min: 0
  },
  hra: {
    type: Number,
    default: 0,
    min: 0
  },
  specialAllowance: {
    type: Number,
    default: 0,
    min: 0
  },
  transportAllowance: {
    type: Number,
    default: 0,
    min: 0
  },
  medicalAllowance: {
    type: Number,
    default: 0,
    min: 0
  },
  otherAllowances: [{
    name: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  // Deductions
  providentFund: {
    type: Number,
    default: 0,
    min: 0
  },
  professionalTax: {
    type: Number,
    default: 200,
    min: 0
  },
  tds: {
    type: Number,
    default: 0,
    min: 0
  },
  esi: {
    type: Number,
    default: 0,
    min: 0
  },
  otherDeductions: [{
    name: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      default: ""
    }
  }],
  
  // Auto-calculation rules
  hraPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  pfPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  effectiveFrom: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

// Compound indexes
salaryStructureTemplateSchema.index({ department: 1, designation: 1, isActive: 1 });
salaryStructureTemplateSchema.index({ name: 1, version: 1 }, { unique: true });
salaryStructureTemplateSchema.index({ effectiveFrom: 1 });

// Virtual for gross salary calculation
salaryStructureTemplateSchema.virtual("grossSalary").get(function() {
  const otherAllowancesTotal = this.otherAllowances.reduce((sum, allowance) => sum + allowance.amount, 0);
  return this.basicSalary + this.hra + this.specialAllowance + 
         this.transportAllowance + this.medicalAllowance + otherAllowancesTotal;
});

// Virtual for total deductions calculation
salaryStructureTemplateSchema.virtual("totalDeductions").get(function() {
  const otherDeductionsTotal = this.otherDeductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  return this.providentFund + this.professionalTax + this.tds + this.esi + otherDeductionsTotal;
});

// Virtual for net salary calculation
salaryStructureTemplateSchema.virtual("netSalary").get(function() {
  return this.grossSalary - this.totalDeductions;
});

// Ensure virtuals are included in JSON output
salaryStructureTemplateSchema.set('toJSON', { virtuals: true });
salaryStructureTemplateSchema.set('toObject', { virtuals: true });

// Static method to get active template for department and designation
salaryStructureTemplateSchema.statics.getActiveTemplate = async function(departmentId, designation) {
  try {
    const template = await this.findOne({
      department: departmentId,
      designation: designation,
      isActive: true,
      effectiveFrom: { $lte: new Date() }
    })
    .populate("department", "name")
    .populate("createdBy", "name email")
    .populate("approvedBy", "name email")
    .sort({ version: -1 });

    return template;
  } catch (error) {
    console.error("Error getting active template:", error);
    throw error;
  }
};

// Static method to create new version of template
salaryStructureTemplateSchema.statics.createNewVersion = async function(templateId, updates, createdBy) {
  try {
    const currentTemplate = await this.findById(templateId);
    if (!currentTemplate) {
      throw new Error("Template not found");
    }

    // Deactivate current version
    currentTemplate.isActive = false;
    await currentTemplate.save();

    // Create new version
    const newTemplate = new this({
      ...currentTemplate.toObject(),
      ...updates,
      _id: undefined,
      version: currentTemplate.version + 1,
      isActive: true,
      createdBy,
      approvedBy: null,
      createdAt: undefined,
      updatedAt: undefined
    });

    await newTemplate.save();
    return newTemplate;
  } catch (error) {
    console.error("Error creating new template version:", error);
    throw error;
  }
};

// Static method to apply template to employees
salaryStructureTemplateSchema.statics.applyToEmployees = async function(templateId, employeeIds, effectiveDate, appliedBy) {
  try {
    const template = await this.findById(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const SalaryStructure = mongoose.model("SalaryStructure");
    const results = {
      success: [],
      failed: []
    };

    for (const employeeId of employeeIds) {
      try {
        // Check if employee already has an active structure
        const existingStructure = await SalaryStructure.findOne({
          employee: employeeId,
          isActive: true
        });

        if (existingStructure) {
          // Deactivate existing structure
          existingStructure.isActive = false;
          await existingStructure.save();
        }

        // Create new salary structure from template
        const newStructure = new SalaryStructure({
          employee: employeeId,
          basicSalary: template.basicSalary,
          hra: template.hra,
          specialAllowance: template.specialAllowance,
          transportAllowance: template.transportAllowance,
          medicalAllowance: template.medicalAllowance,
          otherAllowances: template.otherAllowances,
          providentFund: template.providentFund,
          professionalTax: template.professionalTax,
          tds: template.tds,
          esi: template.esi,
          otherDeductions: template.otherDeductions,
          effectiveFrom: effectiveDate,
          notes: `Generated from template: ${template.name} v${template.version}`,
          createdBy: appliedBy,
          generatedFromTemplate: templateId,
          templateVersion: template.version
        });

        await newStructure.save();
        results.success.push(employeeId);
      } catch (error) {
        results.failed.push({
          employeeId,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error applying template to employees:", error);
    throw error;
  }
};

// Pre-save middleware to handle auto-calculations
salaryStructureTemplateSchema.pre("save", function(next) {
  // Apply percentage-based calculations if configured
  if (this.hraPercentage > 0) {
    this.hra = Math.round((this.basicSalary * this.hraPercentage) / 100);
  }
  
  if (this.pfPercentage > 0) {
    this.providentFund = Math.round((this.basicSalary * this.pfPercentage) / 100);
  }
  
  next();
});

const SalaryStructureTemplate = mongoose.model("SalaryStructureTemplate", salaryStructureTemplateSchema);

export default SalaryStructureTemplate;