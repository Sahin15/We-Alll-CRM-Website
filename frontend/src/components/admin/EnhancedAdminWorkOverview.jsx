import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Badge, 
  Alert,
  Form,
  Modal,
  Spinner,
  OverlayTrigger,
  Tooltip,
  ButtonGroup
} from 'react-bootstrap';
import { 
  FaFilter, 
  FaChartBar, 
  FaDownload, 
  FaSync,
  FaUser,
  FaUsers,
  FaProjectDiagram,
  FaBuilding,
  FaClock,
  FaExclamationTriangle,
  FaSearch,
  FaQuestion,
  FaCheckCircle,
  FaTable,
  FaCalendarAlt,
  FaChartLine,
  FaPlus,
  // Priority icons
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  // Work type icons
  FaTasks,
  FaPen,
  FaBug,
  FaStar,
  FaCode,
  FaDesktop,
  FaMobile,
  FaPalette,
  FaFileAlt,
  FaCog,
  // Quick action icons
  FaPlay,
  FaPause,
  FaCheck,
  FaComment,
  FaEdit,
  FaTrash
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import departmentApi from '../../api/departmentApi';
import projectApi from '../../api/projectApi';
import clientApi from '../../api/clientApi';
import { userApi } from '../../api/userApi';
import EnhancedDataTable from './EnhancedDataTable';
import VirtualizedDataTable from './VirtualizedDataTable';
import AdvancedFilterPanel from './AdvancedFilterPanel';
import RealTimeAnalytics from './RealTimeAnalytics';
import EnhancedExportPanel from './EnhancedExportPanel';
import ProfessionalWorkCreationModal from '../work/ProfessionalWorkCreationModal';
import WorkItemCommentModal from '../work/WorkItemCommentModal';
import WorkItemDetailsModal from '../workitems/WorkItemDetailsModal';

import useAdvancedSearch from '../../hooks/useAdvancedSearch';
import './EnhancedAdminWorkOverview.css';
import './WorkItemEnhancements.css';

/**
 * Enhanced Admin Work Overview Component
 * Professional work progress tracking interface with client-focused filtering
 * Features:
 * - Client-focused filtering (most important feature)
 * - Professional data table for tracking work progress
 * - Real-time analytics dashboard
 * - Advanced filtering with custom criteria
 * - Quick date filters (Today, Yesterday, This Week, etc.)
 * - Multi-format export (CSV, Excel, PDF)
 * - Mobile-responsive design
 * - View-only interface for work progress monitoring
 */
const EnhancedAdminWorkOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [workData, setWorkData] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [slotAnalytics, setSlotAnalytics] = useState(null);
  const [filterOptions, setFilterOptions] = useState({});
  const [error, setError] = useState(null);
  const [useVirtualization, setUseVirtualization] = useState(false);
  
  // Filter and pagination state - Show TODAY's work items by default
  const [filters, setFilters] = useState({
    dueDate: moment().format('YYYY-MM-DD'), // Default to today's work in proper format
    client: 'all',
    project: 'all',
    employee: 'all',
    department: 'all',
    status: 'all',
    priority: 'all',
    workType: 'all',
    company: 'all', // We All or Kolkata Digital
    search: '',
    vipOnly: false,
    customFilters: [],
    // Slot-related filters
    slotNumber: '',
    hasSlotAssignment: 'all', // all, assigned, unassigned
    slotRangeFrom: '',
    slotRangeTo: '',
    projectSlotUtilization: 'all', // all, high, medium, low, empty
    slotSearch: ''
  });
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'startDate',
    sortOrder: 'desc'
  });
  
  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showCreateWorkModal, setShowCreateWorkModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Employee and Client detail modals
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [employeeWorkData, setEmployeeWorkData] = useState([]);
  const [clientWorkData, setClientWorkData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Slot-related UI state - Slots are always visible now
  const showSlotColumns = true; // Always show slots
  
  // View mode state for unified dashboard
  const [viewMode, setViewMode] = useState('table'); // 'table', 'calendar', 'analytics', 'client-work'

  // Bulk operation loading state
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);

  // Handle filter changes
  const handleFilterChange = useCallback((filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  }, []);

  // Advanced search hook
  const {
    searchTerm,
    handleSearchChange,
    clearSearch,
    filterSuggestions,
    getSearchSuggestions,
    validateFilterCombination,
    isSearching
  } = useAdvancedSearch({
    initialFilters: filters,
    onFilterChange: handleFilterChange,
    filterOptions,
    debounceDelay: 300
  });

  // Check admin access
  const hasAdminAccess = ['admin', 'superadmin', 'hr', 'manager'].includes(user?.role);
  
  // Set document title
  useEffect(() => {
    document.title = 'Work Management Dashboard - Admin Panel';
    return () => {
      document.title = 'Admin Dashboard';
    };
  }, []);

  // Priority icons mapping
  const priorityIcons = {
    urgent: <FaExclamationTriangle className="text-danger" title="Urgent" />,
    high: <FaArrowUp className="text-warning" title="High Priority" />,
    medium: <FaMinus className="text-info" title="Medium Priority" />,
    low: <FaArrowDown className="text-secondary" title="Low Priority" />
  };

  // Work type icons mapping
  const workTypeIcons = {
    task: <FaTasks className="text-primary" title="Task" />,
    content: <FaPen className="text-success" title="Content" />,
    bug: <FaBug className="text-danger" title="Bug Fix" />,
    feature: <FaStar className="text-warning" title="Feature" />,
    development: <FaCode className="text-info" title="Development" />,
    design: <FaPalette className="text-purple" title="Design" />,
    testing: <FaCheckCircle className="text-success" title="Testing" />,
    documentation: <FaFileAlt className="text-secondary" title="Documentation" />,
    maintenance: <FaCog className="text-muted" title="Maintenance" />,
    mobile: <FaMobile className="text-primary" title="Mobile" />,
    web: <FaDesktop className="text-info" title="Web" />
  };

  // Quick action buttons configuration
  const quickActions = [
    { 
      id: 'start', 
      icon: FaPlay, 
      tooltip: 'Start Work', 
      variant: 'success',
      condition: (item) => item.status === 'scheduled' || item.status === 'To Do'
    },
    { 
      id: 'pause', 
      icon: FaPause, 
      tooltip: 'Pause Work', 
      variant: 'warning',
      condition: (item) => item.status === 'in-progress' || item.status === 'In Progress'
    },
    { 
      id: 'complete', 
      icon: FaCheck, 
      tooltip: 'Mark Complete', 
      variant: 'success',
      condition: (item) => item.status !== 'completed' && item.status !== 'Done'
    },
    { 
      id: 'comment', 
      icon: FaComment, 
      tooltip: 'Add Comment', 
      variant: 'info',
      condition: () => true // Always show
    },
    { 
      id: 'edit', 
      icon: FaEdit, 
      tooltip: 'Edit Work Item', 
      variant: 'primary',
      condition: () => true // Always show
    }
  ];

  // Handle row editing - PHASE 2: Use WorkItem API directly
  const handleRowEdit = useCallback(async (rowId, columnKey, newValue) => {
    try {
      const updateData = { [columnKey]: newValue };
      
      // Use WorkItem API instead of WorkCalendar API
      const workItemApi = (await import('../../api/workItemApi')).default;
      const response = await workItemApi.updateWorkItem(rowId, updateData);
      
      if (response.success) {
        // Update local state instead of reloading
        setWorkData(prevData => 
          prevData.map(item => 
            item._id === rowId 
              ? { ...item, [columnKey]: newValue }
              : item
          )
        );
        toast.success('Work item updated successfully');
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error) {
      console.error('Row edit error:', error);
      toast.error(error.message || 'Failed to update work item');
    }
  }, []);

  // Handle quick actions - PHASE 2: Use WorkItem API directly
  const handleQuickAction = useCallback(async (action, workItemId, workItem) => {
    try {
      const workItemApi = (await import('../../api/workItemApi')).default;
      
      switch (action) {
        case 'start':
          await workItemApi.updateStatus(workItemId, 'In Progress');
          toast.success('Work started!');
          break;
        case 'pause':
          await workItemApi.updateStatus(workItemId, 'To Do');
          toast.success('Work paused');
          break;
        case 'complete':
          await workItemApi.updateStatus(workItemId, 'Done');
          toast.success('Work completed!');
          break;
        case 'comment':
          setSelectedWorkItem(workItem);
          setShowCommentModal(true);
          break;
        case 'edit':
          setSelectedWorkItem(workItem);
          setShowEditModal(true);
          break;
        default:
          // Unknown action - silently ignore
      }
      
      // Refresh data after status change
      if (['start', 'pause', 'complete'].includes(action)) {
        // Use window.location.reload() for now to avoid dependency issues
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      console.error('Quick action error:', error);
      toast.error(`Failed to ${action} work item`);
    }
  }, []); // Remove loadWorkData dependency to fix hoisting issue

  // Handle employee click - show all work assigned to employee
  const handleEmployeeClick = useCallback(async (employee) => {
    if (!employee || !employee._id) return;
    
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
    setModalLoading(true);
    
    try {
      // Fetch all work items assigned to this employee
      const workItemApi = (await import('../../api/workItemApi')).default;
      const response = await workItemApi.getAllWorkItems({ assignedTo: employee._id });
      
      if (response && response.data) {
        setEmployeeWorkData(response.data);
      } else {
        setEmployeeWorkData([]);
      }
    } catch (error) {
      console.error('Error fetching employee work:', error);
      toast.error('Failed to load employee work data');
      setEmployeeWorkData([]);
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Handle client click - show all work for client
  const handleClientClick = useCallback(async (client) => {
    if (!client || !client._id) return;
    
    setSelectedClient(client);
    setShowClientModal(true);
    setModalLoading(true);
    
    try {
      // Fetch all work items for this client
      const workItemApi = (await import('../../api/workItemApi')).default;
      const response = await workItemApi.getAllWorkItems({ client: client._id });
      
      if (response && response.data) {
        setClientWorkData(response.data);
      } else {
        setClientWorkData([]);
      }
    } catch (error) {
      console.error('Error fetching client work:', error);
      toast.error('Failed to load client work data');
      setClientWorkData([]);
    } finally {
      setModalLoading(false);
    }
  }, []);

  // Handle work item title click - open details modal
  const handleWorkItemClick = useCallback(async (workItem) => {
    try {
      // Fetch full work item details including comments
      const workItemApi = (await import('../../api/workItemApi')).default;
      const response = await workItemApi.getWorkItemById(workItem._id);
      setSelectedWorkItem(response.data || response);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading work item details:', error);
      toast.error('Failed to load work item details');
    }
  }, []);

  // Status color mapping for better visual indicators
  const statusColors = {
    'To Do': 'secondary',
    'scheduled': 'secondary',
    'In Progress': 'primary',
    'in-progress': 'primary',
    'Review': 'warning',
    'review': 'warning',
    'Done': 'success',
    'completed': 'success',
    'Overdue': 'danger',
    'overdue': 'danger',
    'Cancelled': 'dark',
    'cancelled': 'dark'
  };

  // Priority color mapping
  const priorityColors = {
    'urgent': 'danger',
    'high': 'warning', 
    'medium': 'info',
    'low': 'secondary'
  };

  // Due date status helper
  const getDueDateStatus = useCallback((dueDate, status) => {
    if (status === 'completed' || status === 'Done') {
      return { status: 'completed', color: 'success', text: 'Completed' };
    }
    
    const days = moment(dueDate).diff(moment(), 'days');
    const hours = moment(dueDate).diff(moment(), 'hours');
    
    if (days < 0) return { status: 'overdue', color: 'danger', text: `${Math.abs(days)} days overdue` };
    if (hours <= 24) return { status: 'due-soon', color: 'warning', text: hours <= 1 ? 'Due in 1 hour' : `Due in ${hours} hours` };
    if (days <= 3) return { status: 'upcoming', color: 'info', text: `Due in ${days} days` };
    return { status: 'on-track', color: 'success', text: `${days} days left` };
  }, []);

  // Table columns configuration - SIMPLIFIED to show only essential data
  const tableColumns = useMemo(() => [
    {
      key: 'title',
      title: 'Work Title',
      sortable: true,
      filterable: true,
      minWidth: '250px',
      editable: true,
      render: (value, row) => {
        return (
          <span
            className="text-dark"
            style={{ 
              textDecoration: 'underline', 
              cursor: 'pointer',
              fontSize: 'inherit',
              fontWeight: '500'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleWorkItemClick(row);
            }}
            title="Click to view details, comments, and activity timeline"
          >
            {value || 'Untitled'}
          </span>
        );
      }
    },
    {
      key: 'client.name',
      title: 'Client',
      sortable: true,
      filterable: true,
      minWidth: '150px',
      type: 'badge',
      badgeMap: {},
      className: 'client-name',
      editable: false,
      render: (value, row) => {
        if (!row.client || !row.client.name) {
          return <span className="text-muted">No Client</span>;
        }
        
        return (
          <span
            className="text-dark"
            style={{ 
              textDecoration: 'underline', 
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleClientClick(row.client);
            }}
            title={`View all work for ${row.client.name}`}
          >
            {row.client.name}
          </span>
        );
      }
    },
    {
      key: 'project.name',
      title: 'Project',
      sortable: true,
      filterable: true,
      minWidth: '150px',
      editable: false,
      render: (value, row) => {
        if (!row.project || !row.project.name) {
          return <span className="text-muted">No Project</span>;
        }
        
        return (
          <span
            className="text-dark"
            style={{ 
              textDecoration: 'underline', 
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (row.project._id) {
                navigate(`/projects/${row.project._id}`);
              }
            }}
            title={`Open project: ${row.project.name}`}
          >
            {row.project.name}
          </span>
        );
      }
    },
    {
      key: 'slotAssignment.slotNumber',
      title: 'Slot #',
      sortable: true,
      filterable: true,
      type: 'slot-number-display',
      minWidth: '80px',
      editable: false,
      slotColumn: true,
      tooltip: 'Project slot number assigned to this work item'
    },
    {
      key: 'assignedTo.name',
      title: 'Assigned To',
      sortable: true,
      filterable: true,
      minWidth: '140px',
      editable: false,
      render: (value, row) => {
        if (!row.assignedTo || !row.assignedTo.name) {
          return <span className="text-muted">Unassigned</span>;
        }
        
        return (
          <span
            className="text-dark"
            style={{ 
              textDecoration: 'underline', 
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleEmployeeClick(row.assignedTo);
            }}
            title={`View all work assigned to ${row.assignedTo.name}`}
          >
            {row.assignedTo.name}
          </span>
        );
      }
    },
    {
      key: 'createdBy.name',
      title: 'Assigned By',
      sortable: true,
      filterable: true,
      minWidth: '140px',
      editable: false,
      render: (value, row) => {
        if (!row.createdBy || !row.createdBy.name) {
          return <span className="text-muted">Unknown</span>;
        }
        
        return (
          <span
            className="text-dark"
            style={{ 
              textDecoration: 'underline', 
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleEmployeeClick(row.createdBy);
            }}
            title={`View all work assigned by ${row.createdBy.name}`}
          >
            {row.createdBy.name}
          </span>
        );
      }
    },
    {
      key: 'departmentName',
      title: 'Department',
      sortable: true,
      filterable: true,
      minWidth: '120px',
      editable: false,
      render: (value, row) => {
        // Robust department name rendering
        let deptName = 'No Department';
        
        // Try departmentName first (from our transformation)
        if (row.departmentName && typeof row.departmentName === 'string') {
          deptName = row.departmentName;
        }
        // Fallback to department object
        else if (row.department && typeof row.department === 'object' && row.department.name) {
          deptName = String(row.department.name);
        }
        // Last resort fallback
        else if (row.department && typeof row.department === 'string') {
          deptName = 'Unpopulated Department';
        }
        
        return deptName;
      }
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      filterable: true,
      type: 'select',
      selectOptions: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      badgeMap: {
        'scheduled': 'Scheduled',
        'in-progress': 'In Progress', 
        'completed': 'Completed',
        'overdue': 'Overdue',
        'cancelled': 'Cancelled'
      },
      statusColors: statusColors,
      minWidth: '120px',
      editable: true
    },
    {
      key: 'priority',
      title: 'Priority',
      sortable: true,
      filterable: true,
      type: 'select',
      selectOptions: [
        { value: 'urgent', label: 'Urgent' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' }
      ],
      badgeMap: {
        'urgent': 'Urgent',
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low'
      },
      priorityColors: priorityColors,
      minWidth: '100px',
      editable: true
    },
    {
      key: 'dueDate',
      title: 'Due Date',
      sortable: true,
      filterable: true,
      type: 'date',
      minWidth: '120px',
      render: (value, row) => {
        if (!row.dueDate) return 'No due date';
        
        const dueDate = moment(row.dueDate);
        const now = moment();
        const isOverdue = dueDate.isBefore(now, 'day');
        const isDueToday = dueDate.isSame(now, 'day');
        const isDueTomorrow = dueDate.isSame(moment().add(1, 'day'), 'day');
        
        let className = '';
        let prefix = '';
        
        if (isOverdue) {
          className = 'text-danger fw-bold';
          prefix = '⚠️ ';
        } else if (isDueToday) {
          className = 'text-warning fw-bold';
          prefix = '🔥 ';
        } else if (isDueTomorrow) {
          className = 'text-info fw-bold';
          prefix = '📅 ';
        }
        
        return (
          <span className={className}>
            {prefix}{dueDate.format('MMM DD, YYYY')}
          </span>
        );
      }
    }
  ], [statusColors, priorityColors]); // Updated dependencies

  // Filter table columns based on slot visibility
  const filteredTableColumns = useMemo(() => {
    if (showSlotColumns) {
      return tableColumns;
    } else {
      return tableColumns.filter(column => !column.slotColumn);
    }
  }, [tableColumns, showSlotColumns]);

  // Load initial data
  useEffect(() => {
    if (hasAdminAccess) {
      loadFilterOptions();
    }
  }, [hasAdminAccess]);

  // Reload data when filters change (with debouncing to prevent excessive calls)
  useEffect(() => {
    if (hasAdminAccess) {
      const timeoutId = setTimeout(() => {
        loadWorkData();
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [
    hasAdminAccess,
    filters.dueDate,
    filters.client,
    filters.project,
    filters.employee,
    filters.department,
    filters.status,
    filters.priority,
    filters.workType,
    filters.search,
    filters.vipOnly,
    filters.company,
    // Slot-related filters
    filters.slotNumber,
    filters.hasSlotAssignment,
    filters.slotRangeFrom,
    filters.slotRangeTo,
    filters.projectSlotUtilization,
    filters.slotSearch,
    pagination.currentPage,
    pagination.pageSize,
    sortConfig.sortBy,
    sortConfig.sortOrder
  ]);

  // Load filter options for dropdowns
  const loadFilterOptions = async () => {
    try {
      const [clients, projects, employees, departments] = await Promise.all([
        clientApi.getAllClients(),
        projectApi.getAllProjects(),
        userApi.getAllUsers(),
        departmentApi.getAllDepartments()
      ]);

      setFilterOptions({
        clients: Array.isArray(clients) ? clients : clients.data || [],
        projects: Array.isArray(projects) ? projects : projects.data || [],
        employees: (Array.isArray(employees) ? employees : employees.data || [])
          .filter(emp => ['employee', 'hod', 'manager'].includes(emp.role)),
        departments: Array.isArray(departments) ? departments : departments.data || []
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
      toast.error('Failed to load filter options');
    }
  };

  // Simple status mapping function
  const mapWorkItemStatus = (workItemStatus) => {
    const statusMap = {
      'To Do': 'scheduled',
      'In Progress': 'in-progress', 
      'Review': 'in-progress',
      'Done': 'completed'
    };
    return statusMap[workItemStatus] || 'scheduled';
  };

  // SIMPLIFIED: Load work data directly from WorkItem API (Single Source of Truth)
  const loadWorkData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters for WorkItem API
      const queryParams = {};
      
      // SIMPLIFIED: Date filter using only dueDate
      if (filters.dueDate) {
        // Validate date format
        const dueDate = moment(filters.dueDate);
        if (!dueDate.isValid()) {
          throw new Error(`Invalid due date format: ${filters.dueDate}`);
        }
        queryParams.dueDate = dueDate.format('YYYY-MM-DD');
      }
      
      // Other filters
      if (filters.search) queryParams.search = filters.search;
      if (filters.status && filters.status !== 'all') queryParams.status = filters.status;
      if (filters.priority && filters.priority !== 'all') queryParams.priority = filters.priority;
      if (filters.project && filters.project !== 'all') queryParams.project = filters.project;
      if (filters.employee && filters.employee !== 'all') queryParams.assignedTo = filters.employee;
      if (filters.workType && filters.workType !== 'all') queryParams.type = filters.workType;
      
      // Direct API call to WorkItem API
      const workItemApi = (await import('../../api/workItemApi')).default;
      const response = await workItemApi.getAllWorkItems(queryParams);
      
      if (response && response.success && response.data) {
        // SIMPLIFIED: No client-side date filtering needed since backend handles it properly
        let filteredWorkItems = response.data;
        
        // Transform work items to display format (simplified)
        const transformedWorkItems = filteredWorkItems.map(workItem => {
          // Robust department extraction
          let departmentName = 'No Department';
          
          try {
            // Check multiple departments first (new structure)
            if (workItem.project?.departments && Array.isArray(workItem.project.departments) && workItem.project.departments.length > 0) {
              const dept = workItem.project.departments[0];
              if (dept && typeof dept === 'object' && dept.name) {
                departmentName = String(dept.name);
              } else if (dept && typeof dept === 'string') {
                // If it's a string (ObjectId), it means population failed
                departmentName = 'Unpopulated Department';
              }
            } 
            // Check single department (legacy structure)
            else if (workItem.project?.department) {
              const dept = workItem.project.department;
              if (dept && typeof dept === 'object' && dept.name) {
                departmentName = String(dept.name);
              } else if (dept && typeof dept === 'string') {
                // If it's a string (ObjectId), it means population failed
                departmentName = 'Unpopulated Department';
              }
            }
            
            // Ensure departmentName is always a string
            if (typeof departmentName !== 'string') {
              departmentName = 'Invalid Department';
            }
          } catch (error) {
            console.error('Error extracting department name:', error);
            departmentName = 'Department Error';
          }
          
          return {
            _id: workItem._id,
            title: workItem.title,
            description: workItem.description,
            workType: 'work-item',
            assignedTo: workItem.assignedTo,
            department: workItem.project?.department || workItem.project?.departments?.[0],
            departmentName: departmentName,
            project: workItem.project,
            client: workItem.project?.client,
            startDate: workItem.dueDate,
            endDate: workItem.dueDate,
            dueDate: workItem.dueDate,
            isAllDay: true,
            status: mapWorkItemStatus(workItem.status),
            priority: workItem.priority || 'medium',
            timeTracking: {
              estimatedHours: workItem.estimatedHours || 8,
              actualHours: workItem.actualHours || 0
            },
            createdBy: workItem.createdBy,
            tags: workItem.tags || [],
            createdAt: workItem.createdAt,
            updatedAt: workItem.updatedAt,
            // Additional fields
            type: workItem.type,
            platform: workItem.platform,
            postType: workItem.postType,
            contentBucket: workItem.contentBucket,
            // CRITICAL: Include slot assignment data
            slotAssignment: workItem.slotAssignment
          };
        });
        
        // IMPORTANT: Enhance work items with slot data before setting
        const enhancedWorkItems = enhanceWorkEntriesWithSlotData(transformedWorkItems);
        
        // Set data with slot enhancements
        setWorkData(enhancedWorkItems);
        
        // Set pagination
        setPagination({
          currentPage: 1,
          pageSize: pagination.pageSize,
          totalCount: transformedWorkItems.length,
          totalPages: Math.ceil(transformedWorkItems.length / pagination.pageSize),
          hasNextPage: false,
          hasPrevPage: false
        });
        
        // Generate analytics
        const analytics = {
          overall: { 
            totalWork: transformedWorkItems.length, 
            completedWork: transformedWorkItems.filter(item => item.status === 'completed').length,
            inProgressWork: transformedWorkItems.filter(item => item.status === 'in-progress').length,
            overdueWork: transformedWorkItems.filter(item => {
              const today = new Date();
              const dueDate = new Date(item.dueDate);
              return dueDate < today && item.status !== 'completed';
            }).length
          },
          byClient: [],
          byProject: [],
          byEmployee: [],
          byDepartment: []
        };
        
        if (showAnalytics) {
          setAnalytics(analytics);
        }
        
      } else {
        setWorkData([]);
        setPagination({
          currentPage: 1,
          pageSize: pagination.pageSize,
          totalCount: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        });
      }
      
    } catch (error) {
      console.error('Error loading work items:', error);
      
      const errorMessage = error.response?.status === 400 
        ? `Invalid request: ${error.response?.data?.error?.message || error.message}`
        : error.response?.status === 403
        ? 'Access denied. You do not have permission to view work items.'
        : error.response?.status === 500
        ? 'Server error. Please try again later or contact support.'
        : error.message || 'Failed to load work items. Please try again later.';
        
      setError(errorMessage);
      toast.error(errorMessage);
      setWorkData([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.pageSize, showAnalytics, hasAdminAccess]); // Add dependencies

  // Enhance work entries with slot data
  const enhanceWorkEntriesWithSlotData = useCallback((workEntries) => {
    return workEntries.map(entry => {
      // Add slot assignment data if available
      const slotAssignment = {
        slotNumber: entry.slotAssignment?.slotNumber || null,
        assignedSlot: entry.slotAssignment?.assignedSlot || null
      };

      return {
        ...entry,
        slotAssignment,
        // Add computed slot-related fields for filtering and display
        hasSlotAssignment: slotAssignment.slotNumber ? 'assigned' : 'unassigned'
      };
    });
  }, []);



  // Handle sorting
  const handleSort = useCallback((columnKey, direction) => {
    setSortConfig({
      sortBy: columnKey,
      sortOrder: direction
    });
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize, 
      currentPage: 1 
    }));
  }, []);

  // Handle bulk operations - PHASE 2: Use WorkItem API directly
  const handleBulkOperation = useCallback(async (operation, selectedIds, data) => {
    try {
      setBulkOperationLoading(true);
      
      const workItemApi = (await import('../../api/workItemApi')).default;
      const response = await workItemApi.bulkUpdate({
        workItemIds: selectedIds,
        updates: data
      });

      if (response.success) {
        toast.success(response.message || 'Bulk operation completed successfully');
        // Use window.location.reload() for now to avoid dependency issues
        setTimeout(() => window.location.reload(), 500);
      } else {
        throw new Error(response.message || 'Bulk operation failed');
      }
    } catch (error) {
      console.error('Bulk operation error:', error);
      toast.error(error.message || 'Bulk operation failed');
    } finally {
      setBulkOperationLoading(false);
    }
  }, []); // Remove loadWorkData dependency to fix hoisting issue

  // Handle row deletion - PHASE 2: Use WorkItem API directly
  const handleRowDelete = useCallback(async (rowId) => {
    if (window.confirm('Are you sure you want to delete this work item?')) {
      try {
        const workItemApi = (await import('../../api/workItemApi')).default;
        const response = await workItemApi.deleteWorkItem(rowId);
        
        if (response.success) {
          toast.success('Work item deleted successfully');
          // Use window.location.reload() for now to avoid dependency issues
          setTimeout(() => window.location.reload(), 500);
        } else {
          throw new Error(response.message || 'Delete failed');
        }
      } catch (error) {
        console.error('Row delete error:', error);
        toast.error(error.message || 'Failed to delete work item');
      }
    }
  }, []); // Remove loadWorkData dependency to fix hoisting issue

  // Handle export - now opens the enhanced export panel
  const handleExport = useCallback(() => {
    setShowExportPanel(true);
  }, []);

  // PHASE 2: Slot operations removed - slots are now managed directly through WorkItem API
  // These functions are no longer needed as slot assignment is handled in work item creation/editing



  // Helper function to map work item status to calendar status
  const mapWorkItemStatusToCalendarStatus = (workItemStatus) => {
    const statusMap = {
      'To Do': 'scheduled',
      'In Progress': 'in-progress',
      'Review': 'in-progress',
      'Done': 'completed'
    };
    return statusMap[workItemStatus] || 'scheduled';
  };

  // PHASE 2: Diagnostic function removed - no longer needed in production



  // PHASE 2: Refresh handler removed - using loadWorkData directly

  // PHASE 2: Sync functionality removed - no longer needed since we use WorkItem API directly
  // Work items are now the single source of truth

  // Mock data generators for fallback
  const generateMockWorkData = () => [
    {
      _id: '1',
      title: 'Sample Work Entry 1',
      description: 'This is a sample work entry for demonstration',
      status: 'in-progress',
      priority: 'high',
      workType: 'development',
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      completionPercentage: 65,
      client: { _id: 'c1', name: 'Sample Client A', company: 'Tech Corp', isVip: true, vipLevel: 'gold' },
      project: { _id: 'p1', name: 'Sample Project Alpha' },
      assignedTo: { _id: user?.id || 'u1', name: 'John Doe', email: 'john@example.com' },
      department: { _id: 'd1', name: 'Development' },
      formattedStartDate: moment().format('DD/MM/YYYY'),
      formattedDueDate: moment().add(7, 'days').format('DD/MM/YYYY'),
      daysUntilDue: 7,
      isOverdue: false,
      workloadImpact: 'medium',
      timeTracking: { estimatedHours: 40, actualHours: 26 },
      updatedAt: new Date().toISOString()
    },
    {
      _id: '2',
      title: 'Urgent Marketing Campaign',
      description: 'High priority marketing campaign content',
      status: 'in-progress',
      priority: 'urgent',
      workType: 'content',
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Due in 2 hours
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      completionPercentage: 80,
      client: { _id: 'c2', name: 'Marketing Client', company: 'Brand Co', isVip: true, vipLevel: 'platinum' },
      project: { _id: 'p2', name: 'Q1 Marketing Push' },
      assignedTo: { _id: 'u2', name: 'Jane Smith', email: 'jane@example.com' },
      department: { _id: 'd2', name: 'Marketing' },
      formattedStartDate: moment().subtract(2, 'days').format('DD/MM/YYYY'),
      formattedDueDate: moment().add(2, 'hours').format('DD/MM/YYYY HH:mm'),
      daysUntilDue: 0,
      isOverdue: false,
      workloadImpact: 'high',
      timeTracking: { estimatedHours: 8, actualHours: 6 },
      updatedAt: new Date().toISOString()
    },
    {
      _id: '3',
      title: 'Overdue Website Fix',
      description: 'Critical website bug that needs immediate attention',
      status: 'in-progress',
      priority: 'urgent',
      workType: 'bug-fix',
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Overdue by 1 day
      endDate: null,
      completionPercentage: 30,
      client: { _id: 'c3', name: 'Tech Startup', company: 'StartupCo', isVip: false, vipLevel: 'standard' },
      project: { _id: 'p3', name: 'Website Maintenance' },
      assignedTo: { _id: user?.id || 'u1', name: 'John Doe', email: 'john@example.com' },
      department: { _id: 'd1', name: 'Development' },
      formattedStartDate: moment().subtract(5, 'days').format('DD/MM/YYYY'),
      formattedDueDate: moment().subtract(1, 'day').format('DD/MM/YYYY'),
      daysUntilDue: -1,
      isOverdue: true,
      workloadImpact: 'high',
      timeTracking: { estimatedHours: 16, actualHours: 5 },
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // Updated 6 hours ago
    },
    {
      _id: '4',
      title: 'Completed Design Task',
      description: 'Logo design for new client',
      status: 'completed',
      priority: 'medium',
      workType: 'design',
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Completed 2 hours ago
      completionPercentage: 100,
      client: { _id: 'c4', name: 'Design Studio', company: 'Creative Inc', isVip: false, vipLevel: 'standard' },
      project: { _id: 'p4', name: 'Brand Identity Project' },
      assignedTo: { _id: 'u3', name: 'Alice Designer', email: 'alice@example.com' },
      department: { _id: 'd3', name: 'Design' },
      formattedStartDate: moment().subtract(3, 'days').format('DD/MM/YYYY'),
      formattedDueDate: moment().subtract(1, 'day').format('DD/MM/YYYY'),
      daysUntilDue: -1,
      isOverdue: false,
      workloadImpact: 'low',
      timeTracking: { estimatedHours: 12, actualHours: 10 },
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // Completed 2 hours ago
    },
    {
      _id: '5',
      title: 'Weekly Content Planning',
      description: 'Plan social media content for next week',
      status: 'scheduled',
      priority: 'medium',
      workType: 'content',
      startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Starts tomorrow
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Due in 5 days
      endDate: null,
      completionPercentage: 0,
      client: { _id: 'c5', name: 'Social Media Client', company: 'Influence Co', isVip: true, vipLevel: 'gold' },
      project: { _id: 'p5', name: 'Social Media Management' },
      assignedTo: { _id: 'u4', name: 'Bob Content', email: 'bob@example.com' },
      department: { _id: 'd4', name: 'Content' },
      formattedStartDate: moment().add(1, 'day').format('DD/MM/YYYY'),
      formattedDueDate: moment().add(5, 'days').format('DD/MM/YYYY'),
      daysUntilDue: 5,
      isOverdue: false,
      workloadImpact: 'medium',
      timeTracking: { estimatedHours: 6, actualHours: 0 },
      updatedAt: new Date().toISOString()
    }
  ];

  const generateMockAnalytics = () => ({
    overall: {
      totalWork: 5,
      completedWork: 1,
      inProgressWork: 3,
      overdueWork: 1,
      totalEstimatedHours: 82,
      totalActualHours: 41
    },
    byClient: [
      { clientName: '⭐ Tech Corp (VIP)', totalWork: 1, completedWork: 0, overdueWork: 0, isVip: true, vipLevel: 'gold' },
      { clientName: '⭐ Brand Co (VIP)', totalWork: 1, completedWork: 0, overdueWork: 0, isVip: true, vipLevel: 'platinum' },
      { clientName: 'StartupCo', totalWork: 1, completedWork: 0, overdueWork: 1, isVip: false },
      { clientName: 'Creative Inc', totalWork: 1, completedWork: 1, overdueWork: 0, isVip: false },
      { clientName: '⭐ Influence Co (VIP)', totalWork: 1, completedWork: 0, overdueWork: 0, isVip: true, vipLevel: 'gold' }
    ],
    byProject: [
      { projectName: 'Sample Project Alpha', totalWork: 1, completedWork: 0, overdueWork: 0 },
      { projectName: 'Q1 Marketing Push', totalWork: 1, completedWork: 0, overdueWork: 0 },
      { projectName: 'Website Maintenance', totalWork: 1, completedWork: 0, overdueWork: 1 },
      { projectName: 'Brand Identity Project', totalWork: 1, completedWork: 1, overdueWork: 0 },
      { projectName: 'Social Media Management', totalWork: 1, completedWork: 0, overdueWork: 0 }
    ],
    byEmployee: [
      { employeeName: 'John Doe', totalWork: 2, completedWork: 0, avgProgress: 47.5 },
      { employeeName: 'Jane Smith', totalWork: 1, completedWork: 0, avgProgress: 80 },
      { employeeName: 'Alice Designer', totalWork: 1, completedWork: 1, avgProgress: 100 },
      { employeeName: 'Bob Content', totalWork: 1, completedWork: 0, avgProgress: 0 }
    ],
    byDepartment: [
      { departmentName: 'Development', totalWork: 2, completedWork: 0, totalHours: 56 },
      { departmentName: 'Marketing', totalWork: 1, completedWork: 0, totalHours: 8 },
      { departmentName: 'Design', totalWork: 1, completedWork: 1, totalHours: 12 },
      { departmentName: 'Content', totalWork: 1, completedWork: 0, totalHours: 6 }
    ],
    workloadByPriority: {
      urgent: 2,
      high: 1,
      medium: 2,
      low: 0
    }
  });

  // Quick filter presets
  const quickFilters = useMemo(() => [
    { 
      id: 'my-work',
      label: 'My Work', 
      icon: '👤',
      filter: { employee: user?.id },
      description: 'Work items assigned to me'
    },
    { 
      id: 'due-today',
      label: 'Due Today', 
      icon: '📅',
      filter: { 
        dueDate: moment().format('YYYY-MM-DD')
      },
      description: 'Work items due today'
    },
    { 
      id: 'overdue',
      label: 'Overdue', 
      icon: '⚠️',
      filter: { status: 'overdue' },
      description: 'Overdue work items'
    },
    { 
      id: 'in-progress',
      label: 'In Progress', 
      icon: '🔄',
      filter: { status: 'in-progress' },
      description: 'Currently active work items'
    },
    { 
      id: 'high-priority',
      label: 'High Priority', 
      icon: '🔥',
      filter: { priority: 'high' },
      description: 'High priority work items'
    },
    { 
      id: 'urgent',
      label: 'Urgent', 
      icon: '🚨',
      filter: { priority: 'urgent' },
      description: 'Urgent work items'
    }
  ], [user?.id]);

  // Apply quick filter
  const applyQuickFilter = useCallback((quickFilter) => {
    // Apply the filter
    Object.keys(quickFilter.filter).forEach(key => {
      handleFilterChange(key, quickFilter.filter[key]);
    });
    
    // Show feedback
    toast.info(`Applied filter: ${quickFilter.label}`);
  }, [handleFilterChange]);

  // Check if a quick filter is currently active
  const isQuickFilterActive = useCallback((quickFilter) => {
    return Object.keys(quickFilter.filter).every(key => {
      const filterValue = quickFilter.filter[key];
      const currentValue = filters[key];
      return currentValue === filterValue;
    });
  }, [filters]);

  // Simple dashboard metrics
  const dashboardMetrics = useMemo(() => {
    if (!workData || workData.length === 0) {
      return {
        totalWork: 0,
        completedToday: 0,
        overdueCount: 0,
        myWorkCount: 0,
        inProgressCount: 0,
        dueThisWeek: 0
      };
    }

    const today = moment();
    const startOfWeek = moment().startOf('week');
    const endOfWeek = moment().endOf('week');

    return {
      totalWork: workData.length,
      completedToday: workData.filter(item => 
        (item.status === 'completed' || item.status === 'Done') && 
        moment(item.updatedAt).isSame(today, 'day')
      ).length,
      overdueCount: workData.filter(item => 
        moment(item.dueDate).isBefore(today) && 
        item.status !== 'completed' && 
        item.status !== 'Done'
      ).length,
      myWorkCount: workData.filter(item => 
        item.assignedTo?._id === user?.id || item.assignedTo?.id === user?.id
      ).length,
      inProgressCount: workData.filter(item => 
        item.status === 'in-progress' || item.status === 'In Progress'
      ).length,
      dueThisWeek: workData.filter(item => 
        moment(item.dueDate).isBetween(startOfWeek, endOfWeek, 'day', '[]') &&
        item.status !== 'completed' && 
        item.status !== 'Done'
      ).length
    };
  }, [workData, user?.id]);

  // Clear all filters - Reset to today
  const clearAllFilters = useCallback(() => {
    setFilters({
      dueDate: '', // Empty = show all work items
      client: 'all',
      project: 'all',
      employee: 'all',
      department: 'all',
      status: 'all',
      priority: 'all',
      workType: 'all',
      company: 'all',
      search: '',
      vipOnly: false,
      customFilters: [],
      // Slot-related filters
      slotNumber: '',
      hasSlotAssignment: 'all',
      slotRangeFrom: '',
      slotRangeTo: '',
      projectSlotUtilization: 'all',
      slotSearch: ''
    });
  }, []);

  if (!hasAdminAccess) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have permission to access the enhanced admin work overview. This feature is only available to administrators, HR, and managers.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container 
      fluid 
      className="enhanced-admin-work-overview"
      style={{ 
        backgroundColor: '#f8f9fa', 
        color: '#212529',
        minHeight: '100vh'
      }}
    >
      {/* Header */}
      <Row className="mb-4">
        <Col>
          {/* Title and Description */}
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h2 className="mb-1">Work Management Dashboard</h2>
              <p className="text-muted mb-0">
                Professional work progress tracking and management system
              </p>
            </div>
            
            {/* Status Badge */}
            <div className="d-flex align-items-center gap-2">
              <Badge bg={workData.length > 0 ? "success" : "warning"} className="d-flex align-items-center gap-1">
                <FaCheckCircle size={10} />
                {workData.length > 0 ? `${workData.length} Entries` : 'No Data'}
              </Badge>
              <small className="text-muted">
                Last updated: {new Date().toLocaleTimeString()}
              </small>
            </div>
          </div>

          {/* Controls Row */}
          <div className="header-controls d-flex justify-content-between align-items-center flex-wrap gap-3">
            {/* View Mode Toggle - Primary Control */}
            <div className="view-toggle-section d-flex align-items-center gap-2">
              <small className="text-muted fw-bold">View:</small>
              <ButtonGroup size="sm">
                <Button 
                  variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('table')}
                  className="d-flex align-items-center gap-1"
                >
                  <FaTable size={12} /> Table
                </Button>
                <Button 
                  variant={viewMode === 'calendar' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('calendar')}
                  className="d-flex align-items-center gap-1"
                >
                  <FaCalendarAlt size={12} /> Calendar
                </Button>
                <Button 
                  variant={viewMode === 'analytics' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('analytics')}
                  className="d-flex align-items-center gap-1"
                >
                  <FaChartLine size={12} /> Analytics
                </Button>
                <Button 
                  variant={viewMode === 'client-work' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('client-work')}
                  className="d-flex align-items-center gap-1"
                >
                  <FaBuilding size={12} /> Client Work
                </Button>
              </ButtonGroup>
            </div>

            {/* Action Buttons - Clean Production Interface */}
            <div className="action-buttons d-flex align-items-center gap-2">
              {/* Refresh Data Button */}
              <Button 
                variant="outline-info" 
                size="sm"
                onClick={() => loadWorkData()}
                disabled={loading}
                className="d-flex align-items-center gap-1"
                title="Refresh work items data"
              >
                <FaSync size={12} /> Refresh
              </Button>
              
              {/* Create Work Item Button */}
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => setShowCreateWorkModal(true)}
                className="d-flex align-items-center gap-1"
                title="Create new work item"
              >
                <FaPlus size={12} /> Create Work Item
              </Button>
              
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="d-flex align-items-center gap-1"
              >
                <FaFilter size={12} /> Filters
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Simple Dashboard Cards */}
      <Row className="mb-4">
        <Col md={2}>
          <Card className="border-0 shadow-sm h-100 dashboard-card">
            <Card.Body className="text-center">
              <div className="dashboard-metric text-primary mb-1">{dashboardMetrics.totalWork}</div>
              <small className="text-muted">Total Work Items</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="border-0 shadow-sm h-100 dashboard-card">
            <Card.Body className="text-center">
              <div className="dashboard-metric text-success mb-1">{dashboardMetrics.completedToday}</div>
              <small className="text-muted">Completed Today</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="border-0 shadow-sm h-100 dashboard-card">
            <Card.Body className="text-center">
              <div className="dashboard-metric text-danger mb-1">{dashboardMetrics.overdueCount}</div>
              <small className="text-muted">Overdue Items</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="border-0 shadow-sm h-100 dashboard-card">
            <Card.Body className="text-center">
              <div className="dashboard-metric text-info mb-1">{dashboardMetrics.myWorkCount}</div>
              <small className="text-muted">My Work Items</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="border-0 shadow-sm h-100 dashboard-card">
            <Card.Body className="text-center">
              <div className="dashboard-metric text-primary mb-1">{dashboardMetrics.inProgressCount}</div>
              <small className="text-muted">In Progress</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="border-0 shadow-sm h-100 dashboard-card">
            <Card.Body className="text-center">
              <div className="dashboard-metric text-warning mb-1">{dashboardMetrics.dueThisWeek}</div>
              <small className="text-muted">Due This Week</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Real-Time Analytics Dashboard */}
      {(viewMode === 'analytics' || (viewMode === 'table' && showAnalytics)) && analytics && (
        <RealTimeAnalytics 
          analytics={analytics}
          filters={filters}
          onFilterChange={handleFilterChange}
          slotAnalytics={slotAnalytics}
          showSlotAnalytics={slotAnalytics !== null}
        />
      )}

      {/* Advanced Filter Panel */}
      {showAdvancedFilters && (
        <AdvancedFilterPanel
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onClearFilters={clearAllFilters}
          onClose={() => setShowAdvancedFilters(false)}
        />
      )}

      {/* Quick Filter Buttons */}
      <Row className="mb-3">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-2">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted fw-bold me-3">Quick Filters:</small>
                  <div className="d-inline-flex flex-wrap gap-2">
                    {quickFilters.map((quickFilter) => (
                      <Button
                        key={quickFilter.id}
                        variant={isQuickFilterActive(quickFilter) ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => applyQuickFilter(quickFilter)}
                        className={`d-flex align-items-center gap-1 quick-filter-btn ${isQuickFilterActive(quickFilter) ? 'active' : ''}`}
                        title={quickFilter.description}
                      >
                        <span>{quickFilter.icon}</span>
                        <span className="d-none d-md-inline">{quickFilter.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={clearAllFilters}
                  title="Clear all filters and reset to today's work"
                >
                  Clear All
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Smart Search Bar */}
      <Row className="mb-3">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-2">
              <Row className="align-items-center">
                <Col lg={6} md={8}>
                  <div className="position-relative">
                    <Form.Control
                      type="text"
                      placeholder="🔍 Smart search: Try 'Client ABC', 'overdue work', or 'high priority'..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="border-primary"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                    <FaSearch 
                      className="position-absolute text-primary" 
                      style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    {isSearching && (
                      <Button
                        variant="link"
                        size="sm"
                        className="position-absolute text-muted"
                        style={{ right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}
                        onClick={clearSearch}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </Col>
                <Col lg={6} md={4}>
                  <div className="d-flex flex-wrap gap-1">
                    {filterSuggestions.slice(0, 3).map((suggestion, index) => (
                      <Button
                        key={suggestion.id}
                        variant="outline-primary"
                        size="sm"
                        onClick={suggestion.action}
                        className="d-flex align-items-center gap-1"
                      >
                        <span>{suggestion.icon}</span>
                        <span className="d-none d-md-inline">{suggestion.label}</span>
                      </Button>
                    ))}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content Area */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm" style={{ overflow: 'visible' }}>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">
                  {viewMode === 'table' && 'Work Progress Tracker'}
                  {viewMode === 'calendar' && 'Work Calendar View'}
                  {viewMode === 'analytics' && 'Work Analytics Dashboard'}
                </h5>
                <small className="text-muted">
                  {pagination.totalCount} total entries
                  {filters.client !== 'all' && ` • Filtered by client`}
                  {useVirtualization && ` • Virtualized for performance`}
                  {viewMode === 'calendar' && ` • Calendar view of all work items`}
                  {viewMode === 'analytics' && ` • Real-time analytics and insights`}
                  {viewMode === 'table' && (
                    <>
                      {' • '}
                      <span className="text-muted">
                        Work Progress Management • Scroll horizontally to see all columns
                      </span>
                    </>
                  )}
                </small>
              </div>
              
              {/* Quick Date Filters - Simplified to single date */}
              {viewMode === 'table' && (
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <small className="text-muted me-2" style={{ fontSize: '0.75rem', fontWeight: '500' }}>Due Date:</small>
                  <ButtonGroup size="sm">
                    <Button
                      variant={filters.dueDate === moment().format('YYYY-MM-DD') ? "primary" : "outline-primary"}
                      onClick={() => {
                        const today = moment().format('YYYY-MM-DD');
                        handleFilterChange('dueDate', today);
                      }}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Today
                    </Button>
                    <Button
                      variant={filters.dueDate === moment().subtract(1, 'day').format('YYYY-MM-DD') ? "primary" : "outline-secondary"}
                      onClick={() => {
                        const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
                        handleFilterChange('dueDate', yesterday);
                      }}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant={filters.dueDate === moment().add(1, 'day').format('YYYY-MM-DD') ? "primary" : "outline-info"}
                      onClick={() => {
                        const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
                        handleFilterChange('dueDate', tomorrow);
                      }}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Tomorrow
                    </Button>
                    <Button
                      variant="outline-warning"
                      onClick={() => {
                        handleFilterChange('dueDate', ''); // Clear date filter to show all
                      }}
                      style={{ fontSize: '0.75rem' }}
                    >
                      All Dates
                    </Button>
                  </ButtonGroup>
                  
                  {/* Single Date Input */}
                  <div className="d-flex gap-1 ms-2">
                    <Form.Control
                      type="date"
                      size="sm"
                      value={filters.dueDate}
                      onChange={(e) => handleFilterChange('dueDate', e.target.value)}
                      title="Due Date"
                      style={{ width: '130px', fontSize: '0.75rem' }}
                    />
                  </div>
                </div>
              )}
              
              <div className="d-flex align-items-center gap-2">
                {/* Performance Mode Toggle */}
                {pagination.totalCount > 500 && (
                  <Form.Check
                    type="switch"
                    id="virtualization-switch"
                    label="High Performance Mode"
                    checked={useVirtualization}
                    onChange={(e) => setUseVirtualization(e.target.checked)}
                    className="me-2"
                  />
                )}
                
                {exportLoading && (
                  <div className="d-flex align-items-center gap-2">
                    <Spinner size="sm" />
                    <span className="small">Exporting...</span>
                  </div>
                )}
              </div>
            </Card.Header>
            
            <Card.Body className="p-0" style={{ overflow: 'visible' }}>
              {/* Empty State - Enhanced with better guidance */}
              {viewMode === 'table' && workData.length === 0 && !loading && (
                <div className="p-5 text-center">
                  <FaCalendarAlt size={48} className="mb-3 text-muted" />
                  <h5 className="text-muted mb-2">No Work Items Found</h5>
                  <p className="text-muted mb-4">
                    No work items are due on the selected date.
                  </p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <Button 
                      variant="primary" 
                      onClick={() => setShowCreateWorkModal(true)}
                      className="d-flex align-items-center gap-2"
                    >
                      <FaPlus /> Create Work Item
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => {
                        const today = moment().format('YYYY-MM-DD');
                        handleFilterChange('dueDate', today);
                      }}
                    >
                      Show Today's Work
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => handleFilterChange('dueDate', '')}
                    >
                      Show All Dates
                    </Button>
                  </div>
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && workData.length > 0 && (
                <>
                  {useVirtualization ? (
                    <VirtualizedDataTable
                      data={workData}
                      columns={filteredTableColumns}
                      loading={loading}
                      error={error}
                      onSort={handleSort}
                      onBulkOperation={handleBulkOperation}
                      onExport={handleExport}
                      pagination={pagination}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      selectable={true}
                      editable={false}
                      exportable={true}
                      searchable={true}
                      className="full-width read-only"
                      emptyMessage="No work items due for selected dates. Try expanding the work date range or create new work items."
                      rowKey="_id"
                      filterOptions={filterOptions}
                      currentUser={user}
                      containerHeight={600}
                      itemHeight={60}
                    />
                  ) : (
                    <EnhancedDataTable
                      data={workData}
                      columns={filteredTableColumns}
                      loading={loading}
                      error={error}
                      onSort={handleSort}
                      onBulkOperation={handleBulkOperation}
                      onExport={handleExport}
                      pagination={pagination}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      selectable={true}
                      editable={false}
                      exportable={true}
                      searchable={true}
                      className="full-width read-only"
                      emptyMessage="No work items due for selected dates. Try expanding the work date range or create new work items."
                      rowKey="_id"
                      filterOptions={filterOptions}
                      currentUser={user}
                      // PHASE 2: Slot-related props removed
                      showSlotColumns={showSlotColumns}
                    />
                  )}
                </>
              )}

              {/* Calendar View */}
              {viewMode === 'calendar' && (
                <div className="p-4">
                  <Alert variant="info" className="text-center">
                    <FaCalendarAlt size={48} className="mb-3 d-block mx-auto" />
                    <h5>Calendar View Coming Soon</h5>
                    <p className="mb-0">
                      The calendar view is being integrated. For now, you can use the Table view for spreadsheet interface 
                      or Analytics view for insights and charts.
                    </p>
                    <div className="mt-3">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => setViewMode('table')}
                        className="me-2"
                      >
                        <FaTable /> Switch to Table View
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => setViewMode('analytics')}
                      >
                        <FaChartLine /> Switch to Analytics View
                      </Button>
                    </div>
                  </Alert>
                </div>
              )}

              {/* Analytics View */}
              {viewMode === 'analytics' && (
                <div className="p-4">
                  <Alert variant="success" className="text-center">
                    <FaChartLine size={48} className="mb-3 d-block mx-auto" />
                    <h5>Analytics Dashboard Active</h5>
                    <p className="mb-0">
                      You're viewing the analytics dashboard above. The charts and metrics provide 
                      real-time insights into work distribution, priorities, and performance.
                    </p>
                    <div className="mt-3">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => setViewMode('table')}
                        className="me-2"
                      >
                        <FaTable /> Switch to Table View
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => setViewMode('calendar')}
                      >
                        <FaCalendarAlt /> Switch to Calendar View
                      </Button>
                    </div>
                  </Alert>
                </div>
              )}

              {/* Client Work View */}
              {viewMode === 'client-work' && (
                <div className="p-4">
                  <Alert variant="info" className="text-center">
                    <FaBuilding size={48} className="mb-3 d-block mx-auto" />
                    <h5>Client Work Overview</h5>
                    <p className="mb-0">
                      View work organized by client. Select a client from the filter above to see 
                      all projects, work items, and slots completed for that client.
                    </p>
                    <div className="mt-3">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => setViewMode('table')}
                        className="me-2"
                      >
                        <FaTable /> Switch to Table View
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => setViewMode('analytics')}
                      >
                        <FaChartLine /> Switch to Analytics View
                      </Button>
                    </div>
                  </Alert>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Enhanced Export Panel */}
      <EnhancedExportPanel
        show={showExportPanel}
        onHide={() => setShowExportPanel(false)}
        filters={filters}
        workData={workData}
        columns={tableColumns}
        title="Export Work Management Data"
        slotAnalytics={slotAnalytics}
        showSlotColumns={slotAnalytics !== null}
      />

      {/* Loading Overlay */}
      {(bulkOperationLoading || exportLoading) && (
        <div className="loading-overlay">
          <div className="loading-content">
            <Spinner animation="border" />
            <p className="mt-2 mb-0">
              {bulkOperationLoading ? 'Processing bulk operation...' : 'Generating export...'}
            </p>
          </div>
        </div>
      )}

      {/* Work Item Comment Modal */}
      <WorkItemCommentModal
        show={showCommentModal}
        onHide={() => {
          setShowCommentModal(false);
          setSelectedWorkItem(null);
        }}
        workItem={selectedWorkItem}
        onCommentAdded={(comment) => {
          // Comment added successfully - could refresh data if needed
        }}
      />

      {/* Simple Edit Modal - For now, just show work item details */}
      {showEditModal && selectedWorkItem && (
        <Modal show={showEditModal} onHide={() => {
          setShowEditModal(false);
          setSelectedWorkItem(null);
        }} size="lg" centered>
          <Modal.Header closeButton className="bg-primary text-white">
            <Modal.Title className="d-flex align-items-center gap-2">
              <FaEdit />
              Edit Work Item
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="info">
              <h6>{selectedWorkItem.title}</h6>
              <p><strong>Status:</strong> {selectedWorkItem.status}</p>
              <p><strong>Priority:</strong> {selectedWorkItem.priority}</p>
              <p><strong>Due Date:</strong> {selectedWorkItem.dueDate ? moment(selectedWorkItem.dueDate).format('MMM DD, YYYY') : 'No due date'}</p>
              <p><strong>Description:</strong> {selectedWorkItem.description}</p>
              <small className="text-muted">
                Full editing functionality will be available in the next update.
                For now, you can use the table's inline editing features.
              </small>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => {
              setShowEditModal(false);
              setSelectedWorkItem(null);
            }}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Employee Work Detail Modal */}
      <Modal show={showEmployeeModal} onHide={() => {
        setShowEmployeeModal(false);
        setSelectedEmployee(null);
        setEmployeeWorkData([]);
      }} size="xl" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaUser />
            {selectedEmployee?.name} - Work Overview
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading employee work data...</p>
            </div>
          ) : (
            <div>
              {/* Employee Summary */}
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-primary">{employeeWorkData.length}</h4>
                      <small className="text-muted">Total Work Items</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-success">{employeeWorkData.filter(item => item.status === 'completed' || item.status === 'Done').length}</h4>
                      <small className="text-muted">Completed</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-warning">{employeeWorkData.filter(item => item.status === 'in-progress' || item.status === 'In Progress').length}</h4>
                      <small className="text-muted">In Progress</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-danger">{employeeWorkData.filter(item => moment(item.dueDate).isBefore(moment(), 'day') && item.status !== 'completed' && item.status !== 'Done').length}</h4>
                      <small className="text-muted">Overdue</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Work Items List */}
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {employeeWorkData.length > 0 ? (
                  <div className="list-group">
                    {employeeWorkData.map(item => (
                      <div key={item._id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{item.title}</h6>
                            <p className="mb-1 text-muted small">{item.description}</p>
                            <div className="d-flex gap-2 mb-1">
                              <Badge bg={item.status === 'completed' || item.status === 'Done' ? 'success' : 
                                        item.status === 'in-progress' || item.status === 'In Progress' ? 'primary' : 'secondary'}>
                                {item.status}
                              </Badge>
                              <Badge bg={item.priority === 'urgent' ? 'danger' : 
                                        item.priority === 'high' ? 'warning' : 
                                        item.priority === 'medium' ? 'info' : 'light'}>
                                {item.priority}
                              </Badge>
                              {item.project && (
                                <Badge bg="light" text="dark">
                                  {item.project.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-end">
                            {item.dueDate && (
                              <small className={`d-block ${moment(item.dueDate).isBefore(moment(), 'day') ? 'text-danger fw-bold' : 'text-muted'}`}>
                                Due: {moment(item.dueDate).format('MMM DD, YYYY')}
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FaTasks className="text-muted mb-2" size={32} />
                    <p className="text-muted">No work items assigned to this employee</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => {
            if (selectedEmployee?._id) {
              navigate(`/employees/${selectedEmployee._id}/work`);
            }
          }}>
            <FaUser className="me-1" />
            View Employee Work Details
          </Button>
          <Button variant="secondary" onClick={() => {
            setShowEmployeeModal(false);
            setSelectedEmployee(null);
            setEmployeeWorkData([]);
          }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Client Work Detail Modal */}
      <Modal show={showClientModal} onHide={() => {
        setShowClientModal(false);
        setSelectedClient(null);
        setClientWorkData([]);
      }} size="xl" centered>
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaBuilding />
            {selectedClient?.name} - Work Overview
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading client work data...</p>
            </div>
          ) : (
            <div>
              {/* Client Summary */}
              <Row className="mb-4">
                <Col md={2}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-primary">{clientWorkData.length}</h4>
                      <small className="text-muted">Total Work</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={2}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-secondary">{clientWorkData.filter(item => item.status === 'scheduled' || item.status === 'To Do').length}</h4>
                      <small className="text-muted">Scheduled</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={2}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-warning">{clientWorkData.filter(item => item.status === 'in-progress' || item.status === 'In Progress').length}</h4>
                      <small className="text-muted">In Progress</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={2}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-success">{clientWorkData.filter(item => item.status === 'completed' || item.status === 'Done').length}</h4>
                      <small className="text-muted">Completed</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={2}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-danger">{clientWorkData.filter(item => moment(item.dueDate).isBefore(moment(), 'day') && item.status !== 'completed' && item.status !== 'Done').length}</h4>
                      <small className="text-muted">Overdue</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={2}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-info">{[...new Set(clientWorkData.map(item => item.project?._id).filter(Boolean))].length}</h4>
                      <small className="text-muted">Projects</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Work Items List */}
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {clientWorkData.length > 0 ? (
                  <div className="list-group">
                    {clientWorkData.map(item => (
                      <div key={item._id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{item.title}</h6>
                            <p className="mb-1 text-muted small">{item.description}</p>
                            <div className="d-flex gap-2 mb-1">
                              <Badge bg={item.status === 'completed' || item.status === 'Done' ? 'success' : 
                                        item.status === 'in-progress' || item.status === 'In Progress' ? 'primary' : 'secondary'}>
                                {item.status}
                              </Badge>
                              <Badge bg={item.priority === 'urgent' ? 'danger' : 
                                        item.priority === 'high' ? 'warning' : 
                                        item.priority === 'medium' ? 'info' : 'light'}>
                                {item.priority}
                              </Badge>
                              {item.project && (
                                <Badge bg="light" text="dark">
                                  {item.project.name}
                                </Badge>
                              )}
                              {item.assignedTo && (
                                <Badge bg="outline-primary" className="text-primary">
                                  {item.assignedTo.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-end">
                            {item.dueDate && (
                              <small className={`d-block ${moment(item.dueDate).isBefore(moment(), 'day') ? 'text-danger fw-bold' : 'text-muted'}`}>
                                Due: {moment(item.dueDate).format('MMM DD, YYYY')}
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FaBuilding className="text-muted mb-2" size={32} />
                    <p className="text-muted">No work items found for this client</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="info" onClick={() => {
            if (selectedClient?._id) {
              navigate(`/clients/${selectedClient._id}`);
            }
          }}>
            <FaBuilding className="me-1" />
            View Client Details
          </Button>
          <Button variant="secondary" onClick={() => {
            setShowClientModal(false);
            setSelectedClient(null);
            setClientWorkData([]);
          }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Professional Work Creation Modal */}
      <ProfessionalWorkCreationModal
        show={showCreateWorkModal}
        onHide={() => setShowCreateWorkModal(false)}
        onSuccess={(result) => {
          // Show simple success message and refresh data
          if (result?.slotAssigned) {
            toast.success('🎯 Work item created and assigned to slot!');
          } else {
            toast.success('✅ Work item created successfully!');
          }
          
          // Refresh the work data to show the new item
          setTimeout(() => window.location.reload(), 1000);
          
          // Close modal immediately
          setShowCreateWorkModal(false);
          
          // NO AUTO REFRESH - let user manually sync
        }}
        selectedDate={filters.startDate}
        defaultProject=""
        mode="work-item"
      />

      {/* Work Item Details Modal */}
      {selectedWorkItem && showDetailsModal && (
        <WorkItemDetailsModal
          show={showDetailsModal}
          onHide={() => {
            setShowDetailsModal(false);
            setSelectedWorkItem(null);
          }}
          workItem={selectedWorkItem}
          onUpdate={async (itemId, newStatus) => {
            try {
              const workItemApi = (await import('../../api/workItemApi')).default;
              await workItemApi.updateStatus(itemId, newStatus);
              toast.success('Status updated successfully!');
              loadWorkData();
            } catch (error) {
              console.error('Error updating status:', error);
              toast.error('Failed to update status');
              throw error;
            }
          }}
          onRefresh={loadWorkData}
          onAddComment={async (workItemId, commentText) => {
            try {
              const workItemApi = (await import('../../api/workItemApi')).default;
              const result = await workItemApi.addComment(workItemId, commentText);
              loadWorkData();
              return result.data || result;
            } catch (error) {
              console.error('Error adding comment:', error);
              throw error;
            }
          }}
          currentUser={user}
        />
      )}
    </Container>
  );
};

export default EnhancedAdminWorkOverview;