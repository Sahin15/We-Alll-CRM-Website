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
      required: true,
    },
    description: {
      type: String,
    },
    // Department assignment
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
      enum: ["Pending", "In Progress", "Completed", "On Hold", "Cancelled"],
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
    // Head of Project (HoP) - assigned by HoD
    projectHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
          enum: [
            "developer",
            "designer",
            "content-writer",
            "social-media-manager",
            "seo-specialist",
            "video-editor",
            "graphic-designer",
            "copywriter",
            "other",
          ],
          default: "other",
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
      },
    ],
    notes: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Add indexes for faster queries
projectSchema.index({ client: 1, status: 1 });
projectSchema.index({ department: 1, status: 1 });
projectSchema.index({ projectHead: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ assignedUsers: 1 });

const Project = mongoose.model("Project", projectSchema);
export default Project;






