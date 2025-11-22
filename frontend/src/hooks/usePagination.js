import { useState, useCallback, useMemo } from 'react';
import { paginateArray, calculatePagination, generatePageNumbers } from '../utils/pagination';

/**
 * Custom hook for client-side pagination
 * 
 * @param {Array} data - Array of items to paginate
 * @param {number} initialLimit - Items per page (default: 10)
 */
export const usePagination = (data = [], initialLimit = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);

  // Calculate pagination
  const pagination = useMemo(() => {
    return calculatePagination(data.length, currentPage, limit);
  }, [data.length, currentPage, limit]);

  // Get current page data
  const paginatedData = useMemo(() => {
    return data.slice(pagination.startIndex, pagination.endIndex);
  }, [data, pagination.startIndex, pagination.endIndex]);

  // Page numbers for UI
  const pageNumbers = useMemo(() => {
    return generatePageNumbers(currentPage, pagination.totalPages);
  }, [currentPage, pagination.totalPages]);

  // Navigation functions
  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, pagination.totalPages)));
  }, [pagination.totalPages]);

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [pagination.hasNextPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [pagination.hasPrevPage]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setCurrentPage(pagination.totalPages);
  }, [pagination.totalPages]);

  const changeLimit = useCallback((newLimit) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset to first page
  }, []);

  return {
    // Data
    data: paginatedData,
    allData: data,
    
    // Pagination info
    currentPage,
    totalPages: pagination.totalPages,
    totalItems: pagination.totalItems,
    limit,
    hasNextPage: pagination.hasNextPage,
    hasPrevPage: pagination.hasPrevPage,
    pageNumbers,
    
    // Navigation
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    changeLimit,
  };
};

export default usePagination;
