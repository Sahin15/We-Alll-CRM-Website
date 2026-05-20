export const PAID_LEAVE_TYPES = ['personal', 'medical', 'vacation', 'half_day'];

export const isFullTimeEmployee = (user) =>
  !user?.employmentType || user.employmentType === 'full-time';

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
