import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Not required for anonymous feedback
    },
    category: {
      type: String,
      enum: [
        "bug_report",
        "feature_request", 
        "system_issue",
        "ui_ux_feedback",
        "performance_issue",
        "general_complaint",
        "suggestion",
        "compliment",
        "other"
      ],
      required: [true, "Category is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"]
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"]
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    status: {
      type: String,
      enum: ["open", "in_review", "in_progress", "resolved", "closed", "rejected"],
      default: "open"
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: [1000, "Admin response cannot exceed 1000 characters"]
    },
    responseDate: {
      type: Date,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    attachments: [
      {
        filename: String,
        url: String,
        uploadDate: {
          type: Date,
          default: Date.now
        }
      }
    ],
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    isAnonymous: {
      type: Boolean,
      default: false
    },
    upvotes: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }],
      default: []
    },
    relatedFeedback: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Feedback"
      }
    ],
    resolution: {
      type: String,
      trim: true,
      maxlength: [1000, "Resolution cannot exceed 1000 characters"]
    },
    estimatedResolutionDate: {
      type: Date,
    },
    actualResolutionDate: {
      type: Date,
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
feedbackSchema.index({ employee: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, priority: -1, createdAt: -1 });
feedbackSchema.index({ category: 1, createdAt: -1 });
feedbackSchema.index({ assignedTo: 1, status: 1 });

// Virtual for upvote count
feedbackSchema.virtual('upvoteCount').get(function() {
  return this.upvotes ? this.upvotes.length : 0;
});

// Method to check if user has upvoted
feedbackSchema.methods.hasUserUpvoted = function(userId) {
  if (!this.upvotes || !userId) return false;
  return this.upvotes.some(upvoteId => upvoteId.toString() === userId.toString());
};

// Static method to get feedback statistics
feedbackSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
        inReview: { $sum: { $cond: [{ $eq: ["$status", "in_review"] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        highPriority: { $sum: { $cond: [{ $in: ["$priority", ["high", "urgent"]] }, 1, 0] } },
        avgResponseTime: { 
          $avg: { 
            $cond: [
              { $ne: ["$responseDate", null] },
              { $subtract: ["$responseDate", "$createdAt"] },
              null
            ]
          }
        }
      }
    }
  ]);

  const categoryStats = await this.aggregate([
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  return {
    overview: stats[0] || {
      total: 0, open: 0, inReview: 0, inProgress: 0, 
      resolved: 0, closed: 0, rejected: 0, highPriority: 0, avgResponseTime: 0
    },
    byCategory: categoryStats
  };
};

// Static method to get trending feedback (most upvoted recent feedback)
feedbackSchema.statics.getTrending = async function(limit = 10) {
  return this.find({
    status: { $in: ["open", "in_review", "in_progress"] },
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  })
  .populate('employee', 'name email')
  .sort({ upvoteCount: -1, createdAt: -1 })
  .limit(limit);
};

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;