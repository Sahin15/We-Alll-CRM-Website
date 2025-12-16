import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    // Project and Client References
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
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

    // Universal Status Tracking
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

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for better query performance
slotSchema.index({ project: 1, postingDate: 1 });
slotSchema.index({ assignedTo: 1, designStatus: 1 });
slotSchema.index({ postingDate: 1 });
slotSchema.index({ designDeadline: 1 });

// Virtual for checking if slot is overdue
slotSchema.virtual("isOverdue").get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const designDeadline = new Date(this.designDeadline);
  designDeadline.setHours(0, 0, 0, 0);

  const postingDate = new Date(this.postingDate);
  postingDate.setHours(0, 0, 0, 0);

  const designOverdue =
    designDeadline < today && this.designStatus !== "Approved" && this.postingStatus !== "Posted";

  const postingOverdue = postingDate < today && this.postingStatus !== "Posted";

  return designOverdue || postingOverdue;
});

// Ensure virtuals are included in JSON
slotSchema.set("toJSON", { virtuals: true });
slotSchema.set("toObject", { virtuals: true });

// Add indexes for faster queries (CRITICAL for performance)
slotSchema.index({ project: 1, dueDate: 1 });
slotSchema.index({ assignedTo: 1, status: 1 });
slotSchema.index({ status: 1, dueDate: 1 }); // Combined index covers single dueDate queries too
slotSchema.index({ project: 1, status: 1 });
slotSchema.index({ createdBy: 1 });

const Slot = mongoose.model("Slot", slotSchema);

export default Slot;
