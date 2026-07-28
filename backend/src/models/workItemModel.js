import mongoose from "mongoose";
import {
  ALL_WORK_ITEM_STATUSES,
  mapsToSlotComplete,
  mapsToSlotRelease,
} from "../utils/creativeStatusMap.js";

const workItemSchema = new mongoose.Schema(
  {
    // Core Fields (Required for all work items)
    type: {
      type: String,
      required: [true, "Work item type is required"],
      enum: ["task", "content"],
      lowercase: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    
    // Project and Assignment
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
      index: true,
    },
    // Support both single and multiple assignees
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function() {
        // assignedTo is only required if NOT in draft mode
        return this.visibility !== 'draft';
      },
      index: true,
    },
    assignedToMultiple: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    // Status Management (legacy 4-stage + creative workflow + Cancelled)
    status: {
      type: String,
      required: true,
      enum: ALL_WORK_ITEM_STATUSES,
      default: "To Do",
      index: true,
    },
    
    // Individual status tracking for each assignee (when multiple assignees)
    assigneeStatuses: [{
      assigneeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      status: {
        type: String,
        enum: ALL_WORK_ITEM_STATUSES,
        default: "To Do",
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Draft/Scheduled Status - Controls visibility to assigned team members
    visibility: {
      type: String,
      enum: ["draft", "scheduled", "active"],
      default: "active",
      index: true,
      description: "draft: Not visible to team members, scheduled: Visible only on due date, active: Visible immediately"
    },
    
    // Scheduled activation - when to make work visible to team members
    scheduledActivationDate: {
      type: Date,
      description: "Date when this work item becomes visible to assigned team members (only for scheduled items)"
    },
    
    // Track when work was activated
    activatedAt: {
      type: Date,
      description: "Timestamp when work item was activated from draft/scheduled"
    },
    
    // Priority
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      lowercase: true,
    },
    
    // Dates
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      index: true,
    },
    completedAt: {
      type: Date,
    },
    
    // Content-Specific Fields (Only for type='content')
    platform: {
      type: String,
      enum: ["Facebook", "Instagram", "LinkedIn", "Twitter", "YouTube", "Pinterest", "TikTok", "Other"],
      required: function() {
        return this.type === "content";
      },
    },
    postType: {
      type: String,
      enum: ["Post", "Story", "Reel", "Carousel", "Video", "Article", "Poll", "Other"],
      required: function() {
        return this.type === "content";
      },
    },
    contentBucket: {
      type: String,
      enum: [
        "Brand Promotion",
        "Festival Post",
        "Service Highlight",
        "Customer Testimonial",
        "Educational Content",
        "Behind the Scenes",
        "Engagement Post",
        "Promotional Offer",
        "Other"
      ],
    },
    
    // Optional Content Fields
    caption: {
      type: String,
      trim: true,
      maxlength: [1000, "Caption cannot exceed 1000 characters"],
    },
    hashtags: {
      type: String,
      trim: true,
    },
    
    // Enhanced Slot Assignment
    slotAssignment: {
      assignedSlot: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Slot', 
        default: null
      },
      slotNumber: { 
        type: Number
      }, // Denormalized for quick access
      slotIdentifier: String, // Denormalized for display
      assignedAt: Date,
      assignedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      },
      slotType: {
        type: String,
        enum: ['work', 'milestone', 'deliverable', 'review', 'approval']
      }
    },

    // Progress Contribution Configuration
    progressContribution: {
      contributesToProjectProgress: { 
        type: Boolean, 
        default: true 
      },
      progressWeight: { 
        type: Number, 
        default: 1.0, 
        min: 0, 
        max: 10 
      },
      completionImpact: { 
        type: String, 
        enum: ['slot-completion', 'partial-progress', 'milestone-trigger'], 
        default: 'slot-completion' 
      }
    },

    // Slot Integration Configuration
    slotIntegration: {
      autoCompleteSlotOnWorkItemCompletion: { 
        type: Boolean, 
        default: true 
      },
      requireSlotApprovalForCompletion: { 
        type: Boolean, 
        default: false 
      },
      releaseSlotOnDeletion: { 
        type: Boolean, 
        default: true 
      },
      notifyOnSlotCompletion: {
        type: Boolean,
        default: true
      }
    },
    
    // Tags for categorization
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    
    // Attachments
    attachments: [{
      name: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ["image", "video", "document", "code", "design", "other"],
        default: "other",
      },
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    }],
    
    // Comments
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      text: {
        type: String,
        required: true,
        trim: true,
      },
      mentions: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userName: String,
      }],
      isSystemComment: {
        type: Boolean,
        default: false,
        description: "True if this is an automatic system comment (e.g., status change)"
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Status History for audit trail
    statusHistory: [{
      status: {
        type: String,
        enum: ALL_WORK_ITEM_STATUSES,
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      changedAt: {
        type: Date,
        default: Date.now,
      },
      note: String,
    }],
    
    // Time Tracking (Optional)
    estimatedHours: {
      type: Number,
      min: 0,
    },
    actualHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    
    // Department-Specific Workflow
    workflowType: {
      type: String,
      enum: [
        "standard",                // Default 4-stage workflow
        "social-media",           // Basic Social Media workflow
        "social-media-advanced",  // Advanced Social Media workflow
        "development",            // Basic Development workflow
        "development-advanced",   // Advanced Development workflow
        "design",                // Basic Design workflow
        "design-advanced",       // Advanced Design workflow
        "video-production",      // Video Production workflow
        "content-writing",       // Content Writing workflow
        "posting",               // Posting department workflow
        "custom"                 // Custom department workflow
      ],
      default: "standard",
    },

    // Creative workflow mode (revision/review/posting handoff)
    workflowMode: {
      type: String,
      enum: ["standard", "creative"],
      default: "standard",
      index: true,
    },

    // Optional Posting department handoff (Graphic/Video Main Tasks)
    requiresPosting: {
      type: Boolean,
      default: false,
      index: true,
    },
    postingAssignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    postingDate: {
      type: Date,
      default: null,
      index: true,
    },
    postingStatus: {
      type: String,
      enum: ["not_required", "pending", "in_progress", "submitted", "done"],
      default: "not_required",
      index: true,
    },
    postUrls: [{
      type: String,
      trim: true,
    }],
    postingNotes: {
      type: String,
      trim: true,
      maxlength: [2000, "Posting notes cannot exceed 2000 characters"],
      default: "",
    },
    postingSubmittedAt: {
      type: Date,
      default: null,
    },
    postingSubmittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    
    // Advanced Workflow Stage Management
    currentStage: {
      type: String,
      default: null, // Will be set based on workflow type
    },
    
    stageHistory: [{
      stage: String,
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      startedAt: {
        type: Date,
        default: Date.now,
      },
      completedAt: Date,
      status: {
        type: String,
        enum: ["pending", "in-progress", "completed", "skipped"],
        default: "pending",
      },
      notes: String,
      timeSpent: {
        type: Number, // in minutes
        default: 0,
      },
    }],
    
    // Automated workflow progression
    autoProgressEnabled: {
      type: Boolean,
      default: true,
    },
    
    nextStage: {
      type: String,
      default: null,
    },
    
    // Role-based assignments for each stage
    stageAssignments: [{
      stage: String,
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      role: String, // The team member's role for this stage
      isRequired: {
        type: Boolean,
        default: true,
      },
      estimatedHours: {
        type: Number,
        default: 0,
      },
    }],
    
    // Department-Specific Fields (stored in metadata for flexibility)
    // Social Media: designStatus, postingStatus, approvalStatus
    // Development: codeReviewStatus, testingStatus, deploymentStatus
    // Design: revisionCount, designPhase, clientFeedback
    // Video: editingPhase, renderStatus, publishStatus
    departmentData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    
    // Metadata for extensibility
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    
    // Edit History - Track all changes made to work item
    editHistory: [{
      editedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      editorName: {
        type: String,
        default: null,
      },
      editorEmail: {
        type: String,
        default: null,
      },
      editedAt: {
        type: Date,
        default: Date.now,
      },
      changes: {
        type: Map,
        of: {
          oldValue: mongoose.Schema.Types.Mixed,
          newValue: mongoose.Schema.Types.Mixed,
        },
      },
      reason: {
        type: String,
        trim: true,
      },
      fieldsChanged: [String], // Array of field names that were changed
    }],
    
    // Track if work item has been edited (for visual indicator)
    isEdited: {
      type: Boolean,
      default: false,
    },
    lastEditedAt: {
      type: Date,
      default: null,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    
    // Soft Delete - Work items should never be permanently deleted
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletionReason: {
      type: String,
      trim: true,
    },
    
    // Cancellation
    cancellationReason: {
      type: String,
      trim: true,
      minlength: [25, "Cancellation reason must be at least 25 characters"],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for optimal query performance
workItemSchema.index({ project: 1, status: 1 });
workItemSchema.index({ assignedTo: 1, status: 1 });
workItemSchema.index({ assignedToMultiple: 1, status: 1 }); // Index for multiple assignees
workItemSchema.index({ status: 1, dueDate: 1 }); // Combined index covers single dueDate queries too
workItemSchema.index({ type: 1, status: 1 });
workItemSchema.index({ createdBy: 1 });
workItemSchema.index({ tags: 1 });

// Enhanced indexes for slot-based queries
workItemSchema.index({ 'slotAssignment.assignedSlot': 1 });
workItemSchema.index({ project: 1, 'slotAssignment.assignedSlot': 1 });
workItemSchema.index({ 'slotAssignment.slotNumber': 1 });
workItemSchema.index({ 'progressContribution.contributesToProjectProgress': 1 });
workItemSchema.index({ isDeleted: 1 }); // Index for soft delete queries

// Compound index for common queries
workItemSchema.index({ project: 1, assignedTo: 1, status: 1 });
workItemSchema.index({ project: 1, 'slotAssignment.assignedSlot': 1, status: 1 });
workItemSchema.index({ isDeleted: 1, project: 1, status: 1 }); // Compound index for active work items

// Virtual for checking if work item has assigned slot
workItemSchema.virtual("hasAssignedSlot").get(function () {
  return this.slotAssignment?.assignedSlot != null;
});

// Virtual to get all assignees (both single and multiple)
workItemSchema.virtual("allAssignees").get(function () {
  const assignees = [];
  
  // Add single assignee if present
  if (this.assignedTo) {
    assignees.push(this.assignedTo);
  }
  
  // Add multiple assignees if present
  if (this.assignedToMultiple && this.assignedToMultiple.length > 0) {
    assignees.push(...this.assignedToMultiple);
  }
  
  return assignees;
});

// Virtual to check if work item has multiple assignees
workItemSchema.virtual("hasMultipleAssignees").get(function () {
  return this.assignedToMultiple && this.assignedToMultiple.length > 0;
});

// Virtual for slot display information
workItemSchema.virtual("slotDisplayInfo").get(function () {
  if (!this.hasAssignedSlot) {
    return null;
  }
  
  return {
    slotNumber: this.slotAssignment.slotNumber,
    slotIdentifier: this.slotAssignment.slotIdentifier,
    slotType: this.slotAssignment.slotType,
    assignedAt: this.slotAssignment.assignedAt
  };
});

// Virtual for checking if work item is overdue
workItemSchema.virtual("isOverdue").get(function () {
  if (
    !this.dueDate ||
    mapsToSlotComplete(this.status) ||
    this.status === "Posted" ||
    this.status === "Closed" ||
    this.status === "Cancelled"
  ) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(this.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
});

// Virtual for checking if due today
workItemSchema.virtual("isDueToday").get(function () {
  if (
    !this.dueDate ||
    mapsToSlotComplete(this.status) ||
    this.status === "Posted" ||
    this.status === "Closed" ||
    this.status === "Cancelled"
  ) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(this.dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
});

// Virtual for days until due
workItemSchema.virtual("daysUntilDue").get(function () {
  if (!this.dueDate) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(this.dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware: completedAt + slot complete/release (legacy Done + creative Delivered/Cancelled)
workItemSchema.pre("save", async function (next) {
  if (this.isModified("status")) {
    // Set completedAt and complete slot when status maps to slot-complete (Done / Delivered)
    if (mapsToSlotComplete(this.status) && !this.completedAt) {
      this.completedAt = new Date();
      
      // Handle slot completion if work item has assigned slot
      if (this.hasAssignedSlot && this.slotIntegration?.autoCompleteSlotOnWorkItemCompletion) {
        try {
          const Slot = mongoose.model('Slot');
          const slot = await Slot.findById(this.slotAssignment.assignedSlot);
          
          if (slot && slot.assignmentStatus !== 'completed') {
            await slot.completeSlot(this.modifiedBy || this.createdBy, 'Completed via work item completion');
            
            // Update project progress if needed
            const Project = mongoose.model('Project');
            const project = await Project.findById(this.project);
            if (project && project.slotConfiguration?.enableSlotSystem) {
              await project.recalculateSlotProgress();
            }
          }
        } catch (error) {
          // Don't fail the work item save if slot completion fails
        }
      }
    }
    // After Delivered, optional posting handoff does not re-complete the slot
    else if (this.status === "Awaiting Posting" || this.status === "Posted" || this.status === "Closed") {
      // keep completedAt if already set; never release/complete slot again here
    }
    // Handle Cancelled status — release slot, clear completedAt
    else if (mapsToSlotRelease(this.status)) {
      // Clear completedAt if it was set
      this.completedAt = undefined;

      // Release slot if assigned
      if (this.hasAssignedSlot && this.slotIntegration?.releaseSlotOnDeletion) {
        try {
          const Slot = mongoose.model('Slot');
          const slot = await Slot.findById(this.slotAssignment.assignedSlot);
          if (slot) {
            await slot.releaseSlot(this.modifiedBy || this.createdBy, 'Work item cancelled');
          }
          // Clear slot assignment
          this.slotAssignment = {
            assignedSlot: null,
            slotNumber: null,
            slotIdentifier: null,
            slotType: null,
            assignedAt: null,
            assignedBy: null,
          };
        } catch (error) {
          // Don't fail the save if slot release fails
        }
      }
    }
    // Clear completedAt if leaving a completed path (not Cancelled / Posted / Closed / Awaiting Posting)
    else if (
      !mapsToSlotComplete(this.status) &&
      this.status !== "Awaiting Posting" &&
      this.status !== "Posted" &&
      this.status !== "Closed" &&
      this.completedAt
    ) {
      this.completedAt = undefined;
    }
    
    // Add to status history (only if not a new document)
    if (!this.isNew) {
      this.statusHistory.push({
        status: this.status,
        changedBy: this.modifiedBy || this.createdBy,
        changedAt: new Date(),
      });
    }
  }
  next();
});

// Validation: Content-specific fields required for content type
workItemSchema.pre("validate", function (next) {
  if (this.type === "content") {
    if (!this.platform) {
      this.invalidate("platform", "Platform is required for content work items");
    }
    if (!this.postType) {
      this.invalidate("postType", "Post type is required for content work items");
    }
  }
  next();
});

// Static method to get work items by user (supports both single and multiple assignees)
workItemSchema.statics.getByUser = function (userId, filters = {}) {
  const query = {
    $or: [
      { assignedTo: userId },
      { assignedToMultiple: userId }
    ]
  };
  
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.project) {
    query.project = filters.project;
  }
  if (filters.priority) {
    query.priority = filters.priority;
  }
  if (filters.dueDate) {
    query.dueDate = { $lte: new Date(filters.dueDate) };
  }
  if (filters.hasSlot !== undefined) {
    if (filters.hasSlot) {
      query['slotAssignment.assignedSlot'] = { $ne: null };
    } else {
      query['slotAssignment.assignedSlot'] = null;
    }
  }
  
  return this.find(query)
    .populate("project", "name client")
    .populate("assignedTo", "name email")
    .populate("assignedToMultiple", "name email")
    .populate("createdBy", "name email")
    .populate("slotAssignment.assignedSlot", "slotNumber slotIdentifier slotType assignmentStatus")
    .sort({ dueDate: 1, createdAt: -1 });
};

// Static method to get work items by project
workItemSchema.statics.getByProject = function (projectId, filters = {}) {
  const query = { project: projectId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.assignedTo) {
    // Support filtering by assignee in both single and multiple assignee fields
    query.$or = [
      { assignedTo: filters.assignedTo },
      { assignedToMultiple: filters.assignedTo }
    ];
  }
  if (filters.slotNumber) {
    query['slotAssignment.slotNumber'] = filters.slotNumber;
  }
  if (filters.hasSlot !== undefined) {
    if (filters.hasSlot) {
      query['slotAssignment.assignedSlot'] = { $ne: null };
    } else {
      query['slotAssignment.assignedSlot'] = null;
    }
  }
  
  return this.find(query)
    .populate("assignedTo", "name email")
    .populate("assignedToMultiple", "name email")
    .populate("createdBy", "name email")
    .populate("slotAssignment.assignedSlot", "slotNumber slotIdentifier slotType assignmentStatus")
    .sort({ 'slotAssignment.slotNumber': 1, status: 1, dueDate: 1 });
};

// Static method to get work items with slot information
workItemSchema.statics.getWithSlotInfo = function (filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $lookup: {
        from: 'slots',
        localField: 'slotAssignment.assignedSlot',
        foreignField: '_id',
        as: 'slotInfo'
      }
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'projectInfo'
      }
    },
    {
      $addFields: {
        slotDetails: { $arrayElemAt: ['$slotInfo', 0] },
        projectDetails: { $arrayElemAt: ['$projectInfo', 0] }
      }
    },
    {
      $project: {
        slotInfo: 0,
        projectInfo: 0
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to search work items
workItemSchema.statics.search = function (userId, searchTerm, filters = {}) {
  const query = {
    $and: [
      {
        $or: [
          { assignedTo: userId },
          { assignedToMultiple: userId }
        ]
      },
      {
        $or: [
          { title: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
          { tags: { $regex: searchTerm, $options: "i" } },
        ]
      }
    ]
  };
  
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.project) {
    query.project = filters.project;
  }
  
  return this.find(query)
    .populate("project", "name")
    .populate("assignedTo", "name email")
    .populate("assignedToMultiple", "name email")
    .sort({ dueDate: 1 });
};

// Instance method to assign work item to slot
workItemSchema.methods.assignToSlot = async function(slotId, assignedBy) {
  const Slot = mongoose.model('Slot');
  const slot = await Slot.findById(slotId);
  
  if (!slot) {
    throw new Error('Slot not found');
  }
  
  if (slot.project.toString() !== this.project.toString()) {
    throw new Error('Slot does not belong to the same project as work item');
  }
  
  if (!slot.isAvailable) {
    throw new Error(`Slot ${slot.slotIdentifier} is not available for assignment`);
  }
  
  // Release current slot if assigned
  if (this.slotAssignment?.assignedSlot) {
    await this.releaseSlot(assignedBy, 'Reassigning to different slot');
  }
  
  // Assign to new slot
  await slot.assignToWorkItem(this._id, assignedBy);
  
  // Update work item slot assignment
  this.slotAssignment = {
    assignedSlot: slot._id,
    slotNumber: slot.slotNumber,
    slotIdentifier: slot.slotIdentifier,
    slotType: slot.slotType,
    assignedAt: new Date(),
    assignedBy: assignedBy
  };
  
  return this.save();
};

// Instance method to release work item from slot
workItemSchema.methods.releaseSlot = async function(releasedBy, reason = '') {
  if (!this.slotAssignment?.assignedSlot) {
    return this; // No slot assigned, nothing to release
  }
  
  const Slot = mongoose.model('Slot');
  const slot = await Slot.findById(this.slotAssignment.assignedSlot);
  
  if (slot) {
    await slot.releaseSlot(releasedBy, reason);
  }
  
  // Clear slot assignment
  this.slotAssignment = {
    assignedSlot: null,
    slotNumber: null,
    slotIdentifier: null,
    slotType: null,
    assignedAt: null,
    assignedBy: null
  };
  
  return this.save();
};

// Instance method to validate status transition
workItemSchema.methods.canTransitionTo = function (newStatus) {
  if (!ALL_WORK_ITEM_STATUSES.includes(newStatus)) {
    return { valid: false, message: `Invalid status: "${newStatus}"` };
  }

  // Cancelled is terminal — cannot transition out
  if (this.status === "Cancelled" && newStatus !== "Cancelled") {
    return {
      valid: false,
      message: "A cancelled work item cannot be reactivated. Please create a new work item instead.",
    };
  }

  return { valid: true };
};

// Instance method to update status with validation
workItemSchema.methods.updateStatus = function (newStatus, changedBy) {
  const transition = this.canTransitionTo(newStatus);
  
  if (!transition.valid) {
    throw new Error(transition.message);
  }
  
  this.status = newStatus;
  this.modifiedBy = changedBy;
  
  return this.save();
};

// Instance method for soft delete
workItemSchema.methods.softDelete = function (deletedBy, reason = '') {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.deletionReason = reason;
  
  // Release slot if assigned
  if (this.slotAssignment?.assignedSlot && this.slotIntegration?.releaseSlotOnDeletion) {
    this.releaseSlot(deletedBy, 'Work item deleted');
  }
  
  return this.save();
};

// Instance method to restore soft deleted work item
workItemSchema.methods.restore = function (restoredBy) {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.deletionReason = null;
  this.modifiedBy = restoredBy;
  
  return this.save();
};

// Static method to find only active (non-deleted) work items
workItemSchema.statics.findActive = function (query = {}) {
  return this.find({ ...query, isDeleted: { $ne: true } });
};

// Static method to find deleted work items
workItemSchema.statics.findDeleted = function (query = {}) {
  return this.find({ ...query, isDeleted: true });
};

const WorkItem = mongoose.model("WorkItem", workItemSchema);

export default WorkItem;
