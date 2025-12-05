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
  { path: 'client', select: 'name email' },
  { path: 'department', select: 'name' },
  { path: 'projectHead', select: 'name email' },
  { path: 'assignedUsers', select: 'name email role' }
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
 * Build date range query
 */
export const buildDateRangeQuery = (startDate, endDate, field = 'createdAt') => {
  const query = {};
  
  if (startDate || endDate) {
    query[field] = {};
    if (startDate) query[field].$gte = new Date(startDate);
    if (endDate) query[field].$lte = new Date(endDate);
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
