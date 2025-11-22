import React from 'react';
import { Pagination as BsPagination, Form } from 'react-bootstrap';
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleLeft, FaAngleRight } from 'react-icons/fa';

/**
 * Reusable Pagination Component
 */
const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  limit,
  hasNextPage,
  hasPrevPage,
  pageNumbers,
  onPageChange,
  onLimitChange,
  showLimitSelector = true,
  limitOptions = [5, 10, 20, 50, 100],
  size = 'md',
  className = '',
}) => {
  if (totalPages <= 1 && !showLimitSelector) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalItems);

  return (
    <div className={`d-flex justify-content-between align-items-center flex-wrap gap-3 ${className}`}>
      {/* Items info */}
      <div className="text-muted">
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
        <strong>{totalItems}</strong> items
      </div>

      {/* Pagination controls */}
      <div className="d-flex align-items-center gap-3">
        {/* Limit selector */}
        {showLimitSelector && (
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">Items per page:</span>
            <Form.Select
              size="sm"
              value={limit}
              onChange={(e) => onLimitChange(parseInt(e.target.value))}
              style={{ width: 'auto' }}
            >
              {limitOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Select>
          </div>
        )}

        {/* Page navigation */}
        {totalPages > 1 && (
          <BsPagination size={size} className="mb-0">
            {/* First page */}
            <BsPagination.First
              onClick={() => onPageChange(1)}
              disabled={!hasPrevPage}
            >
              <FaAngleDoubleLeft />
            </BsPagination.First>

            {/* Previous page */}
            <BsPagination.Prev
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              <FaAngleLeft />
            </BsPagination.Prev>

            {/* Page numbers */}
            {pageNumbers.map((pageNum, index) => {
              if (pageNum === '...') {
                return (
                  <BsPagination.Ellipsis key={`ellipsis-${index}`} disabled />
                );
              }

              return (
                <BsPagination.Item
                  key={pageNum}
                  active={pageNum === currentPage}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </BsPagination.Item>
              );
            })}

            {/* Next page */}
            <BsPagination.Next
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage}
            >
              <FaAngleRight />
            </BsPagination.Next>

            {/* Last page */}
            <BsPagination.Last
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNextPage}
            >
              <FaAngleDoubleRight />
            </BsPagination.Last>
          </BsPagination>
        )}
      </div>
    </div>
  );
};

export default Pagination;
