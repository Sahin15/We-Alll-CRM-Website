import mongoose from "mongoose";

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
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Work item must be assigned to someone"],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Status Management (Unified 4-stage workflow)
    status: {
      type: String,
      required: true,
      enum: ["To Do", "In Progress", "Review", "Done"],
      default: "To Do",
      index: true,
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
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Status History for audit trail
    statusHistory: [{
      status: {
        type: String,
        enum: ["To Do", "In Progress", "Review", "Done"],
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
        "custom"                 // Custom department workflow
      ],
      default: "standard",
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
workItemSchema.index({ status: 1, dueDate: 1 });
workItemSchema.index({ dueDate: 1 });
workItemSchema.index({ type: 1, status: 1 });
workItemSchema.index({ createdBy: 1 });
workItemSchema.index({ tags: 1 });

// Compound index for common queries
workItemSchema.index({ project: 1, assignedTo: 1, status: 1 });

// Virtual for checking if work item is overdue
workItemSchema.virtual("isOverdue").get(function () {
  if (!this.dueDate || this.status === "Done") {
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
  if (!this.dueDate || this.status === "Done") {
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

// Pre-save middleware to set completedAt when status changes to Done
workItemSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    // Set completedAt when status becomes "Done"
    if (this.status === "Done" && !this.completedAt) {
      this.completedAt = new Date();
    } 
    // Clear completedAt if status changes from "Done" to something else
    else if (this.status !== "Done" && this.completedAt) {
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

// Static method to get work items by user
workItemSchema.statics.getByUser = function (userId, filters = {}) {
  const query = { assignedTo: userId };
  
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
  
  return this.find(query)
    .populate("project", "name client")
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
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
    query.assignedTo = filters.assignedTo;
  }
  
  return this.find(query)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .sort({ status: 1, dueDate: 1 });
};

// Static method to search work items
workItemSchema.statics.search = function (userId, searchTerm, filters = {}) {
  const query = {
    assignedTo: userId,
    $or: [
      { title: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
      { tags: { $regex: searchTerm, $options: "i" } },
    ],
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
    .sort({ dueDate: 1 });
};

// Instance method to validate status transition
workItemSchema.methods.canTransitionTo = function (newStatus) {
  const validStatuses = ["To Do", "In Progress", "Review", "Done"];
  
  // Check if new status is valid
  if (!validStatuses.includes(newStatus)) {
    return { valid: false, message: `Invalid status: ${newStatus}` };
  }
  
  // All transitions are allowed (flexible workflow)
  // But we can add business rules here if needed
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

const WorkItem = mongoose.model("WorkItem", workItemSchema);

export default WorkItem;
