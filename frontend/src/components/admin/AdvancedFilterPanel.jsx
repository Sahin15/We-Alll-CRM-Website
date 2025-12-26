import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Form, 
  Button, 
  Badge, 
  InputGroup,
  Accordion,
  ButtonGroup
} from 'react-bootstrap';
import { 
  FaFilter, 
  FaPlus, 
  FaTrash, 
  FaSave, 
  FaUndo,
  FaSearch,
  FaTimes
} from 'react-icons/fa';
import moment from 'moment';
import './AdvancedFilterPanel.css';

/**
 * Advanced Filter Panel Component
 * Provides sophisticated filtering capabilities with custom criteria builder
 * Features:
 * - Client-focused filtering (primary feature)
 * - Custom filter criteria with AND/OR logic
 * - Filter presets save/load functionality
 * - Real-time filter application
 * - Advanced date range options
 * - Multi-select filters
 */
const AdvancedFilterPanel = ({
  filters,
  filterOptions,
  onFilterChange,
  onClearFilters,
  onClose
}) => {
  // State for custom criteria
  const [customCriteria, setCustomCriteria] = useState([]);
  const [logicalOperator, setLogicalOperator] = useState('AND');
  const [filterPresets, setFilterPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterHistory, setFilterHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  // Available filter fields for custom criteria
  const filterFields = [
    { value: 'title', label: 'Work Title', type: 'text' },
    { value: 'client.name', label: 'Client Name', type: 'text' },
    { value: 'project.name', label: 'Project Name', type: 'text' },
    { value: 'assignedTo.name', label: 'Employee Name', type: 'text' },
    { value: 'department.name', label: 'Department', type: 'text' },
    { value: 'status', label: 'Status', type: 'select', options: ['scheduled', 'in-progress', 'completed', 'overdue', 'cancelled'] },
    { value: 'priority', label: 'Priority', type: 'select', options: ['urgent', 'high', 'medium', 'low'] },
    { value: 'workType', label: 'Work Type', type: 'text' },
    { value: 'startDate', label: 'Start Date', type: 'date' },
    { value: 'dueDate', label: 'Due Date', type: 'date' },
    { value: 'endDate', label: 'End Date', type: 'date' },
    { value: 'timeTracking.estimatedHours', label: 'Estimated Hours', type: 'number' },
    { value: 'timeTracking.actualHours', label: 'Actual Hours', type: 'number' },
    { value: 'progress', label: 'Progress (%)', type: 'number' },
    { value: 'tags', label: 'Tags', type: 'text' },
    // Slot-related fields
    { value: 'slotAssignment.slotNumber', label: 'Slot Number', type: 'number' },
    { value: 'slotAssignment.slotIdentifier', label: 'Slot Identifier', type: 'text' },
    { value: 'hasSlotAssignment', label: 'Has Slot Assignment', type: 'select', options: ['assigned', 'unassigned'] }
  ];

  // Filter operators
  const filterOperators = [
    { value: 'equals', label: 'Equals', types: ['text', 'select', 'number', 'date'] },
    { value: 'contains', label: 'Contains', types: ['text'] },
    { value: 'startsWith', label: 'Starts With', types: ['text'] },
    { value: 'endsWith', label: 'Ends With', types: ['text'] },
    { value: 'greaterThan', label: 'Greater Than', types: ['number', 'date'] },
    { value: 'lessThan', label: 'Less Than', types: ['number', 'date'] },
    { value: 'between', label: 'Between', types: ['number', 'date'] },
    { value: 'isEmpty', label: 'Is Empty', types: ['text'] },
    { value: 'isNotEmpty', label: 'Is Not Empty', types: ['text'] }
  ];

  // Quick date range presets
  const dateRangePresets = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'thisWeek' },
    { label: 'Last Week', value: 'lastWeek' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Quarter', value: 'thisQuarter' },
    { label: 'Last Quarter', value: 'lastQuarter' },
    { label: 'This Year', value: 'thisYear' },
    { label: 'Last Year', value: 'lastYear' }
  ];

  // Load saved presets on component mount
  useEffect(() => {
    const savedPresets = JSON.parse(localStorage.getItem('workFilterPresets') || '[]');
    setFilterPresets(savedPresets);
    
    // Load filter history
    const savedHistory = JSON.parse(localStorage.getItem('workFilterHistory') || '[]');
    setFilterHistory(savedHistory);
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearchTerm !== filters.search) {
      onFilterChange('search', debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, filters.search, onFilterChange]);

  // Save filter state to history when filters change
  useEffect(() => {
    const filterState = {
      ...filters,
      customCriteria,
      logicalOperator,
      timestamp: Date.now()
    };

    // Only save if filters have actually changed
    const lastHistory = filterHistory[filterHistory.length - 1];
    if (!lastHistory || JSON.stringify(lastHistory.filters) !== JSON.stringify(filters)) {
      const newHistory = [...filterHistory.slice(-9), { // Keep last 10 states
        id: Date.now(),
        filters: { ...filters },
        customCriteria: [...customCriteria],
        logicalOperator,
        timestamp: Date.now()
      }];
      
      setFilterHistory(newHistory);
      setCurrentHistoryIndex(newHistory.length - 1);
      
      // Save to localStorage
      localStorage.setItem('workFilterHistory', JSON.stringify(newHistory));
    }
  }, [filters, customCriteria, logicalOperator]);

  // Handle date range preset selection
  const handleDateRangePreset = useCallback((preset) => {
    let startDate, endDate;
    const now = moment();

    switch (preset) {
      case 'today':
        startDate = endDate = now.format('YYYY-MM-DD');
        break;
      case 'yesterday':
        startDate = endDate = now.subtract(1, 'day').format('YYYY-MM-DD');
        break;
      case 'thisWeek':
        startDate = now.startOf('week').format('YYYY-MM-DD');
        endDate = now.endOf('week').format('YYYY-MM-DD');
        break;
      case 'lastWeek':
        startDate = now.subtract(1, 'week').startOf('week').format('YYYY-MM-DD');
        endDate = now.endOf('week').format('YYYY-MM-DD');
        break;
      case 'thisMonth':
        startDate = now.startOf('month').format('YYYY-MM-DD');
        endDate = now.endOf('month').format('YYYY-MM-DD');
        break;
      case 'lastMonth':
        startDate = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
        endDate = now.endOf('month').format('YYYY-MM-DD');
        break;
      case 'thisQuarter':
        startDate = now.startOf('quarter').format('YYYY-MM-DD');
        endDate = now.endOf('quarter').format('YYYY-MM-DD');
        break;
      case 'lastQuarter':
        startDate = now.subtract(1, 'quarter').startOf('quarter').format('YYYY-MM-DD');
        endDate = now.endOf('quarter').format('YYYY-MM-DD');
        break;
      case 'thisYear':
        startDate = now.startOf('year').format('YYYY-MM-DD');
        endDate = now.endOf('year').format('YYYY-MM-DD');
        break;
      case 'lastYear':
        startDate = now.subtract(1, 'year').startOf('year').format('YYYY-MM-DD');
        endDate = now.endOf('year').format('YYYY-MM-DD');
        break;
      default:
        return;
    }

    onFilterChange('startDate', startDate);
    onFilterChange('endDate', endDate);
  }, [onFilterChange]);

  // Add custom criteria
  const addCustomCriteria = useCallback(() => {
    const newCriteria = {
      id: Date.now(),
      field: '',
      operator: 'equals',
      value: '',
      dataType: 'text'
    };
    setCustomCriteria(prev => [...prev, newCriteria]);
  }, []);

  // Remove custom criteria
  const removeCustomCriteria = useCallback((id) => {
    setCustomCriteria(prev => prev.filter(criteria => criteria.id !== id));
  }, []);

  // Update custom criteria
  const updateCustomCriteria = useCallback((id, field, value) => {
    setCustomCriteria(prev => prev.map(criteria => {
      if (criteria.id === id) {
        const updatedCriteria = { ...criteria, [field]: value };
        
        // Update data type when field changes
        if (field === 'field') {
          const fieldConfig = filterFields.find(f => f.value === value);
          updatedCriteria.dataType = fieldConfig?.type || 'text';
          updatedCriteria.operator = 'equals'; // Reset operator
          updatedCriteria.value = ''; // Reset value
        }
        
        return updatedCriteria;
      }
      return criteria;
    }));
  }, [filterFields]);

  // Apply custom criteria
  const applyCustomCriteria = useCallback(() => {
    const validCriteria = customCriteria.filter(c => c.field && c.operator && c.value);
    onFilterChange('customFilters', validCriteria);
    onFilterChange('logicalOperator', logicalOperator);
  }, [customCriteria, logicalOperator, onFilterChange]);

  // Save filter preset
  const saveFilterPreset = useCallback(() => {
    if (!presetName.trim()) return;

    const preset = {
      id: Date.now(),
      name: presetName,
      filters: { ...filters },
      customCriteria: [...customCriteria],
      logicalOperator,
      createdAt: new Date().toISOString()
    };

    setFilterPresets(prev => [...prev, preset]);
    setPresetName('');
    setShowPresetSave(false);
    
    // Save to localStorage
    const savedPresets = JSON.parse(localStorage.getItem('workFilterPresets') || '[]');
    savedPresets.push(preset);
    localStorage.setItem('workFilterPresets', JSON.stringify(savedPresets));
  }, [presetName, filters, customCriteria, logicalOperator]);

  // Load filter preset
  const loadFilterPreset = useCallback((preset) => {
    // Apply basic filters
    Object.entries(preset.filters).forEach(([key, value]) => {
      onFilterChange(key, value);
    });

    // Apply custom criteria
    setCustomCriteria(preset.customCriteria || []);
    setLogicalOperator(preset.logicalOperator || 'AND');
  }, [onFilterChange]);

  // Delete filter preset
  const deleteFilterPreset = useCallback((presetId) => {
    const updatedPresets = filterPresets.filter(preset => preset.id !== presetId);
    setFilterPresets(updatedPresets);
    localStorage.setItem('workFilterPresets', JSON.stringify(updatedPresets));
  }, [filterPresets]);

  // Navigate filter history
  const navigateHistory = useCallback((direction) => {
    let newIndex;
    if (direction === 'back' && currentHistoryIndex > 0) {
      newIndex = currentHistoryIndex - 1;
    } else if (direction === 'forward' && currentHistoryIndex < filterHistory.length - 1) {
      newIndex = currentHistoryIndex + 1;
    } else {
      return;
    }

    const historyState = filterHistory[newIndex];
    if (historyState) {
      // Apply filters from history
      Object.entries(historyState.filters).forEach(([key, value]) => {
        onFilterChange(key, value);
      });
      
      setCustomCriteria(historyState.customCriteria || []);
      setLogicalOperator(historyState.logicalOperator || 'AND');
      setCurrentHistoryIndex(newIndex);
    }
  }, [currentHistoryIndex, filterHistory, onFilterChange]);

  // Smart filter suggestions based on data
  const getFilterSuggestions = useCallback(() => {
    const suggestions = [];
    
    // Client-focused suggestions
    if (filterOptions.clients?.length > 0) {
      suggestions.push({
        type: 'client',
        label: 'Filter by VIP Clients',
        action: () => onFilterChange('clientPriority', 'vip')
      });
    }

    // Overdue work suggestion
    suggestions.push({
      type: 'status',
      label: 'Show Overdue Work',
      action: () => onFilterChange('status', 'overdue')
    });

    // This week's work
    suggestions.push({
      type: 'date',
      label: 'This Week\'s Work',
      action: () => handleDateRangePreset('thisWeek')
    });

    // Slot-related suggestions
    suggestions.push({
      type: 'slot',
      label: 'Unassigned Work Items',
      action: () => onFilterChange('hasSlotAssignment', 'unassigned')
    });

    suggestions.push({
      type: 'slot',
      label: 'Early Stage Slots (1-5)',
      action: () => {
        onFilterChange('hasSlotAssignment', 'assigned');
        onFilterChange('slotRangeFrom', '1');
        onFilterChange('slotRangeTo', '5');
      }
    });

    suggestions.push({
      type: 'slot',
      label: 'Low Slot Utilization Projects',
      action: () => onFilterChange('projectSlotUtilization', 'low')
    });

    return suggestions;
  }, [filterOptions, onFilterChange, handleDateRangePreset]);

  // Get available operators for field type
  const getAvailableOperators = (fieldType) => {
    return filterOperators.filter(op => op.types.includes(fieldType));
  };

  // Render custom criteria row
  const renderCustomCriteriaRow = (criteria) => {
    const fieldConfig = filterFields.find(f => f.value === criteria.field);
    const availableOperators = getAvailableOperators(criteria.dataType);

    return (
      <Row key={criteria.id} className="mb-2 align-items-end">
        <Col md={3}>
          <Form.Select
            size="sm"
            value={criteria.field}
            onChange={(e) => updateCustomCriteria(criteria.id, 'field', e.target.value)}
          >
            <option value="">Select Field</option>
            {filterFields.map(field => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            size="sm"
            value={criteria.operator}
            onChange={(e) => updateCustomCriteria(criteria.id, 'operator', e.target.value)}
            disabled={!criteria.field}
          >
            {availableOperators.map(op => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          {fieldConfig?.type === 'select' ? (
            <Form.Select
              size="sm"
              value={criteria.value}
              onChange={(e) => updateCustomCriteria(criteria.id, 'value', e.target.value)}
            >
              <option value="">Select Value</option>
              {fieldConfig.options?.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </Form.Select>
          ) : (
            <Form.Control
              size="sm"
              type={fieldConfig?.type === 'date' ? 'date' : fieldConfig?.type === 'number' ? 'number' : 'text'}
              value={criteria.value}
              onChange={(e) => updateCustomCriteria(criteria.id, 'value', e.target.value)}
              placeholder="Enter value"
            />
          )}
        </Col>
        <Col md={2}>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => removeCustomCriteria(criteria.id)}
          >
            <FaTrash />
          </Button>
        </Col>
      </Row>
    );
  };

  return (
    <Card className="advanced-filter-panel mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <FaFilter />
          <strong>Advanced Filters</strong>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={onClose}>
          <FaTimes />
        </Button>
      </Card.Header>
      
      <Card.Body>
        <Accordion defaultActiveKey="0">
          {/* Client-Focused Filters */}
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <strong className="text-primary">Client-Focused Filters (Primary)</strong>
            </Accordion.Header>
            <Accordion.Body>
              <Row className="g-3">
                {/* Multi-Client Selection */}
                <Col md={6}>
                  <Form.Label className="fw-bold">Clients</Form.Label>
                  <Form.Select
                    value={filters.client}
                    onChange={(e) => onFilterChange('client', e.target.value)}
                    className="border-primary"
                  >
                    <option value="all">All Clients</option>
                    {filterOptions.clients?.map(client => (
                      <option key={client._id} value={client._id}>
                        {client.name} {client.company && `(${client.company})`}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Primary filter - most important for work management
                  </Form.Text>
                </Col>

                {/* Client Type Filter */}
                <Col md={6}>
                  <Form.Label className="fw-bold">Client Type</Form.Label>
                  <Form.Select
                    value={filters.clientType || 'all'}
                    onChange={(e) => onFilterChange('clientType', e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="external">External Clients</option>
                    <option value="internal">Internal Work</option>
                  </Form.Select>
                </Col>

                {/* Project by Client */}
                <Col md={6}>
                  <Form.Label className="fw-bold">Projects</Form.Label>
                  <Form.Select
                    value={filters.project}
                    onChange={(e) => onFilterChange('project', e.target.value)}
                  >
                    <option value="all">All Projects</option>
                    {filterOptions.projects
                      ?.filter(project => 
                        filters.client === 'all' || 
                        project.client?._id === filters.client
                      )
                      .map(project => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                        </option>
                      ))}
                  </Form.Select>
                </Col>

                {/* Client Priority Work */}
                <Col md={6}>
                  <Form.Label className="fw-bold">Client Priority</Form.Label>
                  <Form.Select
                    value={filters.clientPriority || 'all'}
                    onChange={(e) => onFilterChange('clientPriority', e.target.value)}
                  >
                    <option value="all">All Priorities</option>
                    <option value="vip">VIP Clients</option>
                    <option value="high-value">High Value</option>
                    <option value="regular">Regular</option>
                  </Form.Select>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Date Range Filters */}
          <Accordion.Item eventKey="1">
            <Accordion.Header>Date Range Filters</Accordion.Header>
            <Accordion.Body>
              <Row className="g-3">
                {/* Quick Date Presets */}
                <Col md={12}>
                  <Form.Label className="fw-bold">Quick Date Ranges</Form.Label>
                  <div className="d-flex flex-wrap gap-1">
                    {dateRangePresets.map(preset => (
                      <Button
                        key={preset.value}
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleDateRangePreset(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </Col>

                {/* Custom Date Range */}
                <Col md={6}>
                  <Form.Label className="fw-bold">Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => onFilterChange('startDate', e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="fw-bold">End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => onFilterChange('endDate', e.target.value)}
                  />
                </Col>

                {/* Relative Date Filters */}
                <Col md={6}>
                  <Form.Label className="fw-bold">Due Date Filter</Form.Label>
                  <Form.Select
                    value={filters.dueDateFilter || 'all'}
                    onChange={(e) => onFilterChange('dueDateFilter', e.target.value)}
                  >
                    <option value="all">All Due Dates</option>
                    <option value="overdue">Overdue</option>
                    <option value="due-today">Due Today</option>
                    <option value="due-this-week">Due This Week</option>
                    <option value="due-next-week">Due Next Week</option>
                    <option value="no-due-date">No Due Date</option>
                  </Form.Select>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Work Classification Filters */}
          <Accordion.Item eventKey="2">
            <Accordion.Header>Work Classification</Accordion.Header>
            <Accordion.Body>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Label className="fw-bold">Status</Form.Label>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) => onFilterChange('status', e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Col>

                <Col md={3}>
                  <Form.Label className="fw-bold">Priority</Form.Label>
                  <Form.Select
                    value={filters.priority}
                    onChange={(e) => onFilterChange('priority', e.target.value)}
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Form.Select>
                </Col>

                <Col md={3}>
                  <Form.Label className="fw-bold">Work Type</Form.Label>
                  <Form.Select
                    value={filters.workType}
                    onChange={(e) => onFilterChange('workType', e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="work-item">Work Item</option>
                    <option value="meeting">Meeting</option>
                    <option value="project">Project Work</option>
                    <option value="review">Review</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Col>

                <Col md={3}>
                  <Form.Label className="fw-bold">Department</Form.Label>
                  <Form.Select
                    value={filters.department}
                    onChange={(e) => onFilterChange('department', e.target.value)}
                  >
                    <option value="all">All Departments</option>
                    {filterOptions.departments?.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Slot-Based Filters */}
          <Accordion.Item eventKey="3">
            <Accordion.Header>
              <strong className="text-success">Slot-Based Filters</strong>
            </Accordion.Header>
            <Accordion.Body>
              <Row className="g-3">
                {/* Slot Assignment Status */}
                <Col md={4}>
                  <Form.Label className="fw-bold">Slot Assignment</Form.Label>
                  <Form.Select
                    value={filters.hasSlotAssignment || 'all'}
                    onChange={(e) => onFilterChange('hasSlotAssignment', e.target.value)}
                  >
                    <option value="all">All Items</option>
                    <option value="assigned">Assigned to Slots</option>
                    <option value="unassigned">Not Assigned to Slots</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Filter by slot assignment status
                  </Form.Text>
                </Col>

                {/* Slot Number Filter */}
                <Col md={4}>
                  <Form.Label className="fw-bold">Slot Number</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter slot number"
                    value={filters.slotNumber || ''}
                    onChange={(e) => onFilterChange('slotNumber', e.target.value)}
                    min="1"
                  />
                  <Form.Text className="text-muted">
                    Filter by specific slot number
                  </Form.Text>
                </Col>

                {/* Slot Number Range */}
                <Col md={4}>
                  <Form.Label className="fw-bold">Slot Range</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="number"
                      placeholder="From"
                      value={filters.slotRangeFrom || ''}
                      onChange={(e) => onFilterChange('slotRangeFrom', e.target.value)}
                      min="1"
                      size="sm"
                    />
                    <Form.Control
                      type="number"
                      placeholder="To"
                      value={filters.slotRangeTo || ''}
                      onChange={(e) => onFilterChange('slotRangeTo', e.target.value)}
                      min="1"
                      size="sm"
                    />
                  </div>
                  <Form.Text className="text-muted">
                    Filter by slot number range
                  </Form.Text>
                </Col>

                {/* Project Slot Utilization */}
                <Col md={6}>
                  <Form.Label className="fw-bold">Project Slot Utilization</Form.Label>
                  <Form.Select
                    value={filters.projectSlotUtilization || 'all'}
                    onChange={(e) => onFilterChange('projectSlotUtilization', e.target.value)}
                  >
                    <option value="all">All Projects</option>
                    <option value="high">High Utilization (&gt;75%)</option>
                    <option value="medium">Medium Utilization (50-75%)</option>
                    <option value="low">Low Utilization (&lt;50%)</option>
                    <option value="empty">No Slots Assigned</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Filter by project slot utilization rate
                  </Form.Text>
                </Col>

                {/* Slot-Based Search */}
                <Col md={6}>
                  <Form.Label className="fw-bold">Slot Search</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search slot identifiers, descriptions..."
                      value={filters.slotSearch || ''}
                      onChange={(e) => onFilterChange('slotSearch', e.target.value)}
                    />
                    {filters.slotSearch && (
                      <Button 
                        variant="outline-secondary"
                        onClick={() => onFilterChange('slotSearch', '')}
                      >
                        <FaTimes />
                      </Button>
                    )}
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Search within slot-related information
                  </Form.Text>
                </Col>

                {/* Quick Slot Filters */}
                <Col md={12}>
                  <Form.Label className="fw-bold">Quick Slot Filters</Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => {
                        onFilterChange('hasSlotAssignment', 'assigned');
                        onFilterChange('slotRangeFrom', '1');
                        onFilterChange('slotRangeTo', '5');
                      }}
                    >
                      Early Slots (1-5)
                    </Button>
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={() => {
                        onFilterChange('hasSlotAssignment', 'assigned');
                        onFilterChange('slotRangeFrom', '6');
                        onFilterChange('slotRangeTo', '10');
                      }}
                    >
                      Mid Slots (6-10)
                    </Button>
                    <Button
                      variant="outline-info"
                      size="sm"
                      onClick={() => {
                        onFilterChange('hasSlotAssignment', 'assigned');
                        onFilterChange('slotRangeFrom', '11');
                      }}
                    >
                      Late Slots (11+)
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        onFilterChange('hasSlotAssignment', 'unassigned');
                        onFilterChange('projectSlotUtilization', 'low');
                      }}
                    >
                      Unassigned & Low Utilization
                    </Button>
                  </div>
                  <Form.Text className="text-muted">
                    Quick preset filters for common slot-based queries
                  </Form.Text>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Custom Criteria Builder */}
          <Accordion.Item eventKey="4">
            <Accordion.Header>Custom Criteria Builder</Accordion.Header>
            <Accordion.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Form.Label className="fw-bold mb-0">Custom Filter Criteria</Form.Label>
                  <div className="d-flex gap-2">
                    <ButtonGroup size="sm">
                      <Button
                        variant={logicalOperator === 'AND' ? 'primary' : 'outline-primary'}
                        onClick={() => setLogicalOperator('AND')}
                      >
                        AND
                      </Button>
                      <Button
                        variant={logicalOperator === 'OR' ? 'primary' : 'outline-primary'}
                        onClick={() => setLogicalOperator('OR')}
                      >
                        OR
                      </Button>
                    </ButtonGroup>
                    <Button variant="success" size="sm" onClick={addCustomCriteria}>
                      <FaPlus /> Add Criteria
                    </Button>
                  </div>
                </div>

                {customCriteria.length > 0 && (
                  <div className="custom-criteria-list">
                    {customCriteria.map(renderCustomCriteriaRow)}
                    <div className="d-flex gap-2 mt-2">
                      <Button variant="primary" size="sm" onClick={applyCustomCriteria}>
                        <FaSearch /> Apply Criteria
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={() => setCustomCriteria([])}
                      >
                        <FaUndo /> Clear Criteria
                      </Button>
                    </div>
                  </div>
                )}

                {customCriteria.length === 0 && (
                  <div className="text-center text-muted py-3">
                    <p>No custom criteria added. Click "Add Criteria" to create advanced filters.</p>
                  </div>
                )}
              </div>
            </Accordion.Body>
          </Accordion.Item>

          {/* Global Search with Debouncing */}
          <Accordion.Item eventKey="5">
            <Accordion.Header>Global Search & Smart Suggestions</Accordion.Header>
            <Accordion.Body>
              <Row className="g-3">
                <Col md={8}>
                  <Form.Label className="fw-bold">Global Search (Real-time)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search across all fields..."
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
                  <Form.Text className="text-muted">
                    Search is debounced (300ms delay) for better performance
                  </Form.Text>
                </Col>

                <Col md={4}>
                  <Form.Label className="fw-bold">Smart Suggestions</Form.Label>
                  <div className="d-flex flex-column gap-1">
                    {getFilterSuggestions().map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline-primary"
                        size="sm"
                        onClick={suggestion.action}
                      >
                        {suggestion.label}
                      </Button>
                    ))}
                  </div>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Filter Presets & History */}
          <Accordion.Item eventKey="6">
            <Accordion.Header>Filter Presets & History</Accordion.Header>
            <Accordion.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="fw-bold">Save Current Filters</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Enter preset name"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                    />
                    <Button 
                      variant="success" 
                      onClick={saveFilterPreset}
                      disabled={!presetName.trim()}
                    >
                      <FaSave /> Save
                    </Button>
                  </InputGroup>
                </Col>

                <Col md={6}>
                  <Form.Label className="fw-bold">Filter History</Form.Label>
                  <ButtonGroup className="w-100">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={currentHistoryIndex <= 0}
                      onClick={() => navigateHistory('back')}
                    >
                      <FaUndo /> Back
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={currentHistoryIndex >= filterHistory.length - 1}
                      onClick={() => navigateHistory('forward')}
                    >
                      Forward <FaUndo style={{ transform: 'scaleX(-1)' }} />
                    </Button>
                  </ButtonGroup>
                  <Form.Text className="text-muted">
                    {filterHistory.length} filter states saved
                  </Form.Text>
                </Col>

                <Col md={12}>
                  <Form.Label className="fw-bold">Saved Presets</Form.Label>
                  {filterPresets.length > 0 ? (
                    <div className="d-flex flex-wrap gap-2">
                      {filterPresets.map(preset => (
                        <div key={preset.id} className="preset-item">
                          <Badge
                            bg="info"
                            className="cursor-pointer me-1"
                            onClick={() => loadFilterPreset(preset)}
                          >
                            {preset.name}
                          </Badge>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="preset-delete-btn"
                            onClick={() => deleteFilterPreset(preset.id)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted small">No saved presets</p>
                  )}
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

        {/* Action Buttons */}
        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
          <div>
            <Button variant="outline-warning" onClick={onClearFilters}>
              <FaUndo /> Clear All Filters
            </Button>
          </div>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AdvancedFilterPanel;