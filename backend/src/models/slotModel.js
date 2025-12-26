import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    // Project and Client References
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false, // Made optional to support projects without clients
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // Enhanced Slot Identity
    slotNumber: { 
      type: Number, 
      required: true, 
      min: 1,
      index: true
    },
    slotIdentifier: { 
      type: String, 
      required: true,
      index: true
    },
    slotType: { 
      type: String, 
      enum: ['work', 'milestone', 'deliverable', 'review', 'approval'], 
      default: 'work' 
    },

    // Universal Work Assignment Fields
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    workType: {
      type: String,
      required: true,
      enum: [
        // Digital Marketing
        "Social Media Post", "Campaign", "Ad Creative", "Content Writing",
        // Development
        "Feature Development", "Bug Fix", "Code Review", "Testing", "Deployment",
        // Design
        "Logo Design", "Banner Design", "Brochure Design", "UI/UX Design", "Illustration",
        // Video
        "Video Editing", "Animation", "Motion Graphics", "Filming", "Post Production",
        // General
        "Research", "Documentation", "Meeting", "Training", "Other"
      ],
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },

    // Enhanced Assignment and Status Management
    assignmentStatus: { 
      type: String, 
      enum: ['available', 'assigned', 'in-progress', 'completed', 'blocked', 'cancelled'], 
      default: 'available'
    },
    assignedWorkItem: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'WorkItem', 
      default: null
    },
    
    // Enhanced Completion Status
    completionStatus: {
      isCompleted: { 
        type: Boolean, 
        default: false
      },
      completedAt: Date,
      completedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      },
      approvedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      },
      approvedAt: Date,
      completionNotes: String,
      requiresApproval: {
        type: Boolean,
        default: false
      }
    },

    // Slot Configuration
    slotConfiguration: {
      isRequired: { 
        type: Boolean, 
        default: true 
      },
      canBeSkipped: { 
        type: Boolean, 
        default: false 
      },
      requiresApproval: { 
        type: Boolean, 
        default: false 
      },
      estimatedEffort: { 
        type: Number, 
        min: 0 
      }, // in hours
      dependencies: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Slot' 
      }],
      weight: {
        type: Number,
        default: 1.0,
        min: 0.1,
        max: 10.0
      }
    },

    // Enhanced Slot Metadata
    slotMetadata: {
      description: String,
      deliverables: [String],
      acceptanceCriteria: [String],
      notes: String,
      tags: [String],
      category: {
        type: String,
        enum: ['development', 'design', 'content', 'marketing', 'testing', 'documentation', 'other'],
        default: 'other'
      }
    },

    // Legacy Fields (Optional - for backward compatibility with existing digital marketing slots)
    postType: {
      type: String,
      enum: ["SMP", "Reel", "Story", "Carousel", "Video Post", "Text Post", "Poll"],
    },
    platforms: {
      type: [String],
      enum: ["Facebook", "Instagram", "LinkedIn", "Twitter", "YouTube", "Pinterest", "TikTok", "Other"],
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
      ],
    },
    occasion: {
      type: String,
      trim: true,
    },
    brief: {
      type: String,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
    },
    hashtags: {
      type: String,
      trim: true,
    },

    // Assignment and Deadlines
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
      required: function() {
        // Only required when creating new slots, not when updating
        return this.isNew;
      },
    },
    
    // Legacy deadline fields (for backward compatibility)
    designDeadline: {
      type: Date,
    },
    postingDate: {
      type: Date,
    },

    // Universal Status Tracking (Legacy - maintained for backward compatibility)
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Review", "Revision", "Approved", "Completed", "Cancelled"],
      default: "Pending",
    },
    
    // Legacy status fields (for backward compatibility)
    designStatus: {
      type: String,
      enum: ["Planned", "In Design", "Ready for Review", "Approved", "Revision Needed", "Needs Revision"],
    },
    postingStatus: {
      type: String,
      enum: ["Scheduled", "Posted", "Failed"],
    },
    
    // Approval Workflow
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    // Attachments and Files (Universal)
    attachments: [
      {
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
      },
    ],
    
    // Legacy field (for backward compatibility)
    creatives: [
      {
        type: {
          type: String,
          enum: ["image", "video", "document"],
        },
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    referenceLinks: {
      type: [String],
      default: [],
    },
    
    // Department-Specific Metadata (Flexible)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Comments and Feedback
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Performance Tracking
    actualPostingTime: {
      type: Date,
    },
    performanceMetrics: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
    },

    // Slot Assignment History
    assignmentHistory: [{
      workItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkItem'
      },
      assignedAt: {
        type: Date,
        default: Date.now
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      releasedAt: Date,
      releasedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      releaseReason: String,
      action: {
        type: String,
        enum: ['assigned', 'reassigned', 'released', 'completed'],
        required: true
      }
    }]
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Enhanced indexes for optimal query performance
slotSchema.index({ project: 1, slotNumber: 1 }, { unique: true }); // Ensure unique slot numbers per project
slotSchema.index({ project: 1, assignmentStatus: 1 });
slotSchema.index({ assignedWorkItem: 1 });
slotSchema.index({ assignmentStatus: 1, dueDate: 1 });
slotSchema.index({ 'completionStatus.isCompleted': 1 });
slotSchema.index({ slotType: 1, assignmentStatus: 1 });
slotSchema.index({ project: 1, 'completionStatus.isCompleted': 1 });

// Legacy indexes (maintained for backward compatibility)
slotSchema.index({ project: 1, postingDate: 1 });
slotSchema.index({ assignedTo: 1, designStatus: 1 });
slotSchema.index({ postingDate: 1 });
slotSchema.index({ designDeadline: 1 });

// Virtual for checking if slot is available for assignment
slotSchema.virtual("isAvailable").get(function () {
  return this.assignmentStatus === 'available' && !this.completionStatus?.isCompleted;
});

// Virtual for checking if slot is overdue
slotSchema.virtual("isOverdue").get(function () {
  if (this.completionStatus?.isCompleted || this.assignmentStatus === 'available') {
    return false;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (this.dueDate) {
    const dueDate = new Date(this.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  // Legacy overdue check
  const designDeadline = new Date(this.designDeadline);
  designDeadline.setHours(0, 0, 0, 0);

  const postingDate = new Date(this.postingDate);
  postingDate.setHours(0, 0, 0, 0);

  const designOverdue =
    designDeadline < today && this.designStatus !== "Approved" && this.postingStatus !== "Posted";

  const postingOverdue = postingDate < today && this.postingStatus !== "Posted";

  return designOverdue || postingOverdue;
});

// Virtual for progress contribution weight
slotSchema.virtual("progressWeight").get(function () {
  return this.slotConfiguration?.weight || 1.0;
});

// Pre-save middleware to sync assignment status with legacy status
slotSchema.pre('save', function(next) {
  // Sync new assignmentStatus with legacy status for backward compatibility
  if (this.isModified('assignmentStatus')) {
    switch (this.assignmentStatus) {
      case 'available':
        this.status = 'Pending';
        break;
      case 'assigned':
        this.status = 'Pending';
        break;
      case 'in-progress':
        this.status = 'In Progress';
        break;
      case 'completed':
        this.status = 'Completed';
        this.completionStatus.isCompleted = true;
        if (!this.completionStatus.completedAt) {
          this.completionStatus.completedAt = new Date();
        }
        break;
      case 'blocked':
        this.status = 'Review';
        break;
      case 'cancelled':
        this.status = 'Cancelled';
        break;
    }
  }

  // Auto-generate slot identifier if not provided
  if (!this.slotIdentifier && this.slotNumber) {
    this.slotIdentifier = `Slot ${this.slotNumber}`;
  }

  next();
});

// Pre-save middleware to track assignment history
slotSchema.pre('save', function(next) {
  if (this.isModified('assignedWorkItem') && !this.isNew) {
    const historyEntry = {
      workItem: this.assignedWorkItem,
      assignedBy: this.assignedBy,
      action: this.assignedWorkItem ? 'assigned' : 'released'
    };
    
    if (!this.assignedWorkItem) {
      historyEntry.releasedAt = new Date();
      historyEntry.releasedBy = this.assignedBy;
      historyEntry.releaseReason = 'Work item unassigned';
    }
    
    this.assignmentHistory.push(historyEntry);
  }
  next();
});

// Static method to get available slots for a project
slotSchema.statics.getAvailableSlots = function(projectId, filters = {}) {
  const query = {
    project: projectId,
    assignmentStatus: 'available',
    'completionStatus.isCompleted': { $ne: true },
    ...filters
  };
  
  return this.find(query)
    .sort({ slotNumber: 1 })
    .populate('project', 'name client')
    .lean();
};

// Static method to get slot statistics for a project
slotSchema.statics.getProjectSlotStats = function(projectId) {
  return this.aggregate([
    { $match: { project: new mongoose.Types.ObjectId(projectId) } },
    {
      $group: {
        _id: '$project',
        totalSlots: { $sum: 1 },
        availableSlots: {
          $sum: {
            $cond: [{ $eq: ['$assignmentStatus', 'available'] }, 1, 0]
          }
        },
        assignedSlots: {
          $sum: {
            $cond: [{ $eq: ['$assignmentStatus', 'assigned'] }, 1, 0]
          }
        },
        inProgressSlots: {
          $sum: {
            $cond: [{ $eq: ['$assignmentStatus', 'in-progress'] }, 1, 0]
          }
        },
        completedSlots: {
          $sum: {
            $cond: [{ $eq: ['$assignmentStatus', 'completed'] }, 1, 0]
          }
        },
        blockedSlots: {
          $sum: {
            $cond: [{ $eq: ['$assignmentStatus', 'blocked'] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// Instance method to assign slot to work item
slotSchema.methods.assignToWorkItem = function(workItemId, assignedBy) {
  if (this.assignmentStatus !== 'available') {
    throw new Error(`Slot ${this.slotIdentifier} is not available for assignment`);
  }
  
  this.assignmentStatus = 'assigned';
  this.assignedWorkItem = workItemId;
  this.assignedBy = assignedBy;
  this.assignedAt = new Date();
  
  return this.save();
};

// Instance method to complete slot
slotSchema.methods.completeSlot = function(completedBy, notes = '') {
  if (this.assignmentStatus !== 'assigned' && this.assignmentStatus !== 'in-progress') {
    throw new Error(`Slot ${this.slotIdentifier} cannot be completed in current status: ${this.assignmentStatus}`);
  }
  
  this.assignmentStatus = 'completed';
  this.completionStatus.isCompleted = true;
  this.completionStatus.completedAt = new Date();
  this.completionStatus.completedBy = completedBy;
  this.completionStatus.completionNotes = notes;
  
  // Add to assignment history
  this.assignmentHistory.push({
    workItem: this.assignedWorkItem,
    assignedBy: completedBy,
    action: 'completed'
  });
  
  return this.save();
};

// Instance method to release slot
slotSchema.methods.releaseSlot = function(releasedBy, reason = '') {
  if (this.assignmentStatus === 'completed') {
    throw new Error(`Slot ${this.slotIdentifier} is already completed and cannot be released`);
  }
  
  const previousWorkItem = this.assignedWorkItem;
  
  this.assignmentStatus = 'available';
  this.assignedWorkItem = null;
  this.assignedBy = null;
  
  // Add to assignment history
  this.assignmentHistory.push({
    workItem: previousWorkItem,
    releasedAt: new Date(),
    releasedBy: releasedBy,
    releaseReason: reason,
    action: 'released'
  });
  
  return this.save();
};

// Ensure virtuals are included in JSON
slotSchema.set("toJSON", { virtuals: true });
slotSchema.set("toObject", { virtuals: true });

const Slot = mongoose.model("Slot", slotSchema);

export default Slot;
