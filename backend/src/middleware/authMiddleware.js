import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { attachDirectPermissionGrants } from "../authz/attachDirectGrants.js";
import { isSystemAccessBlocked } from "../utils/employeeQueryUtils.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }
    
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    // Lean auth user — sensitive profile fields are loaded only on GET /users/me
    const user = await User.findById(decode.id).select(
      "_id name email role status isActive department isHeadOfDepartment headOfDepartment headOfProjects"
    );
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (isSystemAccessBlocked(user)) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact HR.",
      });
    }

    // Set both _id and id for compatibility
    req.user = user;
    req.user.id = user._id.toString();

    await attachDirectPermissionGrants(req, res, next);
  } catch (error) {
    // Only log actual errors, not routine auth failures
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token" });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    }
    
    res.status(401).json({ message: "Not authorized" });
  }
};

// Authorize middleware - check user role
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};

// Alias for backward compatibility
export const authorize = authorizeRoles;

