import Department from '../models/departmentModel.js';

/**
 * Middleware to check if user belongs to specific departments
 * @param {...string} allowedDepartments - Department names to allow
 */
export const authorizeDepartments = (...allowedDepartments) => {
  return async (req, res, next) => {
    try {
      // Admin and superadmin always have access
      if (['admin', 'superadmin'].includes(req.user.role)) {
        return next();
      }

      // Check if user has a department assigned
      if (!req.user.department) {
        return res.status(403).json({
          message: 'Access denied. No department assigned to your account.',
        });
      }

      // Get the department details
      const department = await Department.findById(req.user.department);
      
      if (!department) {
        return res.status(403).json({
          message: 'Access denied. Department not found.',
        });
      }

      // Check if user's department is in the allowed list (case-insensitive)
      const userDepartmentName = department.name.toLowerCase();
      const isAllowed = allowedDepartments.some(
        dept => dept.toLowerCase() === userDepartmentName
      );

      if (!isAllowed) {
        return res.status(403).json({
          message: `Access denied. This feature is only available to ${allowedDepartments.join(', ')} departments.`,
        });
      }

      next();
    } catch (error) {
      
      return res.status(500).json({ message: 'Server error during authorization' });
    }
  };
};

/**
 * Combined middleware: Check both roles and departments
 * Admin/SuperAdmin always have access, others must be in allowed departments
 */
export const authorizeRolesOrDepartments = (allowedRoles = [], allowedDepartments = []) => {
  return async (req, res, next) => {
    try {
      

      // Check if user has an allowed role
      if (allowedRoles.includes(req.user.role)) {
        
        return next();
      }

      // If not an allowed role, check department
      if (!req.user.department) {
        
        return res.status(403).json({
          message: 'Access denied. Insufficient permissions.',
        });
      }

      // Get the department details
      const department = await Department.findById(req.user.department);
      
      if (!department) {
        
        return res.status(403).json({
          message: 'Access denied. Department not found.',
        });
      }

      

      // Check if user's department is in the allowed list (case-insensitive)
      const userDepartmentName = department.name.toLowerCase();
      const isAllowed = allowedDepartments.some(
        dept => dept.toLowerCase() === userDepartmentName
      );

      if (!isAllowed) {
        
        
        
        return res.status(403).json({
          message: 'Access denied. Insufficient permissions.',
        });
      }

      
      next();
    } catch (error) {
      
      return res.status(500).json({ message: 'Server error during authorization' });
    }
  };
};
