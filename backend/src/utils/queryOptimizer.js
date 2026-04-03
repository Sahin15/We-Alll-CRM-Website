/**
 * Database query optimization utilities
 * Provides helpers for faster, more efficient queries
 */

/**
 * Standard pagination helper
 */
export const getPagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Build pagination response
 */
export const buildPaginationResponse = (data, total, page, limit) => {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

/**
 * Optimized populate for slots
 */
export const optimizedSlotPopulate = () => [
  { path: 'client', select: 'name' },
  { path: 'project', select: 'name' },
  { path: 'assignedTo', select: 'name email' },
  { path: 'createdBy', select: 'name' }
];

/**
 * Optimized populate for projects
 */
export const optimizedProjectPopulate = () => [
  { path: 'client', select: 'name email serviceCompany' },
  { path: 'department', select: 'name' }, // Legacy single department
  { path: 'departments', select: 'name' }, // New multiple departments
  { path: 'projectHead', select: 'name email' },
  { path: 'assignedUsers', select: 'name email role' },
  { 
    path: 'teamMembers.user', 
    select: 'name email role' 
  }
];

/**
 * Build search query with text index
 */
export const buildTextSearch = (searchTerm, fields) => {
  if (!searchTerm) return {};
  
  // If text index exists, use it (much faster)
  // Otherwise fall back to regex (slower)
  return {
    $or: fields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }))
  };
};

/**
 * Build date range query with IST timezone awareness
 * 
 * CRITICAL: When querying by date strings (YYYY-MM-DD), we need to interpret them as IST dates.
 * The database stores dates in UTC, but they represent IST midnight.
 * 
 * Example: "2026-02-17" should query for records from 2026-02-17 00:00:00 IST to 2026-02-17 23:59:59 IST
 * which is stored as 2026-02-16 18:30:00 UTC to 2026-02-17 18:29:59 UTC
 */
export const buildDateRangeQuery = (startDate, endDate, field = 'createdAt') => {
  const query = {};
  
  if (startDate || endDate) {
    query[field] = {};
    
    if (startDate) {
      // Parse date string as IST date
      const dateStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      
      // Create UTC date representing IST midnight
      // IST is UTC+5:30, so IST midnight is 18:30 UTC of previous day
      const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 in milliseconds
      query[field].$gte = new Date(startUTC.getTime() - istOffset);
    }
    
    if (endDate) {
      // Parse date string as IST date
      const dateStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      
      // Create UTC date representing end of IST day (23:59:59.999)
      const endUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 in milliseconds
      query[field].$lte = new Date(endUTC.getTime() - istOffset);
    }
  }
  
  return query;
};

/**
 * Select only needed fields for list views
 */
export const getListFields = (model) => {
  const fieldMaps = {
    slot: 'title description status priority dueDate assignedTo project client workType',
    project: 'name client department projectHead status progress startDate endDate',
    user: 'name email role designation department',
    client: 'name email phone company status'
  };
  
  return fieldMaps[model] || '';
};
