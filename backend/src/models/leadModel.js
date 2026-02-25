import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    // Multiple contact details
    contacts: [
      {
        name: {
          type: String,
          trim: true,
        },
        type: {
          type: String,
          enum: ["Phone", "Email"],
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
        label: {
          type: String,
          enum: ["Primary", "Office", "Personal", "Other"],
          default: "Primary",
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // Legacy fields for backward compatibility
    phone: {
      type: Number,
      required: false,
    },
    email: {
      type: String,
      lowercase: true,
      sparse: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    service: [{
      type: String,
      trim: true,
    }],
    customService: {
      type: String,
      trim: true,
    },
    budget: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
      default: "Website",
    },
    reference: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "New",
        "Contacted",
        "Qualified",
        "Proposal Sent",
        "Negotiation",
        "Won",
        "Lost",
      ],
      default: "New",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      trim: true,
    },
    notesHistory: [
      {
        note: {
          type: String,
          required: true,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    temperature: {
      type: String,
      enum: ["Cold", "Warm", "Hot"],
      default: null,
    },
    // Enhanced Follow-ups
    followUps: [
      {
        followUpType: {
          type: String,
          enum: ["Call", "Email", "Meeting", "Reminder"],
          required: true,
        },
        scheduledDate: {
          type: Date,
          required: true,
        },
        scheduledTime: {
          type: String, // HH:MM format
        },
        notes: {
          type: String,
        },
        status: {
          type: String,
          enum: ["Pending", "Completed", "Missed"],
          default: "Pending",
        },
        completedAt: {
          type: Date,
        },
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Lead Meetings
    meetings: [
      {
        title: {
          type: String,
          required: true,
        },
        scheduledDate: {
          type: Date,
          required: true,
        },
        scheduledTime: {
          type: String,
          required: true,
        },
        duration: {
          type: Number, // in minutes
          default: 30,
        },
        meetingType: {
          type: String,
          enum: ["Online", "Offline"],
          required: true,
        },
        meetingLink: {
          type: String, // For online meetings
        },
        location: {
          type: String, // For offline meetings
        },
        notes: {
          type: String,
        },
        status: {
          type: String,
          enum: ["Scheduled", "Completed", "Cancelled", "Missed"],
          default: "Scheduled",
        },
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        completedAt: {
          type: Date,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Lead History/Activity Timeline
    history: [
      {
        actionType: {
          type: String,
          enum: [
            "Created",
            "Status Changed",
            "Follow-up Created",
            "Follow-up Completed",
            "Meeting Scheduled",
            "Meeting Completed",
            "Note Added",
            "Contact Added",
            "Contact Updated",
            "Contact Deleted",
            "Assigned",
            "Updated",
          ],
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        oldValue: {
          type: String,
        },
        newValue: {
          type: String,
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastFollowUpDate: {
      type: Date,
    },
    nextFollowUpDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    
    // Email Tracking Fields
    emailStats: {
      totalEmailsSent: {
        type: Number,
        default: 0
      },
      lastEmailSentAt: {
        type: Date
      },
      lastEmailTemplate: {
        type: String
      },
      emailStatus: {
        type: String,
        enum: ['never-sent', 'sent', 'failed', 'bounced'],
        default: 'never-sent'
      }
    },
  },
  { timestamps: true }
);

// Method to add history entry
leadSchema.methods.addHistory = function(actionType, description, performedBy, oldValue = null, newValue = null) {
  this.history.push({
    actionType,
    description,
    oldValue,
    newValue,
    performedBy,
    timestamp: new Date(),
  });
};

// Indexes for faster queries
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ 'contacts.value': 1 });
leadSchema.index({ 'followUps.scheduledDate': 1 });
leadSchema.index({ 'meetings.scheduledDate': 1 });

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
