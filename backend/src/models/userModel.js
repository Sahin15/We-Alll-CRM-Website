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
      enum: ["Team Member", "Contributor", "Team Player", "Rockstar", "Rising Star", "Go-Getter"],
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
      enum: ["active", "inactive", "suspended"],
      default: "active",
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

const User = mongoose.model("User", userSchema);

export default User;
