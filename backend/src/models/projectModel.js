import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false,
    },
    description: {
      type: String,
    },
    // Multiple departments/services assignment
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    }],
    // Legacy single department field (kept for backward compatibility)
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    departmentAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    departmentAssignedAt: {
      type: Date,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "Active", "On Hold", "Cancelled", "Completed"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    budget: {
      type: Number,
      default: 0,
    },
    
    // Enhanced Slot Configuration
    slotConfiguration: {
      totalSlots: { 
        type: Number, 
        default: 10, 
        min: 1, 
        max: 1000,
        index: true
      },
      slotType: { 
        type: String, 
        enum: ['generic', 'milestone', 'deliverable', 'custom'], 
        default: 'generic' 
      },
      allowDynamicSlots: { 
        type: Boolean, 
        default: true 
      },
      slotNamingPattern: { 
        type: String, 
        default: 'Slot {number}' 
      },
      autoCreateSlots: { 
        type: Boolean, 
        default: true 
      },
      enableSlotSystem: {
        type: Boolean,
        default: false // For backward compatibility
      }
    },

    // Enhanced Progress Tracking
    progressTracking: {
      calculationMethod: { 
        type: String, 
        enum: ['slot-based', 'manual', 'hybrid'], 
        default: 'manual' // Default to manual for backward compatibility
      },
      completedSlots: { 
        type: Number, 
        default: 0,
      },
      totalSlots: { 
        type: Number, 
        default: 10 
      },
      progressPercentage: { 
        type: Number, 
        default: 0, 
        min: 0, 
        max: 100,
      },
      lastProgressUpdate: { 
        type: Date, 
        default: Date.now 
      },
      progressHistory: [{
        date: { 
          type: Date, 
          default: Date.now 
        },
        completedSlots: Number,
        totalSlots: Number,
        progressPercentage: Number,
        changedBy: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'User' 
        },
        changeReason: String,
        changeType: {
          type: String,
          enum: ['slot-completion', 'slot-assignment', 'manual-update', 'capacity-change'],
          default: 'manual-update'
        }
      }]
    },

    // Slot Management Configuration
    slotManagement: {
      allowSlotReassignment: { 
        type: Boolean, 
        default: true 
      },
      requireApprovalForSlotChanges: { 
        type: Boolean, 
        default: false 
      },
      slotCompletionRequiresApproval: { 
        type: Boolean, 
        default: false 
      },
      autoReleaseOnWorkItemDeletion: { 
        type: Boolean, 
        default: true 
      },
      notifyOnSlotCompletion: {
        type: Boolean,
        default: true
      }
    },
    
    // Head of Project (HoP) - optional, can be assigned later
    projectHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional
    },
    projectHeadAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    projectHeadAssignedAt: {
      type: Date,
    },
    milestones: [
      {
        title: { type: String, required: true },
        description: String,
        dueDate: Date,
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed", "delayed"],
          default: "pending",
        },
        completedAt: Date,
        owner: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        deliverableIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
          }
        ],
        notes: String,
      },
    ],
    tasks: [
      {
        title: { type: String, required: true },
        description: String,
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["todo", "in_progress", "review", "completed"],
          default: "todo",
        },
        priority: {
          type: String,
          enum: ["low", "medium", "high"],
          default: "medium",
        },
        dueDate: Date,
        completedAt: Date,
      },
    ],
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Team members with roles (assigned by HoP)
    teamMembers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          default: "other",
          trim: true,
        },
        // Department-specific specialization
        specialization: {
          type: String,
          enum: [
            // Social Media specializations
            "facebook-ads",
            "instagram-content",
            "linkedin-posts",
            "twitter-management",
            "youtube-videos",
            "tiktok-content",
            "pinterest-pins",
            
            // Development specializations
            "react-frontend",
            "node-backend",
            "mobile-app",
            "database-design",
            "api-development",
            
            // Design specializations
            "logo-design",
            "web-design",
            "print-design",
            "video-editing",
            "animation",
            
            // General
            "general",
          ],
          default: "general",
        },
        // Work capacity and availability
        workCapacity: {
          type: Number,
          default: 100, // Percentage of full capacity
          min: 0,
          max: 100,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    services: {
      type: [String],
      default: [],
    },
    deliverables: [
      {
        title: { type: String, required: true },
        description: String,
        fileUrl: String,
        deliveredAt: Date,
        status: {
          type: String,
          enum: ["pending", "delivered", "approved", "revision_needed"],
          default: "pending",
        },
        owner: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        priority: {
          type: String,
          enum: ["low", "medium", "high", "urgent"],
          default: "medium",
        },
        plannedDate: {
          type: Date,
        },
        progress: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        relatedExpectationIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProjectExpectation",
          }
        ],
        relatedCommitmentIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProjectCommitment",
          }
        ],
        workItemIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WorkItem",
          }
        ],
        evidenceDocumentIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BusinessDocument",
          }
        ],
        notes: {
          type: String,
          trim: true,
        },
        monthKey: {
          type: String,
        },
      },
    ],
    credentials: [
      {
        platform: { type: String, required: true },
        url: { type: String },
        username: { type: String, required: true },
        password: { type: String, required: true, select: false },
        notes: { type: String },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    notes: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
    },
    // Track who created the project
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Add indexes for faster queries
projectSchema.index({ client: 1, status: 1 });
projectSchema.index({ department: 1, status: 1 });
projectSchema.index({ departments: 1, status: 1 }); // New index for multiple departments
projectSchema.index({ projectHead: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ assignedUsers: 1 });

// Enhanced indexes for slot-based queries
projectSchema.index({ 'slotConfiguration.enableSlotSystem': 1 });
projectSchema.index({ 'progressTracking.calculationMethod': 1 });
projectSchema.index({ 'progressTracking.completedSlots': 1, 'progressTracking.totalSlots': 1 });
projectSchema.index({ 'progressTracking.progressPercentage': 1 });

// Virtual for slot-based progress calculation
projectSchema.virtual('slotProgress').get(function() {
  if (!this.slotConfiguration?.enableSlotSystem) {
    return null;
  }
  
  const completed = this.progressTracking?.completedSlots || 0;
  const total = this.progressTracking?.totalSlots || this.slotConfiguration?.totalSlots || 0;
  
  return {
    completedSlots: completed,
    totalSlots: total,
    availableSlots: Math.max(0, total - completed),
    progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    progressFraction: `${completed}/${total}`
  };
});

// Virtual for checking if project uses slot system
projectSchema.virtual('usesSlotSystem').get(function() {
  return this.slotConfiguration?.enableSlotSystem === true;
});

// Pre-save middleware to sync slot-based progress with legacy progress field
projectSchema.pre('save', function(next) {
  if (this.slotConfiguration?.enableSlotSystem && this.progressTracking?.calculationMethod === 'slot-based') {
    const completed = this.progressTracking.completedSlots || 0;
    const total = this.progressTracking.totalSlots || this.slotConfiguration.totalSlots || 0;
    
    if (total > 0) {
      const newProgress = Math.round((completed / total) * 100);
      
      // Update legacy progress field for backward compatibility
      if (this.progress !== newProgress) {
        this.progress = newProgress;
        this.progressTracking.progressPercentage = newProgress;
        this.progressTracking.lastProgressUpdate = new Date();
      }
    }
  }
  next();
});

// Static method to get projects with slot statistics
projectSchema.statics.getProjectsWithSlotStats = function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $lookup: {
        from: 'slots',
        localField: '_id',
        foreignField: 'project',
        as: 'slots'
      }
    },
    {
      $addFields: {
        slotStatistics: {
          totalSlots: { $size: '$slots' },
          assignedSlots: {
            $size: {
              $filter: {
                input: '$slots',
                cond: { $eq: ['$$this.assignmentStatus', 'assigned'] }
              }
            }
          },
          completedSlots: {
            $size: {
              $filter: {
                input: '$slots',
                cond: { $eq: ['$$this.assignmentStatus', 'completed'] }
              }
            }
          },
          availableSlots: {
            $size: {
              $filter: {
                input: '$slots',
                cond: { $eq: ['$$this.assignmentStatus', 'available'] }
              }
            }
          }
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Instance method to recalculate slot-based progress
projectSchema.methods.recalculateSlotProgress = async function() {
  if (!this.slotConfiguration?.enableSlotSystem) {
    return this;
  }
  
  const Slot = mongoose.model('Slot');
  const slots = await Slot.find({ project: this._id });
  
  const completedSlots = slots.filter(slot => 
    slot.assignmentStatus === 'completed' || 
    slot.completionStatus?.isCompleted === true
  ).length;
  
  const totalSlots = this.slotConfiguration.totalSlots || slots.length;
  const progressPercentage = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
  
  // Update progress tracking
  this.progressTracking.completedSlots = completedSlots;
  this.progressTracking.totalSlots = totalSlots;
  this.progressTracking.progressPercentage = progressPercentage;
  this.progressTracking.lastProgressUpdate = new Date();
  
  // Update legacy progress field
  this.progress = progressPercentage;
  
  // Add to progress history
  this.progressTracking.progressHistory.push({
    date: new Date(),
    completedSlots,
    totalSlots,
    progressPercentage,
    changeType: 'slot-completion',
    changeReason: 'Automatic recalculation based on slot completion'
  });
  
  return this.save();
};

// Post-save middleware to automatically create slots for new projects
projectSchema.post('save', async function(doc) {
  try {
    // Only create slots if:
    // 1. Slot system is enabled
    // 2. This is a new document (isNew flag)
    // 3. autoCreateSlots is true
    if (doc.slotConfiguration?.enableSlotSystem && 
        doc.slotConfiguration?.autoCreateSlots && 
        this.isNew) {
      
      // Import slot management service
      const slotManagementService = (await import('../services/slotManagementService.js')).default;
      
      try {
        // Create slots for current month
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        await slotManagementService.createMonthlySlotsForProject(
          doc._id,
          year,
          month,
          {
            count: doc.slotConfiguration.totalSlots || 20,
            createdBy: doc.projectHead || doc.createdBy
          }
        );
      } catch (slotError) {
        // Log error but don't fail project creation
      }
    }
  } catch (error) {
    // Silently fail - don't interrupt project creation
  }
});

// Ensure virtuals are included in JSON
projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

const Project = mongoose.model("Project", projectSchema);
export default Project;






