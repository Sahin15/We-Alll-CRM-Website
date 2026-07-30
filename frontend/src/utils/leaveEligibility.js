export const PAID_LEAVE_TYPES = ['medical', 'casual'];
export const NON_FULL_TIME_EMPLOYMENT_TYPES = ['part-time', 'intern', 'freelancer', 'contract'];

export const normalizeEmploymentType = (type) => {
  if (!type || typeof type !== 'string') return null;
  return type.trim().toLowerCase();
};

export const isFullTimeEmployee = (user) => {
  const type = normalizeEmploymentType(user?.employmentType);

  if (type && NON_FULL_TIME_EMPLOYMENT_TYPES.includes(type)) {
    return false;
  }

  return type === 'full-time' || !type;
};

/** HR leave balance row — use API flag first, then employment type */
export const isPaidLeaveEligibleRow = (summary) => {
  const empType = normalizeEmploymentType(
    summary?.employee?.employmentType ?? summary?.employmentType
  );

  if (empType && NON_FULL_TIME_EMPLOYMENT_TYPES.includes(empType)) {
    return false;
  }

  if (typeof summary?.eligibleForPaidLeave === 'boolean') {
    return summary.eligibleForPaidLeave;
  }

  return empType === 'full-time' || !empType;
};

export const getAllowedLeaveTypes = (user, balance = null) => {
  if (balance?.canApplyLeaveTypes?.length) {
    return balance.canApplyLeaveTypes;
  }
  return isFullTimeEmployee(user)
    ? [...PAID_LEAVE_TYPES, 'unpaid']
    : ['unpaid'];
};

export const canApplyPaidLeave = (user, balance = null) => {
  if (balance?.eligibleForPaidLeave !== undefined) {
    return balance.eligibleForPaidLeave;
  }
  return isFullTimeEmployee(user);
};

export const formatEmploymentType = (type) => {
  if (!type) return 'employee';
  return type.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};
