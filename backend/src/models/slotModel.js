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

    // Post Details
    postType: {
      type: String,
      enum: ["SMP", "Reel", "Story", "Carousel", "Video Post", "Text Post", "Poll"],
      required: true,
    },
    platforms: {
      type: [String],
      enum: ["Facebook", "Instagram", "LinkedIn", "Twitter", "YouTube", "Pinterest"],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one platform is required",
      },
    },

    // Content Details
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
      required: true,
    },
    occasion: {
      type: String,
      trim: true,
    },
    brief: {
      type: String,
      required: true,
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
    designDeadline: {
      type: Date,
      required: true,
    },
    postingDate: {
      type: Date,
      required: true,
    },

    // Status Tracking
    designStatus: {
      type: String,
      enum: ["Planned", "In Design", "Ready for Review", "Approved", "Revision Needed"],
      default: "Planned",
    },
    postingStatus: {
      type: String,
      enum: ["Scheduled", "Posted", "Failed"],
      default: "Scheduled",
    },

    // Creatives and References
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

const Slot = mongoose.model("Slot", slotSchema);

export default Slot;
