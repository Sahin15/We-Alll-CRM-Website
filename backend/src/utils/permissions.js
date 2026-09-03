/**
 * Centralized permission utilities
 * Reduces code duplication and improves maintainability
 */

/**
 * Check if user can view all projects (role-only fallback; prefer resourceVisibilityService with full user).
 * @param {string} userRole
 * @returns {boolean}
 */
export const canViewAllProjects = (userRole) => {
  return ['admin', 'superadmin', 'hr', 'manager'].includes(userRole);
};

/**
 * Check if user can manage a project
 */
export const canManageProject = (user, project) => {
  // Admin, SuperAdmin, HR can manage all projects
  if (['admin', 'superadmin', 'hr'].includes(user.role)) {
    return true;
  }
  
  // Project Head can manage their project
  if (project.projectHead?.toString() === user._id.toString()) {
    return true;
  }
  
  // HoD can manage projects in their department
  if (user.role === 'hod' && project.department?.head?.toString() === user._id.toString()) {
    return true;
  }
  
  return false;
};

/**
 * Check if user is part of project team
 */
export const isProjectTeamMember = (userId, project) => {
  return project.teamMembers?.some(
    member => member.user?.toString() === userId.toString()
  ) || project.assignedUsers?.some(
    user => user.toString() === userId.toString() || user._id?.toString() === userId.toString()
  );
};

/**
 * Check if user can create work assignments
 */
export const canCreateWorkAssignment = (user, project, assignedTo) => {
  // Admin/SuperAdmin can create for anyone
  if (['admin', 'superadmin'].includes(user.role)) {
    return true;
  }
  
  // HoD can create for anyone in their department's projects
  if (user.role === 'hod') {
    // Check if this project belongs to HoD's department
    if (project.department?.toString() === user.headOfDepartment?.toString() ||
        project.department?._id?.toString() === user.headOfDepartment?.toString()) {
      return true;
    }
  }
  
  // Project Head can create for anyone in project
  if (project.projectHead?.toString() === user._id.toString()) {
    return true;
  }
  
  // Team members can only create for themselves
  if (isProjectTeamMember(user._id, project)) {
    return !assignedTo || assignedTo === user._id.toString();
  }
  
  return false;
};

/**
 * Check if user can approve work
 */
export const canApproveWork = (userRole) => {
  return ['admin', 'superadmin', 'hod'].includes(userRole);
};

/**
 * Check if user can view clients
 */
export const canViewClients = (userRole) => {
  return ['admin', 'superadmin', 'hr', 'hod', 'manager'].includes(userRole);
};

/**
 * Check if user can manage clients
 */
export const canManageClients = (userRole) => {
  return ['admin', 'superadmin', 'hr'].includes(userRole);
};

/**
 * Check if user is an employee (includes HoD)
 * HoDs are also employees and should have employee privileges
 */
export const isEmployee = (userRole) => {
  return ['employee', 'hod'].includes(userRole);
};

/**
 * Check if user can clock in/out
 * HR staff are also employees and should be able to clock in/out
 */
export const canClockInOut = (userRole) => {
  return ['employee', 'hod', 'hr'].includes(userRole);
};
