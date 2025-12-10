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
            // Development roles
            "developer",
            "frontend-developer",
            "backend-developer",
            "fullstack-developer",
            "qa-tester",
            
            // Design roles
            "designer",
            "ui-designer",
            "ux-designer",
            "graphic-designer",
            "video-editor",
            
            // Social Media Marketing roles
            "social-media-manager",
            "content-creator",
            "copywriter",
            "ads-specialist",
            "caption-writer",
            "photo-editor",
            "video-creator",
            "posting-manager",
            "community-manager",
            
            // Content roles
            "content-writer",
            "seo-specialist",
            "blog-writer",
            
            // Other roles
            "project-coordinator",
            "client-liaison",
            "other",
          ],
          default: "other",
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

const Project = mongoose.model("Project", projectSchema);
export default Project;






