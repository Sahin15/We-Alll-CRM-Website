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
      console.error('Department authorization error:', error);
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
      console.log('🔐 Authorization check:', {
        userRole: req.user.role,
        userDepartment: req.user.department,
        allowedRoles,
        allowedDepartments
      });

      // Check if user has an allowed role
      if (allowedRoles.includes(req.user.role)) {
        console.log('✅ Access granted by role:', req.user.role);
        return next();
      }

      // If not an allowed role, check department
      if (!req.user.department) {
        console.log('❌ Access denied: No department assigned');
        return res.status(403).json({
          message: 'Access denied. Insufficient permissions.',
        });
      }

      // Get the department details
      const department = await Department.findById(req.user.department);
      
      if (!department) {
        console.log('❌ Access denied: Department not found');
        return res.status(403).json({
          message: 'Access denied. Department not found.',
        });
      }

      console.log('📊 User department:', department.name);

      // Check if user's department is in the allowed list (case-insensitive)
      const userDepartmentName = department.name.toLowerCase();
      const isAllowed = allowedDepartments.some(
        dept => dept.toLowerCase() === userDepartmentName
      );

      if (!isAllowed) {
        console.log('❌ Access denied: Department not in allowed list');
        console.log('   User dept:', userDepartmentName);
        console.log('   Allowed:', allowedDepartments);
        return res.status(403).json({
          message: 'Access denied. Insufficient permissions.',
        });
      }

      console.log('✅ Access granted by department:', department.name);
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ message: 'Server error during authorization' });
    }
  };
};
