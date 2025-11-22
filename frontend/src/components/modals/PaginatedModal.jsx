import React from 'react';
import { Modal, Table, Badge, Button } from 'react-bootstrap';
import { FaEye } from 'react-icons/fa';
import Pagination from '../common/Pagination';
import usePagination from '../../hooks/usePagination';

/**
 * Reusable Paginated Modal Component
 * Displays data in a table with pagination
 */
const PaginatedModal = ({
  show,
  onHide,
  title,
  icon,
  data = [],
  columns = [],
  renderRow,
  initialLimit = 10,
  emptyMessage = 'No data available',
}) => {
  const {
    data: paginatedData,
    currentPage,
    totalPages,
    totalItems,
    limit,
    hasNextPage,
    hasPrevPage,
    pageNumbers,
    goToPage,
    changeLimit,
  } = usePagination(data, initialLimit);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {icon && <span className="me-2">{icon}</span>}
          {title} ({totalItems})
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {totalItems === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table responsive hover>
                <thead className="sticky-top bg-white">
                  <tr>
                    {columns.map((col, index) => (
                      <th key={index}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => renderRow(item, index))}
                </tbody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-3 pt-3 border-top">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  limit={limit}
                  hasNextPage={hasNextPage}
                  hasPrevPage={hasPrevPage}
                  pageNumbers={pageNumbers}
                  onPageChange={goToPage}
                  onLimitChange={changeLimit}
                  size="sm"
                />
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default PaginatedModal;
