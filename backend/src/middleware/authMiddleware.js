import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  try {
    console.log(`[PROTECT] ${req.method} ${req.path} - Checking authentication`);
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.log('[PROTECT] No token found');
      return res.status(401).json({ message: "No token, authorization denied" });
    }
    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decode.id).select("-password");
    
    if (!user) {
      console.log('[PROTECT] User not found');
      return res.status(401).json({ message: "User not found" });
    }
    
    console.log(`[PROTECT] User authenticated: ${user.email}, role: ${user.role}`);
    
    // Set both _id and id for compatibility
    req.user = user;
    req.user.id = user._id.toString();
    
    next();
  } catch (error) {
    console.error("Error in protect middleware:", error.message);
    res.status(401).json({ message: "Not authorized" });
  }
};

// Authorize middleware - check user role
export const authorize = (...roles) => {
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

