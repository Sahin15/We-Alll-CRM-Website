import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "leave_approved",
        "leave_rejected",
        "leave_applied",
        "task_completed",
        "task_assigned",
        "attendance_marked",
        "meeting_scheduled",
        "document_uploaded",
        "profile_updated",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId, // ID of related document (task, leave, etc.)
    },
    relatedModel: {
      type: String, // Model name (Task, Leave, etc.)
    },
    icon: {
      type: String, // Icon class or name
    },
    color: {
      type: String, // Color for the activity
      default: "primary",
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
activitySchema.index({ user: 1, createdAt: -1 });

// Auto-delete activities older than 30 days
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
