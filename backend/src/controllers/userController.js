import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Department from "../models/departmentModel.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import logger from '../utils/logger.js';
import { buildTextSearch } from '../utils/queryOptimizer.js';

//generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Register new user
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      department,
      position,
      // Basic Information fields
      dateOfBirth,
      gender,
      bloodGroup,
      fatherName,
      motherName,
      maritalStatus,
      nationality,
      status,
      employmentType,
      joiningDate,
    } = req.body;

    logger.info("Registration attempt:", { name, email, role });

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with all basic information fields
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "employee",
      phone,
      department,
      position,
      // Basic Information
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      bloodGroup: bloodGroup || undefined,
      fatherName: fatherName || undefined,
      motherName: motherName || undefined,
      maritalStatus: maritalStatus || undefined,
      nationality: nationality || "Indian",
      status: status || "active",
      employmentType: employmentType && employmentType.trim() ? employmentType.trim() : "full-time",
      joiningDate: joiningDate || undefined,
    });

    logger.success("User created successfully:", user._id);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        position: user.position,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        fatherName: user.fatherName,
        motherName: user.motherName,
        maritalStatus: user.maritalStatus,
        nationality: user.nationality,
        status: user.status,
      },
    });
  } catch (error) {
    logger.error("Error in registerUser:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Get all users (optimized but backward compatible)
export const getUsers = async (req, res) => {
  try {
    const { search, role, department, status, limit = 100, skip = 0 } = req.query;
    
    let query = {};
    
    // Search filter
    if (search) {
      Object.assign(query, buildTextSearch(search, ['name', 'email', 'phone']));
    }
    
    // Role filter
    if (role) query.role = role;
    
    // Department filter - handle both department name and ID
    if (department) {
      // Check if department is a valid MongoDB ObjectId
      if (department.match(/^[0-9a-fA-F]{24}$/)) {
        query.department = department;
      } else {
        // If it's a string name, look up the department ID
        try {
          const dept = await Department.findOne({ name: department });
          if (dept) {
            query.department = dept._id;
          } else {
            // Department not found, return empty array
            return res.status(200).json([]);
          }
        } catch (deptError) {
          logger.error("Error looking up department:", deptError);
          return res.status(200).json([]);
        }
      }
    }
    
    // Status filter — also exclude isActive:false users when filtering for active
    if (status) {
      query.status = status;
      if (status === 'active') {
        query.isActive = { $ne: false };
      }
    }
    
    logger.info('getUsers query:', query);
    
    // Optimized query with pagination and all necessary fields for display
    const users = await User.find(query)
      .select('_id name email role department profilePicture designation status isActive employeeId joiningDate hireDate phone reactivationDate')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();
    
    logger.success(`Found ${users.length} users`);
    
    // Return simple array (backward compatible)
    res.status(200).json(users);
  } catch (error) {
    logger.error("Error in getUsers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info("Login attempt for email:", email);

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("User not found for email:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    logger.info("User found:", user.email);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn("Password mismatch for user:", user.email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    logger.success("Login successful for user:", user.email);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture || null,
        isHeadOfDepartment: user.isHeadOfDepartment || false,
        headOfDepartment: user.headOfDepartment || null,
        headOfProjects: user.headOfProjects || [],
        department: user.department || null,
      },
      token,
    });
  } catch (error) {
    logger.error("Error in loginUser:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user profile by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password +governmentIds.aadhaarNumber +governmentIds.panNumber +governmentIds.uanNumber +governmentIds.esicNumber +bankDetails.accountNumber +salary")
      .populate("department", "name")
      .populate("manager", "name email")
      .populate("reportingManager", "name email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    logger.info("Fetched user with internship details:", user.internshipDetails);

    res.status(200).json(user);
  } catch (error) {
    logger.error("Error in getUserById:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware
    const { 
      name, phone, alternatePhone, dateOfBirth, gender, bloodGroup, maritalStatus,
      fatherName, motherName, nationality,
      currentAddress, permanentAddress,
      emergencyContact,
      governmentIds,
      bankDetails,
      // Legacy fields
      address, position
    } = req.body;



    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update basic information
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (alternatePhone !== undefined) user.alternatePhone = alternatePhone;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (bloodGroup) user.bloodGroup = bloodGroup;
    if (maritalStatus !== undefined) user.maritalStatus = maritalStatus;
    if (fatherName !== undefined) user.fatherName = fatherName;
    if (motherName !== undefined) user.motherName = motherName;
    if (nationality !== undefined) user.nationality = nationality;
    
    // Update addresses
    if (currentAddress) user.currentAddress = currentAddress;
    if (permanentAddress) {
      if (typeof permanentAddress === 'string') {
        // Handle simple string permanent address
        user.permanentAddressSimple = permanentAddress;
      } else {
        // Handle structured permanent address
        user.permanentAddress = permanentAddress;
      }
    }
    
    // Update emergency contact
    if (emergencyContact) user.emergencyContact = emergencyContact;
    
    // Update government IDs (employees can update their own)
    if (governmentIds) {
      user.governmentIds = {
        ...user.governmentIds,
        ...governmentIds
      };
    }
    
    // Update bank details with restrictions
    if (bankDetails) {
      const isHROrAdmin = ['hr', 'admin', 'superadmin'].includes(req.user.role);
      const hasEmployeeUpdated = user.bankDetails?.updatedByEmployee;
      
      // Check if employee can update bank details
      if (!isHROrAdmin && hasEmployeeUpdated) {
        return res.status(403).json({ 
          message: 'Bank details can only be updated once by employee. Contact HR/Admin for further changes.',
          canUpdate: false
        });
      }
      
      // Update bank details
      user.bankDetails = {
        ...user.bankDetails,
        ...bankDetails,
        updatedByEmployee: !isHROrAdmin ? true : user.bankDetails?.updatedByEmployee,
        lastUpdatedBy: req.user._id,
        lastUpdatedAt: new Date()
      };
    }
    
    // Legacy fields (backward compatibility)
    if (address) user.address = address;
    if (position) user.position = position;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        currentAddress: user.currentAddress,
        permanentAddress: user.permanentAddress,
        permanentAddressSimple: user.permanentAddressSimple,
        emergencyContact: user.emergencyContact,
        governmentIds: user.governmentIds,
        bankDetails: user.bankDetails,
        // Legacy field for backward compatibility
        address: user.address,
      },
    });
  } catch (error) {
    logger.error("Error in updateUserProfile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update any user (Admin/SuperAdmin only)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    logger.info("Updating user:", id);
    logger.info("Update data received:", updateData);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // IMPORTANT: Block status/isActive changes through this endpoint.
    // Status must be changed via PUT /users/:id/status to ensure
    // proper lifecycle management (project removal, audit trail, etc.)
    delete updateData.status;
    delete updateData.isActive;
    delete updateData.statusChangedAt;
    delete updateData.statusChangedBy;
    delete updateData.reactivationDate;

    // Track old department for sync
    const oldDepartmentId = user.department ? user.department.toString() : null;
    const newDepartmentId = updateData.department ? updateData.department.toString() : null;
    const departmentChanged = oldDepartmentId !== newDepartmentId;

    // Remove password from updateData if empty
    if (!updateData.password) {
      delete updateData.password;
    } else {
      // Hash password if provided
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Track employment type change for full-time leave accrual
    const previousEmploymentType = user.employmentType || "full-time";
    const newEmploymentType = updateData.employmentType;

    if (newEmploymentType !== undefined) {
      if (typeof newEmploymentType === "string" && newEmploymentType.trim() === "") {
        updateData.employmentType = "full-time";
      }

      const resolvedType = updateData.employmentType ?? newEmploymentType;

      if (resolvedType === "full-time" && previousEmploymentType !== "full-time") {
        updateData.fullTimeStartDate = new Date();
        if (user.internshipDetails) {
          user.internshipDetails.isActive = false;
        }
      }

      if (resolvedType !== "intern" && user.internshipDetails) {
        user.internshipDetails.isActive = false;
      }
    }

    // Handle internship details specifically
    if (updateData.internshipDetails) {
      logger.info("Processing internship details:", updateData.internshipDetails);
      
      // Validate internship details
      const internshipDetails = updateData.internshipDetails;
      if (internshipDetails.startDate) {
        internshipDetails.startDate = new Date(internshipDetails.startDate);
      }
      if (internshipDetails.endDate) {
        internshipDetails.endDate = new Date(internshipDetails.endDate);
      }
      if (internshipDetails.stipend) {
        internshipDetails.stipend = Number(internshipDetails.stipend);
      }
      
      user.internshipDetails = {
        ...user.internshipDetails,
        ...internshipDetails
      };
      delete updateData.internshipDetails; // Remove from generic update to avoid conflicts
    }

    // Update user with all provided fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        user[key] = updateData[key];
      }
    });

    await user.save();

    // Sync department employees arrays if department changed
    if (departmentChanged) {
      const Department = (await import('../models/departmentModel.js')).default;
      
      // Remove user from old department's employees array
      if (oldDepartmentId) {
        await Department.findByIdAndUpdate(
          oldDepartmentId,
          { $pull: { employees: user._id } }
        );
        logger.info(`Removed user from old department: ${oldDepartmentId}`);
      }
      
      // Add user to new department's employees array
      if (newDepartmentId) {
        await Department.findByIdAndUpdate(
          newDepartmentId,
          { $addToSet: { employees: user._id } }
        );
        logger.info(`Added user to new department: ${newDepartmentId}`);
      }
    }

    logger.success("User updated successfully:", user._id);
    logger.info("Updated user internship details:", user.internshipDetails);

    // Populate the user data for response
    const updatedUser = await User.findById(id)
      .select("-password")
      .populate("department", "name");

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    logger.error("Error in updateUser:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Update user status (Admin only)
// Update employee status with lifecycle management
export const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reactivationDate, adminOverride } = req.body;

    // Validate status value
    const validStatuses = ["active", "inactive", "terminated", "offboarded"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldStatus = user.status;

    // Validate state transitions
    const blockedTransitions = [
      { from: "terminated", to: ["active", "inactive"] },
      { from: "offboarded", to: ["active", "inactive"] },
    ];

    for (const rule of blockedTransitions) {
      if (rule.from === oldStatus && rule.to.includes(status) && !adminOverride) {
        return res.status(400).json({
          message: `Cannot transition from ${oldStatus} to ${status} without adminOverride flag`,
        });
      }
    }

    // Validate reactivationDate
    if (reactivationDate) {
      if (status !== "inactive") {
        return res.status(400).json({
          message: "Reactivation date is only valid when setting status to inactive",
        });
      }
      const reactivationDateObj = new Date(reactivationDate);
      if (reactivationDateObj <= new Date()) {
        return res.status(400).json({
          message: "Reactivation date must be in the future",
        });
      }
      user.reactivationDate = reactivationDateObj;
    } else {
      // No reactivation date provided — always clear it
      // This prevents stale dates from a previous inactive period triggering auto-reactivation
      user.reactivationDate = null;
    }

    // Remove from projects if transitioning to terminated/offboarded
    let projectsAffected = 0;
    if (status === "terminated" || status === "offboarded") {
      const { removeEmployeeFromAllProjects } = await import(
        "../services/projectRemovalService.js"
      );
      projectsAffected = await removeEmployeeFromAllProjects(id);
    }

    // Update status and audit fields
    user.status = status;
    user.statusChangedAt = new Date();
    user.statusChangedBy = req.user._id;
    // Always clear reactivationDate unless explicitly setting to inactive with a date
    if (status !== "inactive") {
      user.reactivationDate = null;
    }

    logger.info(`Saving user ${user._id} with new status: ${status} (was: ${oldStatus})`);
    await user.save();
    
    // Verify the save actually persisted by re-reading from DB
    const savedUser = await User.findById(id).select('status statusChangedAt');
    logger.info(`Verified saved status for ${user._id}: ${savedUser?.status}`);
    
    if (savedUser?.status !== status) {
      logger.error(`Status save FAILED for ${user._id}: expected ${status}, got ${savedUser?.status}`);
      return res.status(500).json({ message: "Status update failed to persist. Please try again." });
    }

    res.status(200).json({
      message: "Employee status updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        status: user.status,
        statusChangedAt: user.statusChangedAt,
        statusChangedBy: user.statusChangedBy,
      },
      projectsAffected,
    });
  } catch (error) {
    logger.error("Error in updateEmployeeStatus:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Legacy function kept for backward compatibility
export const updateUserStatus = updateEmployeeStatus;

// Request password reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Return success even if user not found (security best practice)
      return res.status(200).json({
        message: "If the email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before saving to database
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token and expiry (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour

    await user.save();

    // In production, send email with reset link
    // For now, return token in response (development only)
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/users/reset-password/${resetToken}`;

    res.status(200).json({
      message: "Password reset token generated",
      resetToken, // Remove in production
      resetUrl, // Remove in production
    });
  } catch (error) {
    logger.error("Error in requestPasswordReset:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Hash the token from URL
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    logger.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Change password (authenticated user)
export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();
    logger.info("Password changed successfully for user:", user.email);

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("Error in changePassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Generate next employee ID sequence
export const getNextEmployeeIdSequence = async (req, res) => {
  try {
    const { joiningDate, employmentType } = req.body;

    // Validate input
    if (!joiningDate) {
      return res.status(400).json({ message: "Joining date is required" });
    }

    if (employmentType !== 'full-time') {
      return res.status(400).json({ 
        message: "Only permanent (full-time) employees can be assigned an employee ID" 
      });
    }

    // Get all employees with employee IDs, sorted by sequence number
    const employeesWithIds = await User.find({
      employeeId: { $exists: true, $ne: null }
    }).exec();

    // Extract sequence numbers from existing employee IDs
    // Format: WA-YY-XXXX
    let maxSequence = 1; // Start from 1, will be incremented to 2

    employeesWithIds.forEach(emp => {
      if (emp.employeeId) {
        const parts = emp.employeeId.split('-');
        if (parts.length === 3) {
          const sequence = parseInt(parts[2], 10);
          if (!isNaN(sequence) && sequence > maxSequence) {
            maxSequence = sequence;
          }
        }
      }
    });

    // Next sequence number
    const nextSequence = maxSequence + 1;

    // Generate employee ID
    const year = new Date(joiningDate).getFullYear().toString().slice(-2);
    const sequenceStr = String(nextSequence).padStart(4, '0');
    const employeeId = `WA-${year}-${sequenceStr}`;

    logger.info("Generated employee ID:", { employeeId, nextSequence });

    res.status(200).json({
      employeeId,
      sequence: nextSequence,
      message: "Employee ID generated successfully"
    });
  } catch (error) {
    logger.error("Error in getNextEmployeeIdSequence:", error);
    res.status(500).json({ message: "Server error" });
  }
};
