import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Table, 
  Form, 
  Button, 
  Badge, 
  Dropdown, 
  OverlayTrigger, 
  Tooltip,
  Spinner,
  Alert,
  InputGroup,
  ButtonGroup,
  Collapse,
  Card
} from 'react-bootstrap';
import { 
  FaSort, 
  FaSortUp, 
  FaSortDown, 
  FaFilter, 
  FaColumns, 
  FaDownload,
  FaCheck,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaSearch,
  FaTimes,
  FaCog,
  FaChevronDown,
  FaChevronUp,
  FaMobileAlt,
  FaExpandArrowsAlt,
  FaCompressArrowsAlt,
  FaUser,
  FaBuilding
} from 'react-icons/fa';
import moment from 'moment';
import BulkOperationsPanel from './BulkOperationsPanel';
import SlotAssignmentControl from './SlotAssignmentControl';
import './EnhancedDataTable.css';

/**
 * Professional Data Table Component with Spreadsheet Functionality
 * Features:
 * - Sortable columns with multi-column sorting
 * - Column visibility management
 * - Row selection with bulk operations
 * - Inline editing capabilities
 * - Advanced filtering
 * - Pagination with customizable page sizes
 * - Responsive design for mobile
 * - Export functionality
 * - Real-time data updates
 */
const EnhancedDataTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  onSort,
  onFilter,
  onBulkOperation,
  onRowEdit,
  onRowDelete,
  onExport,
  pagination = {},
  onPageChange,
  onPageSizeChange,
  selectable = true,
  editable = false,
  exportable = true,
  searchable = true,
  className = '',
  emptyMessage = 'No data available',
  rowKey = '_id',
  filterOptions = {},
  currentUser = null,
  // Slot-related props
  onSlotAssignment,
  onSlotRelease,
  onSlotCompletion,
  onBulkSlotOperation,
  slotOperationLoading = false,
  showSlotColumns = true
}) => {
  // State management
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [visibleColumns, setVisibleColumns] = useState(new Set(columns.map(col => col.key)));
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  
  // Mobile responsiveness state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [mobileViewMode, setMobileViewMode] = useState('compact'); // 'compact', 'cards', 'list'
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);

  // Get nested value from object - MOVED TO TOP TO PREVENT HOISTING ISSUES
  const getNestedValue = useCallback((obj, path) => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }, []);

  // Initialize visible columns when columns change
  useEffect(() => {
    setVisibleColumns(new Set(columns.map(col => col.key)));
  }, [columns]);

  // Mobile detection and responsive handling
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      setIsTablet(width > 768 && width <= 1024);
      
      // Auto-adjust visible columns based on screen size
      if (width <= 576) {
        // Extra small screens - show only essential columns
        const essentialColumns = columns.filter(col => col.essential || col.key === 'title' || col.key === 'status');
        setVisibleColumns(new Set(essentialColumns.map(col => col.key)));
      } else if (width <= 768) {
        // Small screens - show important columns
        const importantColumns = columns.filter(col => col.essential || col.important || col.key === 'title' || col.key === 'status' || col.key === 'assignedTo');
        setVisibleColumns(new Set(importantColumns.map(col => col.key)));
      } else if (width <= 992) {
        // Medium screens - show most columns
        const mediumColumns = columns.filter(col => !col.hideOnTablet);
        setVisibleColumns(new Set(mediumColumns.map(col => col.key)));
      } else {
        // Large screens - show all columns
        setVisibleColumns(new Set(columns.map(col => col.key)));
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [columns]);

  // Touch gesture handling
  const handleTouchStart = useCallback((e) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback((e, rowId) => {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX - touchEndX;
    const deltaY = touchStartY - touchEndY;

    // Detect swipe gestures
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe left - could trigger actions menu
        console.log('Swipe left on row:', rowId);
      } else {
        // Swipe right - could trigger selection
        console.log('Swipe right on row:', rowId);
        if (selectable) {
          toggleRowSelection(rowId);
        }
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  }, [touchStartX, touchStartY, selectable]);

  // Toggle row expansion for mobile details view
  const toggleRowExpansion = useCallback((rowId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply global search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row => {
        return columns.some(col => {
          const value = getNestedValue(row, col.key);
          return value && value.toString().toLowerCase().includes(searchLower);
        });
      });
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue && filterValue.trim()) {
        const filterLower = filterValue.toLowerCase();
        filtered = filtered.filter(row => {
          const value = getNestedValue(row, columnKey);
          return value && value.toString().toLowerCase().includes(filterLower);
        });
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key);
        const bValue = getNestedValue(b, sortConfig.key);
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, columnFilters, sortConfig, columns, getNestedValue]);

  // Handle sorting
  const handleSort = useCallback((columnKey) => {
    const direction = sortConfig.key === columnKey && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key: columnKey, direction });
    
    if (onSort) {
      onSort(columnKey, direction);
    }
  }, [sortConfig, onSort]);

  // Handle row selection
  const handleRowSelect = useCallback((rowId, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    setSelectedRows(newSelected);
  }, [selectedRows]);

  // Toggle row selection (for mobile swipe)
  const toggleRowSelection = useCallback((rowId) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
  }, [selectedRows]);

  // Render cell value (wrapper for formatCellValue)
  const renderCellValue = useCallback((row, column) => {
    const value = getNestedValue(row, column.key);
    return formatCellValue(value, column, row);
  }, [getNestedValue]);

  // Handle select all
  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedRows(new Set(processedData.map(row => row[rowKey])));
    } else {
      setSelectedRows(new Set());
    }
  }, [processedData, rowKey]);

  // Handle column visibility
  const toggleColumnVisibility = useCallback((columnKey) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(columnKey)) {
      newVisible.delete(columnKey);
    } else {
      newVisible.add(columnKey);
    }
    setVisibleColumns(newVisible);
  }, [visibleColumns]);

  // Handle inline editing
  const startEdit = useCallback((rowId, columnKey, currentValue) => {
    setEditingCell({ rowId, columnKey });
    setEditValue(currentValue || '');
  }, []);

  const saveEdit = useCallback(() => {
    if (editingCell && onRowEdit) {
      onRowEdit(editingCell.rowId, editingCell.columnKey, editValue);
    }
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, onRowEdit]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  // Handle column filter
  const handleColumnFilter = useCallback((columnKey, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig({ key: null, direction: 'asc' });
  }, []);

  // Bulk operations
  const handleBulkOperation = useCallback(async (operation, selectedIds, data) => {
    try {
      setBulkOperationLoading(true);
      if (onBulkOperation) {
        await onBulkOperation(operation, selectedIds, data);
        // Clear selection after successful operation
        setSelectedRows(new Set());
        setShowBulkOperations(false);
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setBulkOperationLoading(false);
    }
  }, [onBulkOperation]);

  // Get selected items data for bulk operations
  const selectedItemsData = useMemo(() => {
    return processedData.filter(row => selectedRows.has(row[rowKey]));
  }, [processedData, selectedRows, rowKey]);

  // Format cell value based on column type
  const formatCellValue = useCallback((value, column, row) => {
    // Check if column has a custom render function first
    if (column.render && typeof column.render === 'function') {
      return column.render(value, row);
    }
    
    if (value === null || value === undefined) return '-';

    switch (column.type) {
      case 'date':
        // Handle various date formats safely
        if (moment.isMoment(value)) {
          return value.format(column.dateFormat || 'MMM DD, YYYY');
        }
        if (typeof value === 'string' && value.trim()) {
          const parsedDate = moment(value, ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', moment.ISO_8601], true);
          return parsedDate.isValid() ? parsedDate.format(column.dateFormat || 'MMM DD, YYYY') : value;
        }
        return value;
      case 'datetime':
        // Handle various datetime formats safely
        if (moment.isMoment(value)) {
          return value.format(column.dateFormat || 'MMM DD, YYYY HH:mm');
        }
        if (typeof value === 'string' && value.trim()) {
          const parsedDate = moment(value, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'MM/DD/YYYY HH:mm'], true);
          return parsedDate.isValid() ? parsedDate.format(column.dateFormat || 'MMM DD, YYYY HH:mm') : value;
        }
        return value;
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: column.currency || 'USD' 
        }).format(value);
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      case 'percentage':
        return `${value}%`;
      case 'badge':
        return (
          <Badge bg={getBadgeVariant(value, column.badgeMap)}>
            {column.badgeMap?.[value] || value}
          </Badge>
        );
      case 'boolean':
        return value ? 
          <Badge bg="success"><FaCheck /></Badge> : 
          <Badge bg="secondary">-</Badge>;
      
      // Slot-specific column types - DISPLAY ONLY
      case 'slot-number-display':
        return value ? (
          <Badge bg="info" className="slot-number-badge">
            {value}
          </Badge>
        ) : (
          <Badge bg="light" className="text-muted">
            No Slot
          </Badge>
        );
      
      case 'slot-number':
        return value ? (
          <Badge bg="info" className="slot-number-badge">
            {value}
          </Badge>
        ) : (
          <Badge bg="light" className="text-muted">
            No Slot
          </Badge>
        );
      
      case 'slot-status-badge':
        const slotStatusVariants = {
          'available': 'success',
          'assigned': 'primary',
          'in-progress': 'warning',
          'completed': 'success',
          'blocked': 'danger'
        };
        return value ? (
          <Badge bg={slotStatusVariants[value] || 'secondary'}>
            {column.badgeMap?.[value] || value}
          </Badge>
        ) : (
          <Badge bg="light" className="text-muted">
            No Status
          </Badge>
        );
      
      case 'slot-progress':
        if (value && typeof value === 'object') {
          const { completedSlots = 0, totalSlots = 0 } = value;
          const percentage = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
          
          return (
            <div className="slot-progress-display">
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  {completedSlots}/{totalSlots}
                </small>
                <Badge bg={percentage >= 75 ? 'success' : percentage >= 50 ? 'warning' : 'info'}>
                  {percentage}%
                </Badge>
              </div>
              <div className="progress mt-1" style={{ height: '4px' }}>
                <div 
                  className={`progress-bar bg-${percentage >= 75 ? 'success' : percentage >= 50 ? 'warning' : 'info'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        }
        return '-';
      
      default:
        // Safely convert to string, handling objects
        if (typeof value === 'object') {
          // If it's an object, try to extract meaningful data
          if (value && value.name) return String(value.name);
          if (value && value.title) return String(value.title);
          if (value && value.label) return String(value.label);
          // If no meaningful property found, return a placeholder
          return 'Complex Data';
        }
        return String(value);
    }
  }, []); // Close useCallback with empty dependencies since it doesn't depend on any props/state

  // Get badge variant based on value
  const getBadgeVariant = (value, badgeMap) => {
    const variants = {
      'completed': 'success',
      'in-progress': 'primary',
      'scheduled': 'info',
      'overdue': 'danger',
      'cancelled': 'secondary',
      'urgent': 'danger',
      'high': 'warning',
      'medium': 'info',
      'low': 'light'
    };
    return variants[value] || 'secondary';
  };

  // Render sort icon
  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <FaSort className="text-muted" />;
    }
    return sortConfig.direction === 'asc' ? 
      <FaSortUp className="text-primary" /> : 
      <FaSortDown className="text-primary" />;
  };

  // Render cell content
  const renderCell = (row, column) => {
    const value = getNestedValue(row, column.key);
    const isEditing = editingCell?.rowId === row[rowKey] && editingCell?.columnKey === column.key;

    if (isEditing && editable && column.editable !== false) {
      // Handle select dropdown for status and priority
      if (column.type === 'select' && column.selectOptions) {
        return (
          <InputGroup size="sm">
            <Form.Select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              autoFocus
              style={{ minWidth: '120px' }}
            >
              {column.selectOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
            <Button variant="success" size="sm" onClick={saveEdit}>
              <FaCheck />
            </Button>
            <Button variant="secondary" size="sm" onClick={cancelEdit}>
              ×
            </Button>
          </InputGroup>
        );
      }
      
      // Handle regular text input
      return (
        <InputGroup size="sm">
          <Form.Control
            type={column.inputType || 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            autoFocus
          />
          <Button variant="success" size="sm" onClick={saveEdit}>
            <FaCheck />
          </Button>
          <Button variant="secondary" size="sm" onClick={cancelEdit}>
            ×
          </Button>
        </InputGroup>
      );
    }

    const formattedValue = formatCellValue(value, column, row);
    
    // Handle slot-specific columns - DISPLAY ONLY (no assignment controls)
    if (column.key === 'slotAssignment.slotNumber') {
      // Just show the slot number badge - no assignment controls
      return formattedValue;
    }
    
    if (editable && column.editable !== false) {
      return (
        <div 
          className="editable-cell"
          onClick={() => startEdit(row[rowKey], column.key, value)}
          title="Click to edit"
        >
          <span className="cell-content">{formattedValue}</span>
          <FaEdit className="edit-icon" />
        </div>
      );
    }

    return formattedValue;
  };

  // Mobile card view renderer
  const renderMobileCard = useCallback((row, index) => {
    const isSelected = selectedRows.has(row[rowKey]);
    const isExpanded = expandedRows.has(row[rowKey]);
    
    return (
      <Card 
        key={row[rowKey]} 
        className={`mb-2 ${isSelected ? 'border-primary' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={(e) => handleTouchEnd(e, row[rowKey])}
      >
        <Card.Body className="p-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="flex-grow-1">
              {/* Primary information */}
              <h6 className="mb-1 text-primary">{renderCellValue(row, columns.find(col => col.key === 'title') || columns[0])}</h6>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {columns.slice(1, 4).map(column => (
                  visibleColumns.has(column.key) && (
                    <small key={column.key} className="text-muted">
                      <strong>{column.title}:</strong> {renderCellValue(row, column)}
                    </small>
                  )
                ))}
              </div>
            </div>
            
            <div className="d-flex align-items-center gap-2">
              {selectable && (
                <Form.Check
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRowSelection(row[rowKey])}
                />
              )}
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => toggleRowExpansion(row[rowKey])}
              >
                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              </Button>
            </div>
          </div>
          
          {/* Expandable details */}
          <Collapse in={isExpanded}>
            <div>
              <hr className="my-2" />
              <div className="row g-2">
                {columns.slice(4).map(column => (
                  visibleColumns.has(column.key) && (
                    <div key={column.key} className="col-6">
                      <small className="text-muted d-block">{column.title}</small>
                      <div>{renderCellValue(row, column)}</div>
                    </div>
                  )
                ))}
              </div>
              
              {/* Action buttons */}
              {(editable || onRowDelete) && (
                <div className="mt-2 pt-2 border-top">
                  <ButtonGroup size="sm">
                    {editable && (
                      <Button variant="outline-primary" onClick={() => onRowEdit?.(row[rowKey])}>
                        <FaEdit /> Edit
                      </Button>
                    )}
                    {onRowDelete && (
                      <Button variant="outline-danger" onClick={() => onRowDelete(row[rowKey])}>
                        <FaTrash /> Delete
                      </Button>
                    )}
                  </ButtonGroup>
                </div>
              )}
            </div>
          </Collapse>
        </Card.Body>
      </Card>
    );
  }, [selectedRows, expandedRows, visibleColumns, columns, rowKey, selectable, editable, onRowEdit, onRowDelete, handleTouchStart, handleTouchEnd, toggleRowSelection, toggleRowExpansion, renderCellValue]);

  // Mobile list view renderer
  const renderMobileList = useCallback((row, index) => {
    const isSelected = selectedRows.has(row[rowKey]);
    
    return (
      <div 
        key={row[rowKey]}
        className={`d-flex align-items-center p-3 border-bottom ${isSelected ? 'bg-light border-primary' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={(e) => handleTouchEnd(e, row[rowKey])}
        onClick={() => toggleRowExpansion(row[rowKey])}
        style={{ cursor: 'pointer' }}
      >
        {selectable && (
          <Form.Check
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              toggleRowSelection(row[rowKey]);
            }}
            className="me-3"
          />
        )}
        
        <div className="flex-grow-1">
          <div className="mobile-stack">
            <div className="primary">{renderCellValue(row, columns.find(col => col.key === 'title') || columns[0])}</div>
            <div className="secondary">
              {columns.slice(1, 3).map(column => (
                visibleColumns.has(column.key) && renderCellValue(row, column)
              )).filter(Boolean).join(' • ')}
            </div>
          </div>
        </div>
        
        <div className="text-end">
          {renderCellValue(row, columns.find(col => col.key === 'status') || columns[columns.length - 1])}
        </div>
      </div>
    );
  }, [selectedRows, visibleColumns, columns, rowKey, selectable, handleTouchStart, handleTouchEnd, toggleRowSelection, toggleRowExpansion, renderCellValue]);

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Data</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  return (
    <div className={`enhanced-data-table ${className}`}>
      {/* Table Controls */}
      <div className="table-controls mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          
          {/* Mobile View Mode Controls */}
          {isMobile && (
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">View:</small>
              <ButtonGroup size="sm">
                <Button
                  variant={mobileViewMode === 'compact' ? 'primary' : 'outline-primary'}
                  onClick={() => setMobileViewMode('compact')}
                  title="Compact Table View"
                >
                  <FaCompressArrowsAlt />
                </Button>
                <Button
                  variant={mobileViewMode === 'cards' ? 'primary' : 'outline-primary'}
                  onClick={() => setMobileViewMode('cards')}
                  title="Card View"
                >
                  <FaMobileAlt />
                </Button>
                <Button
                  variant={mobileViewMode === 'list' ? 'primary' : 'outline-primary'}
                  onClick={() => setMobileViewMode('list')}
                  title="List View"
                >
                  <FaExpandArrowsAlt />
                </Button>
              </ButtonGroup>
            </div>
          )}
          {/* Left side controls */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Global Search */}
            {searchable && (
              <InputGroup style={{ width: '250px' }}>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search all columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setSearchTerm('')}
                  >
                    <FaTimes />
                  </Button>
                )}
              </InputGroup>
            )}

            {/* Clear Filters */}
            {(searchTerm || Object.keys(columnFilters).length > 0) && (
              <Button variant="outline-warning" size="sm" onClick={clearAllFilters}>
                Clear Filters
              </Button>
            )}

            {/* Selected Count */}
            {selectable && selectedRows.size > 0 && (
              <Badge bg="primary" className="fs-6">
                {selectedRows.size} selected
              </Badge>
            )}
          </div>

          {/* Right side controls */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Enhanced Bulk Operations */}
            {selectable && selectedRows.size > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowBulkOperations(true)}
                className="d-flex align-items-center gap-2"
              >
                <FaCog />
                Bulk Operations ({selectedRows.size})
              </Button>
            )}

            {/* Column Visibility */}
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <FaColumns /> Columns
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {columns.map(column => (
                  <Dropdown.Item
                    key={column.key}
                    as="div"
                    className="d-flex align-items-center"
                  >
                    <Form.Check
                      type="checkbox"
                      id={`col-${column.key}`}
                      label={column.title}
                      checked={visibleColumns.has(column.key)}
                      onChange={(e) => toggleColumnVisibility(column.key)}
                    />
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>

            {/* Export */}
            {exportable && (
              <Dropdown>
                <Dropdown.Toggle variant="outline-success" size="sm">
                  <FaDownload /> Export
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => onExport?.('csv')}>
                    Export as CSV
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => onExport?.('excel')}>
                    Export as Excel
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => onExport?.('pdf')}>
                    Export as PDF
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>
        </div>
      </div>

      {/* Table - Conditional Mobile Rendering */}
      {isMobile && mobileViewMode === 'cards' ? (
        // Mobile Card View
        <div className="mobile-cards-container">
          {processedData.map((row, index) => renderMobileCard(row, index))}
        </div>
      ) : isMobile && mobileViewMode === 'list' ? (
        // Mobile List View
        <div className="mobile-list-container border rounded">
          {processedData.map((row, index) => renderMobileList(row, index))}
        </div>
      ) : (
        // Standard Table View (Desktop and Mobile Compact)
        <div className={`table-responsive ${isMobile ? 'touch-enabled' : ''}`}>
          <Table 
            striped 
            hover 
            className={`enhanced-table ${isMobile ? 'mobile-optimized' : ''}`}
          >
          <thead className="table-dark sticky-top">
            <tr>
              {/* Select All Checkbox */}
              {selectable && (
                <th className="text-center" style={{ width: '50px' }}>
                  <Form.Check
                    type="checkbox"
                    checked={selectedRows.size === processedData.length && processedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}

              {/* Column Headers */}
              {columns
                .filter(col => visibleColumns.has(col.key))
                .map(column => {
                  // Determine header CSS class based on column type and key
                  let headerClass = '';
                  if (column.key === 'status') headerClass = 'text-center';
                  else if (column.key === 'priority') headerClass = 'text-center';
                  else if (column.type === 'date' || column.type === 'datetime') headerClass = 'text-center';
                  else if (column.type === 'number') headerClass = 'text-right';
                  else if (column.type === 'percentage') headerClass = 'text-center';
                  else if (column.key.includes('Hours') || column.key.includes('hours')) headerClass = 'text-right';
                  else if (column.key.includes('Days') || column.key.includes('days')) headerClass = 'text-center';
                  
                  // Add slot column styling
                  if (column.slotColumn) {
                    headerClass += ' slot-column';
                  }
                  
                  return (
                    <th 
                      key={column.key}
                      className={headerClass}
                      style={{ 
                        minWidth: column.minWidth || '120px',
                        width: column.width,
                        cursor: column.sortable !== false ? 'pointer' : 'default'
                      }}
                      onClick={() => column.sortable !== false && handleSort(column.key)}
                    >
                    <div className="d-flex align-items-center justify-content-between">
                      <span>{column.title}</span>
                      {column.sortable !== false && (
                        <span className="ms-1">
                          {renderSortIcon(column.key)}
                        </span>
                      )}
                    </div>
                    
                    {/* Column Filter */}
                    {column.filterable !== false && (
                      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder={`Filter ${column.title}...`}
                          value={columnFilters[column.key] || ''}
                          onChange={(e) => handleColumnFilter(column.key, e.target.value)}
                        />
                      </div>
                    )}
                  </th>
                  );
                })}

              {/* Actions Column */}
              {(editable || onRowDelete) && (
                <th className="text-center" style={{ width: '100px' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (editable || onRowDelete ? 1 : 0)} className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (editable || onRowDelete ? 1 : 0)} className="text-center py-5">
                  <div className="empty-state">
                    <div className="mb-3">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <h6 className="text-muted mb-2">No Work Items Found</h6>
                    <p className="text-muted small mb-0">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              processedData.map(row => (
                <tr key={row[rowKey]} className={selectedRows.has(row[rowKey]) ? 'table-active' : ''}>
                  {/* Row Selection */}
                  {selectable && (
                    <td className="text-center">
                      <Form.Check
                        type="checkbox"
                        checked={selectedRows.has(row[rowKey])}
                        onChange={(e) => handleRowSelect(row[rowKey], e.target.checked)}
                      />
                    </td>
                  )}

                  {/* Data Cells */}
                  {columns
                    .filter(col => visibleColumns.has(col.key))
                    .map(column => {
                      // Determine CSS class based on column type and key
                      let cellClass = '';
                      if (column.key === 'title') cellClass = 'work-title';
                      else if (column.key.includes('client')) cellClass = 'client-name';
                      else if (column.key.includes('project')) cellClass = 'project-name';
                      else if (column.key.includes('assignedTo') || column.key.includes('employee')) cellClass = 'employee-name';
                      else if (column.key.includes('department')) cellClass = 'department-name';
                      else if (column.key === 'status') cellClass = 'status-cell text-center';
                      else if (column.key === 'priority') cellClass = 'priority-cell text-center';
                      else if (column.type === 'date' || column.type === 'datetime') cellClass = 'date-cell text-center';
                      else if (column.type === 'number') cellClass = 'number-cell text-right';
                      else if (column.type === 'percentage') cellClass = 'percentage-cell text-center';
                      else if (column.key.includes('Hours') || column.key.includes('hours')) cellClass = 'number-cell text-right';
                      else if (column.key.includes('Days') || column.key.includes('days')) cellClass = 'number-cell text-center';

                      // Add slot column styling
                      if (column.slotColumn) {
                        cellClass += ' slot-column';
                      }
                      
                      return (
                        <td key={column.key} className={cellClass}>
                          {renderCell(row, column)}
                        </td>
                      );
                    })}

                  {/* Actions */}
                  {(editable || onRowDelete) && (
                    <td className="actions-cell text-center">
                      <ButtonGroup size="sm">
                        {onRowDelete && (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Delete</Tooltip>}
                          >
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => onRowDelete(row[rowKey])}
                            >
                              <FaTrash />
                            </Button>
                          </OverlayTrigger>
                        )}
                      </ButtonGroup>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted">Show</span>
            <Form.Select
              size="sm"
              style={{ width: 'auto' }}
              value={pagination.pageSize || 10}
              onChange={(e) => onPageSizeChange?.(parseInt(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </Form.Select>
            <span className="text-muted">entries</span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="text-muted">
              Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of{' '}
              {pagination.totalCount} entries
            </span>
            
            <ButtonGroup>
              <Button
                variant="outline-primary"
                size="sm"
                disabled={!pagination.hasPrevPage}
                onClick={() => onPageChange?.(pagination.currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => onPageChange?.(pagination.currentPage + 1)}
              >
                Next
              </Button>
            </ButtonGroup>
          </div>
        </div>
      )}

      {/* Bulk Operations Modal */}
      <BulkOperationsPanel
        show={showBulkOperations}
        onHide={() => setShowBulkOperations(false)}
        selectedItems={selectedItemsData}
        onBulkOperation={handleBulkOperation}
        filterOptions={filterOptions}
        currentUser={currentUser}
        loading={bulkOperationLoading}
      />
    </div>
  );
};

export default EnhancedDataTable;