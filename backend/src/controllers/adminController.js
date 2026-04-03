import User from "../models/userModel.js";

// Get all users (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("department", "name")
      .select("-password +governmentIds.aadhaarNumber +governmentIds.panNumber +governmentIds.uanNumber +governmentIds.esicNumber +bankDetails.accountNumber +salary");
    res.status(200).json(users);
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Update user role (Admin only)
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Protect superadmin role from being changed
    if (user.role === "superadmin") {
      return res.status(403).json({ message: "Cannot modify superadmin role" });
    }

    // Prevent promoting users TO superadmin role
    if (role === "superadmin") {
      return res.status(403).json({ message: "Cannot promote users to superadmin role. Use create-superadmin script instead." });
    }

    user.role = role;
    await user.save();

    res.status(200).json({ message: "User role updated successfully", user });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user (Admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Protect superadmin from being deleted
    if (user.role === "superadmin") {
      return res.status(403).json({ message: "Cannot delete superadmin account" });
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};
