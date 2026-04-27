import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: [
        "superadmin",
        "admin",
        "hr",
        "accounts",
        "sales",
        "manager",
        "client",
        "employee",
        "hod",
      ],
      default: "employee",
    },
    // Basic Information
    phone: {
      type: String,
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    personalEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed"],
    },
    fatherName: {
      type: String,
      trim: true,
    },
    motherName: {
      type: String,
      trim: true,
    },
    nationality: {
      type: String,
      default: "Indian",
      trim: true,
    },
    profilePicture: {
      type: String, // URL or S3 key reference
    },
    
    // Job Details
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    funBadge: {
      type: String,
      enum: [
        "Team Member", 
        "Contributor", 
        "Team Player", 
        "Rockstar", 
        "Rising Star", 
        "Go-Getter",
        "Problem Solver",
        "Creative Thinker",
        "Innovation Champion",
        "Mentor",
        "Tech Guru",
        "Communication Expert",
        "Leadership Potential",
        "Quality Champion"
      ],
      default: function() {
        // Randomly assign a fun badge for employees
        if (this.role === 'employee') {
          const badges = ["Team Member", "Contributor", "Team Player", "Rockstar", "Rising Star", "Go-Getter"];
          return badges[Math.floor(Math.random() * badges.length)];
        }
        return "Team Member";
      }
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    // Head of Department tracking
    isHeadOfDepartment: {
      type: Boolean,
      default: false,
    },
    headOfDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    // Head of Project tracking
    headOfProjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    // Projects where user is a team member
    assignedProjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    joiningDate: {
      type: Date,
    },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "intern", "freelancer", "contract"],
      default: "full-time",
    },
    
    // Internship Details (only applicable when employmentType is 'intern')
    internshipDetails: {
      duration: {
        type: String,
        enum: ["3-months", "6-months"],
      },
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
      stipend: {
        type: Number,
      },
      mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      department: {
        type: String, // Can be different from main department for cross-functional internships
      },
      objectives: {
        type: String, // Learning objectives for the internship
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    // Address Details
    currentAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String, default: "India" },
    },
    permanentAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String, default: "India" },
    },
    
    // Emergency Contact
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relationship: { type: String },
      address: { type: String },
    },
    
    // Government ID Details
    governmentIds: {
      aadhaarNumber: { 
        type: String,
        select: false, // Hidden for privacy
      },
      panNumber: { 
        type: String,
        select: false,
      },
      uanNumber: { 
        type: String,
        select: false,
      },
      esicNumber: { 
        type: String,
        select: false,
      },
    },
    
    // Banking Details
    bankDetails: {
      accountNumber: { 
        type: String,
        select: false, // Hidden for privacy
      },
      accountHolderName: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
      branchName: { type: String },
      upiId: { type: String },
      updatedByEmployee: { 
        type: Boolean, 
        default: false 
      }, // Track if employee has updated bank details once
      lastUpdatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      }, // Track who last updated
      lastUpdatedAt: { 
        type: Date 
      }
    },
    
    // Document Uploads
    documents: {
      aadhaarDoc: { type: String }, // S3 URL
      panDoc: { type: String },
      resume: { type: String },
      offerLetter: { type: String },
      agreement: { type: String },
      salarySlips: [{
        month: String,
        year: Number,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
      }],
      experienceCertificates: [{ type: String }],
      other: [{ 
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
    },
    
    // Salary (kept for backward compatibility)
    salary: {
      type: Number,
      select: false,
    },
    
    // Status and Notes
    status: {
      type: String,
      enum: ["active", "inactive", "terminated", "offboarded"],
      default: "active",
    },
    // Lifecycle audit fields
    reactivationDate: {
      type: Date,
      default: null,
    },
    statusChangedAt: {
      type: Date,
      default: null,
    },
    statusChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
    },
    
    // Legacy fields (kept for backward compatibility)
    position: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String },
    },
    // Simple address fields for frontend compatibility  
    permanentAddressSimple: {
      type: String,
      trim: true,
    },
    hireDate: {
      type: Date,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    
    // FCM Token for push notifications
    fcmToken: {
      type: String,
      select: false, // Hidden by default for security
    },
    
    // Notification preferences
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      categories: {
        leaves: { type: Boolean, default: true },
        salary: { type: Boolean, default: true },
        meetings: { type: Boolean, default: true },
        announcements: { type: Boolean, default: true },
        projects: { type: Boolean, default: true }
      }
    },

    // Notification sound settings (individual per user)
    notificationSoundSettings: {
      sound: {
        type: String,
        enum: [
          'bell_chime',
          'digital_ping',
          'soft_chime',
          'ascending_tones',
          'melodic_alert',
          'bright_ding',
          'subtle_beep',
          'chirp',
          'ding_dong',
          'sparkle',
          'gentle_bell',
          'notification_pop',
          'three_notes',
          'xylophone',
          'soft_alert',
          'saranai',
          'temple_bell',
          'wind_chime',
          'crystal_tone',
          'harmony',
          'forest_bird',
          'ocean_wave',
          'morning_dew',
          'cosmic_ping',
          'zen_bell',
          'shehnai'
        ],
        default: 'bell_chime'
      },
      volume: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.3
      },
      preferences: {
        leaves: { type: Boolean, default: true },
        tasks: { type: Boolean, default: true },
        meetings: { type: Boolean, default: true },
        attendance: { type: Boolean, default: true },
        projects: { type: Boolean, default: true },
        announcements: { type: Boolean, default: true },
        salary: { type: Boolean, default: true },
        expenses: { type: Boolean, default: true },
        documents: { type: Boolean, default: true },
        performance: { type: Boolean, default: true }
      }
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Middleware to prevent superadmin deletion
userSchema.pre('findOneAndDelete', async function(next) {
  const docToDelete = await this.model.findOne(this.getFilter());
  if (docToDelete && docToDelete.role === 'superadmin') {
    throw new Error('Cannot delete superadmin account');
  }
  next();
});

userSchema.pre('deleteOne', async function(next) {
  const docToDelete = await this.model.findOne(this.getFilter());
  if (docToDelete && docToDelete.role === 'superadmin') {
    throw new Error('Cannot delete superadmin account');
  }
  next();
});

userSchema.pre('remove', function(next) {
  if (this.role === 'superadmin') {
    throw new Error('Cannot delete superadmin account');
  }
  next();
});

// Middleware to prevent superadmin role modification
userSchema.pre('save', function(next) {
  if (this.isModified('role') && !this.isNew) {
    // Get the original document
    this.constructor.findById(this._id).then(original => {
      if (original && original.role === 'superadmin' && this.role !== 'superadmin') {
        throw new Error('Cannot modify superadmin role');
      }
      next();
    }).catch(next);
  } else {
    next();
  }
});

// Add indexes for faster queries (email index is already created by unique: true)
userSchema.index({ role: 1, department: 1 });
userSchema.index({ status: 1, reactivationDate: 1 });
userSchema.index({ department: 1 });
userSchema.index({ isHeadOfDepartment: 1 });

const User = mongoose.model("User", userSchema);

export default User;
