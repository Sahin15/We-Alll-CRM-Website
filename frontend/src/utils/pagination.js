/**
 * Pagination Utility
 * Provides pagination helpers and hooks
 */

/**
 * Calculate pagination metadata
 */
export const calculatePagination = (totalItems, page = 1, limit = 10) => {
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    totalItems,
    totalPages,
    currentPage,
    limit,
    startIndex,
    endIndex,
    hasNextPage,
    hasPrevPage,
    itemsOnPage: endIndex - startIndex,
  };
};

/**
 * Paginate array data
 */
export const paginateArray = (array, page = 1, limit = 10) => {
  const pagination = calculatePagination(array.length, page, limit);
  const data = array.slice(pagination.startIndex, pagination.endIndex);

  return {
    data,
    pagination,
  };
};

/**
 * Generate page numbers for pagination UI
 */
export const generatePageNumbers = (currentPage, totalPages, maxVisible = 5) => {
  const pages = [];
  
  if (totalPages <= maxVisible) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Show subset with ellipsis
    const halfVisible = Math.floor(maxVisible / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    // Adjust if at start or end
    if (currentPage <= halfVisible) {
      endPage = maxVisible;
    } else if (currentPage >= totalPages - halfVisible) {
      startPage = totalPages - maxVisible + 1;
    }

    // Add first page and ellipsis
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
  }

  return pages;
};

/**
 * Parse pagination params from URL
 */
export const parsePaginationParams = (searchParams) => {
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 10;
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  return { page, limit, sortBy, sortOrder };
};

/**
 * Build pagination query string
 */
export const buildPaginationQuery = (page, limit, sortBy, sortOrder) => {
  const params = new URLSearchParams();
  if (page) params.set('page', page.toString());
  if (limit) params.set('limit', limit.toString());
  if (sortBy) params.set('sortBy', sortBy);
  if (sortOrder) params.set('sortOrder', sortOrder);
  return params.toString();
};
