import { useState } from "react";
import { Table, Dropdown } from "react-bootstrap";
import { FaSortUp, FaSortDown, FaSort, FaEllipsisV } from "react-icons/fa";
import { useBreakpoint } from "../../context/BreakpointContext";
import LoadingSpinner from "./LoadingSpinner";
import Pagination from "./Pagination";

/**
 * Responsive table: standard table on tablet+, card rows on compact (≤575px).
 * Column options: hideOnMobile, mobileLabel, mobilePriority (lower = shown first)
 */
const ResponsiveDataTable = ({
  columns,
  data,
  loading = false,
  emptyMessage = "No data available",
  sortable = true,
  paginated = true,
  initialItemsPerPage = 20,
  onRowClick,
  striped = true,
  hover = true,
  responsive = true,
  keyField = "id",
}) => {
  const { isCompact } = useBreakpoint();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const handleSort = (key) => {
    if (!sortable) return;
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    if (typeof aValue === "string") {
      return sortConfig.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    return sortConfig.direction === "asc"
      ? aValue > bValue ? 1 : -1
      : aValue < bValue ? 1 : -1;
  });

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = paginated
    ? sortedData.slice(startIndex, startIndex + itemsPerPage)
    : sortedData;

  const visibleColumns = columns.filter((c) => !(isCompact && c.hideOnMobile));

  const getSortIcon = (key) => {
    if (!sortable || sortConfig.key !== key) return <FaSort className="ms-1 text-muted" />;
    return sortConfig.direction === "asc" ? (
      <FaSortUp className="ms-1 text-primary" />
    ) : (
      <FaSortDown className="ms-1 text-primary" />
    );
  };

  const renderCell = (column, row) =>
    column.render ? column.render(row[column.key], row) : row[column.key];

  if (loading) return <LoadingSpinner />;

  const cardColumns = [...visibleColumns]
    .filter((c) => c.key !== "actions")
    .sort((a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99));

  const actionColumn = columns.find((c) => c.key === "actions");

  return (
    <div className="data-table-container">
      {isCompact ? (
        <div className="mobile-table-cards">
          {paginatedData.length === 0 ? (
            <div className="text-center py-5 text-muted">{emptyMessage}</div>
          ) : (
            paginatedData.map((row, rowIndex) => (
              <div
                key={row[keyField] ?? rowIndex}
                className="mobile-table-card"
                onClick={() => onRowClick?.(row)}
                role={onRowClick ? "button" : undefined}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
              >
                {cardColumns.map((column) => (
                  <div key={column.key} className="mobile-table-card-row">
                    <span className="mobile-table-card-label">
                      {column.mobileLabel || column.label}
                    </span>
                    <span className="mobile-table-card-value">{renderCell(column, row)}</span>
                  </div>
                ))}
                {actionColumn && (
                  <div className="mobile-table-card-actions pt-2">
                    {renderCell(actionColumn, row)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <Table striped={striped} hover={hover} responsive={responsive} className="table-mobile-cards">
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                  style={{
                    cursor: column.sortable !== false && sortable ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {column.label}
                  {column.sortable !== false && getSortIcon(column.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={row[keyField] ?? rowIndex}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? "pointer" : "default" }}
                >
                  {visibleColumns.map((column) => (
                    <td key={column.key}>
                      {column.key === "actions" && isCompact === false ? (
                        <Dropdown align="end">
                          <Dropdown.Toggle
                            variant="link"
                            className="p-0 text-muted touch-target"
                            aria-label="Row actions"
                          >
                            <FaEllipsisV />
                          </Dropdown.Toggle>
                          <Dropdown.Menu>{renderCell(column, row)}</Dropdown.Menu>
                        </Dropdown>
                      ) : (
                        renderCell(column, row)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-5 text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}

      {paginated && data.length > 0 && (
        <div className="pagination-controls">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
            totalItems={sortedData.length}
          />
        </div>
      )}
    </div>
  );
};

export default ResponsiveDataTable;
