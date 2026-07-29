import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const approvalWorkflowSchema = new mongoose.Schema({
  workflowId: {
    type: String,
    required: true,
    unique: true,
    default: () => `WF-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  type: {
    type: String,
    enum: ["salary_approval", "bulk_approval", "individual_review"],
    required: true
  },
  
  salarySlips: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "SalarySlip",
    required: true
  }],
  
  stages: [{
    stage: {
      type: String,
      enum: ["hr_review", "finance_approval", "management_signoff"],
      required: true
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "skipped"],
      default: "pending"
    },
    approvedAt: {
      type: Date
    },
    comments: {
      type: String,
      default: ""
    },
    order: {
      type: Number,
      required: true
    },
    deadline: {
      type: Date
    }
  }],
  
  currentStage: {
    type: Number,
    default: 0
  },
  overallStatus: {
    type: String,
    enum: ["pending", "in_progress", "approved", "rejected", "completed"],
    default: "pending"
  },
  
  // Bulk operations
  bulkCriteria: {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department"
    },
    salaryRange: {
      min: Number,
      max: Number
    },
    employeeCount: Number,
    autoApprove: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadata
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  completedAt: {
    type: Date
  },
  
  // Audit trail
  auditTrail: [{
    action: {
      type: String,
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    comments: String
  }],
  
  // Notifications
  notifications: [{
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["approval_required", "approved", "rejected", "completed"],
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }]
}, {
  timestamps: true
});

// Indexes (workflowId unique index comes from field `unique: true` — do not redeclare)
approvalWorkflowSchema.index({ type: 1, overallStatus: 1 });
approvalWorkflowSchema.index({ "stages.approver": 1, "stages.status": 1 });
approvalWorkflowSchema.index({ initiatedBy: 1 });
approvalWorkflowSchema.index({ createdAt: 1 });

// Virtual for current stage info
approvalWorkflowSchema.virtual("currentStageInfo").get(function() {
  if (this.currentStage < this.stages.length) {
    return this.stages[this.currentStage];
  }
  return null;
});

// Virtual for progress percentage
approvalWorkflowSchema.virtual("progressPercentage").get(function() {
  const completedStages = this.stages.filter(stage => stage.status === "approved").length;
  return Math.round((completedStages / this.stages.length) * 100);
});

// Ensure virtuals are included in JSON output
approvalWorkflowSchema.set('toJSON', { virtuals: true });
approvalWorkflowSchema.set('toObject', { virtuals: true });

// Static method to create standard workflow
approvalWorkflowSchema.statics.createStandardWorkflow = async function(salarySlipIds, initiatedBy, type = "salary_approval") {
  try {
    // Get default approvers based on roles
    const User = mongoose.model("User");
    
    const hrApprover = await User.findOne({ role: "hr", status: "active" });
    const financeApprover = await User.findOne({ role: "accounts", status: "active" });
    const managementApprover = await User.findOne({ role: "admin", status: "active" });

    if (!hrApprover || !financeApprover || !managementApprover) {
      throw new Error("Required approvers not found");
    }

    // Set deadlines (2 days for each stage)
    const now = new Date();
    const hrDeadline = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const financeDeadline = new Date(hrDeadline.getTime() + 2 * 24 * 60 * 60 * 1000);
    const managementDeadline = new Date(financeDeadline.getTime() + 2 * 24 * 60 * 60 * 1000);

    const workflow = new this({
      type,
      salarySlips: salarySlipIds,
      stages: [
        {
          stage: "hr_review",
          approver: hrApprover._id,
          order: 0,
          deadline: hrDeadline
        },
        {
          stage: "finance_approval",
          approver: financeApprover._id,
          order: 1,
          deadline: financeDeadline
        },
        {
          stage: "management_signoff",
          approver: managementApprover._id,
          order: 2,
          deadline: managementDeadline
        }
      ],
      initiatedBy,
      overallStatus: "in_progress"
    });

    // Add initial audit entry
    workflow.auditTrail.push({
      action: "workflow_initiated",
      performedBy: initiatedBy,
      details: {
        salarySlipCount: salarySlipIds.length,
        type
      }
    });

    await workflow.save();
    return workflow;
  } catch (error) {
    
    throw error;
  }
};

// Static method to create bulk workflow
approvalWorkflowSchema.statics.createBulkWorkflow = async function(salarySlipIds, criteria, initiatedBy) {
  try {
    const workflow = await this.createStandardWorkflow(salarySlipIds, initiatedBy, "bulk_approval");
    
    workflow.bulkCriteria = criteria;
    
    // Add bulk-specific audit entry
    workflow.auditTrail.push({
      action: "bulk_workflow_created",
      performedBy: initiatedBy,
      details: {
        criteria,
        salarySlipCount: salarySlipIds.length
      }
    });

    await workflow.save();
    return workflow;
  } catch (error) {
    
    throw error;
  }
};

// Instance method to process approval
approvalWorkflowSchema.methods.processApproval = async function(approverId, action, comments = "") {
  try {
    const currentStage = this.stages[this.currentStage];
    
    if (!currentStage) {
      throw new Error("No current stage to approve");
    }

    if (currentStage.approver.toString() !== approverId.toString()) {
      throw new Error("Unauthorized to approve this stage");
    }

    if (currentStage.status !== "pending") {
      throw new Error("Stage already processed");
    }

    // Update current stage
    currentStage.status = action;
    currentStage.approvedAt = new Date();
    currentStage.comments = comments;

    // Add audit entry
    this.auditTrail.push({
      action: `stage_${action}`,
      performedBy: approverId,
      details: {
        stage: currentStage.stage,
        order: currentStage.order
      },
      comments
    });

    if (action === "approved") {
      // Move to next stage
      this.currentStage += 1;
      
      if (this.currentStage >= this.stages.length) {
        // All stages completed
        this.overallStatus = "completed";
        this.completedAt = new Date();
        
        // Update salary slips status
        const SalarySlip = mongoose.model("SalarySlip");
        await SalarySlip.updateMany(
          { _id: { $in: this.salarySlips } },
          { 
            status: "approved",
            approvedAt: new Date(),
            approvalWorkflowId: this._id
          }
        );

        this.auditTrail.push({
          action: "workflow_completed",
          performedBy: approverId,
          details: {
            salarySlipCount: this.salarySlips.length
          }
        });
      }
    } else if (action === "rejected") {
      // Workflow rejected
      this.overallStatus = "rejected";
      this.completedAt = new Date();
      
      // Update salary slips status
      const SalarySlip = mongoose.model("SalarySlip");
      await SalarySlip.updateMany(
        { _id: { $in: this.salarySlips } },
        { 
          status: "rejected",
          rejectedAt: new Date(),
          rejectionReason: comments,
          approvalWorkflowId: this._id
        }
      );

      this.auditTrail.push({
        action: "workflow_rejected",
        performedBy: approverId,
        details: {
          rejectionStage: currentStage.stage,
          reason: comments
        }
      });
    }

    await this.save();
    return this;
  } catch (error) {
    
    throw error;
  }
};

// Instance method to bulk approve (skip remaining stages)
approvalWorkflowSchema.methods.bulkApprove = async function(approverId, comments = "Bulk approved") {
  try {
    // Mark all pending stages as approved
    for (let i = this.currentStage; i < this.stages.length; i++) {
      const stage = this.stages[i];
      if (stage.status === "pending") {
        stage.status = "approved";
        stage.approvedAt = new Date();
        stage.comments = comments;
      }
    }

    this.currentStage = this.stages.length;
    this.overallStatus = "completed";
    this.completedAt = new Date();

    // Update salary slips
    const SalarySlip = mongoose.model("SalarySlip");
    await SalarySlip.updateMany(
      { _id: { $in: this.salarySlips } },
      { 
        status: "approved",
        approvedAt: new Date(),
        approvalWorkflowId: this._id
      }
    );

    // Add audit entry
    this.auditTrail.push({
      action: "bulk_approved",
      performedBy: approverId,
      details: {
        salarySlipCount: this.salarySlips.length
      },
      comments
    });

    await this.save();
    return this;
  } catch (error) {
    
    throw error;
  }
};

// Static method to get pending approvals for user
approvalWorkflowSchema.statics.getPendingApprovals = async function(userId) {
  try {
    const workflows = await this.find({
      "stages.approver": userId,
      "stages.status": "pending",
      overallStatus: "in_progress"
    })
    .populate("salarySlips", "employee month year netSalary")
    .populate("initiatedBy", "name email")
    .populate("stages.approver", "name email")
    .sort({ createdAt: -1 });

    // Filter to only show workflows where user is the current approver
    return workflows.filter(workflow => {
      const currentStage = workflow.currentStageInfo;
      return currentStage && currentStage.approver.toString() === userId.toString();
    });
  } catch (error) {
    
    throw error;
  }
};

const ApprovalWorkflow = mongoose.model("ApprovalWorkflow", approvalWorkflowSchema);

export default ApprovalWorkflow;