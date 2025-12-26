import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
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
    const { name, email, password, role, phone, department, position } =
      req.body;

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

    // Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "employee",
      phone,
      department,
      position,
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
    const { search, role, department, status } = req.query;
    
    let query = {};
    
    // Search filter
    if (search) {
      Object.assign(query, buildTextSearch(search, ['name', 'email', 'phone']));
    }
    
    // Role filter
    if (role) query.role = role;
    
    // Department filter
    if (department) query.department = department;
    
    // Status filter
    if (status) query.status = status;
    
    logger.info('getUsers query:', query);
    
    // Optimized query WITHOUT pagination (backward compatible)
    const users = await User.find(query)
      .select('name email role department phone status designation profilePicture employeeId joiningDate hireDate')
      .populate('department', 'name')
      .populate('manager', 'name email')
      .sort({ createdAt: -1 })
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
        name: user.name,
        email: user.email,
        role: user.role,
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
      .populate("manager", "name email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove password from updateData if empty
    if (!updateData.password) {
      delete updateData.password;
    } else {
      // Hash password if provided
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Update user with all provided fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        user[key] = updateData[key];
      }
    });

    await user.save();

    logger.success("User updated successfully:", user._id);

    res.status(200).json({
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        position: user.position,
        address: user.address,
      },
    });
  } catch (error) {
    logger.error("Error in updateUser:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// Update user status (Admin only)
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User status updated successfully",
      user,
    });
  } catch (error) {
    logger.error("Error in updateUserStatus:", error);
    res.status(500).json({ message: "Server error" });
  }
};

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
