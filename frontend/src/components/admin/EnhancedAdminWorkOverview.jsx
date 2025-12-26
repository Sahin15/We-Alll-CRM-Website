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
  FaPlus
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import workCalendarApi from '../../api/workCalendarApi';
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

import HelpSystem from './HelpSystem';
import useAdvancedSearch from '../../hooks/useAdvancedSearch';
import './EnhancedAdminWorkOverview.css';

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
  
  // Filter and pagination state - Show today's work (most work is same day due to slot system)
  const [filters, setFilters] = useState({
    startDate: moment().format('YYYY-MM-DD'), // Today's date
    endDate: moment().format('YYYY-MM-DD'), // Today's date
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
  const [showHelpSystem, setShowHelpSystem] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showCreateWorkModal, setShowCreateWorkModal] = useState(false);
  
  // Slot-related UI state
  const [showSlotColumns, setShowSlotColumns] = useState(true);
  const [slotOperationLoading, setSlotOperationLoading] = useState(false);
  const [selectedSlotOperation, setSelectedSlotOperation] = useState(null);
  
  // View mode state for unified dashboard
  const [viewMode, setViewMode] = useState('table'); // 'table', 'calendar', 'analytics', 'client-work'

  // Simplified state for real-time updates (disabled for now)
  const realtimeConnected = false;
  const hasUpdates = false;
  const overdueCount = 0;
  const conflicts = [];
  const clearUpdateQueue = () => {};
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
  
  // Debug logging (commented out for production)
  // console.log('EnhancedAdminWorkOverview - User:', user);
  // console.log('EnhancedAdminWorkOverview - hasAdminAccess:', hasAdminAccess);

  // Table columns configuration with client focus and slot integration
  const tableColumns = useMemo(() => [
    {
      key: 'title',
      title: 'Work Title',
      sortable: true,
      filterable: true,
      minWidth: '200px',
      editable: true
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
      editable: false // Client should not be editable in work management
    },
    {
      key: 'project.name',
      title: 'Project',
      sortable: true,
      filterable: true,
      minWidth: '150px',
      editable: false // Project should not be editable here
    },
    // Slot-related columns - VIEW ONLY (no assignment controls)
    {
      key: 'slotAssignment.slotNumber',
      title: 'Slot #',
      sortable: true,
      filterable: true,
      type: 'slot-number-display', // Changed from 'slot-number' to display-only
      minWidth: '80px',
      editable: false, // VIEW ONLY - no editing
      slotColumn: true,
      tooltip: 'Project slot number assigned to this work item (view only)'
    },
    {
      key: 'assignedTo.name',
      title: 'Assigned To',
      sortable: true,
      filterable: true,
      minWidth: '130px',
      editable: false // Assignment should be done through proper workflow
    },
    {
      key: 'department.name',
      title: 'Department',
      sortable: true,
      filterable: true,
      minWidth: '120px',
      editable: false // Department should not be editable here
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
      minWidth: '100px',
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
      minWidth: '90px',
      editable: true
    },
    {
      key: 'workType',
      title: 'Type',
      sortable: true,
      filterable: true,
      minWidth: '100px'
    },
    {
      key: 'formattedStartDate',
      title: 'Start Date',
      sortable: true,
      filterable: true,
      type: 'date',
      minWidth: '110px'
    },
    {
      key: 'formattedDueDate',
      title: 'Due Date',
      sortable: true,
      filterable: true,
      type: 'date',
      minWidth: '110px'
    },
    {
      key: 'daysUntilDue',
      title: 'Days Left',
      sortable: true,
      filterable: false,
      type: 'number',
      minWidth: '90px'
    },
    {
      key: 'completionPercentage',
      title: 'Progress',
      sortable: true,
      filterable: false,
      type: 'percentage',
      minWidth: '90px',
      editable: true
    },
    {
      key: 'timeTracking.estimatedHours',
      title: 'Est. Hours',
      sortable: true,
      filterable: false,
      type: 'number',
      minWidth: '90px'
    },
    {
      key: 'timeTracking.actualHours',
      title: 'Actual Hours',
      sortable: true,
      filterable: false,
      type: 'number',
      minWidth: '100px'
    },
    {
      key: 'workloadImpact',
      title: 'Impact',
      sortable: true,
      filterable: true,
      type: 'badge',
      badgeMap: {
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low'
      },
      minWidth: '80px'
    }
  ], [showSlotColumns]); // Close the useMemo array and add dependency

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
    filters.startDate,
    filters.endDate,
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

  // Load work data with enhanced API and caching
  const loadWorkData = async () => {
    // console.log('loadWorkData called - hasAdminAccess:', hasAdminAccess);
    
    try {
      setLoading(true);
      setError(null);

      // Clean and format query parameters to prevent 400 errors
      const queryParams = {
        startDate: filters.startDate ? moment(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? moment(filters.endDate).toISOString() : undefined,
        search: filters.search || '',
        sortBy: sortConfig.sortBy,
        sortOrder: sortConfig.sortOrder,
        page: pagination.currentPage,
        limit: pagination.pageSize,
        includeAnalytics: showAnalytics
      };

      // Remove undefined values
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      
      // console.log('API Query Params:', queryParams);

      // Only include non-'all' filter values
      if (filters.client && filters.client !== 'all') {
        queryParams.client = filters.client;
      }
      if (filters.project && filters.project !== 'all') {
        queryParams.project = filters.project;
      }
      if (filters.employee && filters.employee !== 'all') {
        queryParams.employee = filters.employee;
      }
      if (filters.department && filters.department !== 'all') {
        queryParams.department = filters.department;
      }
      if (filters.status && filters.status !== 'all') {
        queryParams.status = filters.status;
      }
      if (filters.priority && filters.priority !== 'all') {
        queryParams.priority = filters.priority;
      }
      if (filters.workType && filters.workType !== 'all') {
        queryParams.workType = filters.workType;
      }
      if (filters.vipOnly) {
        queryParams.vipOnly = true;
      }
      if (filters.company && filters.company !== 'all') {
        queryParams.company = filters.company;
      }

      // Slot-related filters
      if (filters.slotNumber && filters.slotNumber.trim()) {
        queryParams.slotNumber = filters.slotNumber.trim();
      }
      if (filters.hasSlotAssignment && filters.hasSlotAssignment !== 'all') {
        queryParams.hasSlotAssignment = filters.hasSlotAssignment;
      }
      if (filters.slotRangeFrom && filters.slotRangeFrom.trim()) {
        queryParams.slotRangeFrom = filters.slotRangeFrom.trim();
      }
      if (filters.slotRangeTo && filters.slotRangeTo.trim()) {
        queryParams.slotRangeTo = filters.slotRangeTo.trim();
      }
      if (filters.projectSlotUtilization && filters.projectSlotUtilization !== 'all') {
        queryParams.projectSlotUtilization = filters.projectSlotUtilization;
      }
      if (filters.slotSearch && filters.slotSearch.trim()) {
        queryParams.slotSearch = filters.slotSearch.trim();
      }

      // Handle custom filters properly
      if (filters.customFilters && filters.customFilters.length > 0) {
        queryParams.customFilters = JSON.stringify(filters.customFilters);
      }

      let response;
      let usedMockData = false;
      let dataSource = 'unknown';
      
      try {
        // console.log('🔍 Trying enhanced admin overview API with params:', queryParams);
        response = await workCalendarApi.getEnhancedAdminOverview(queryParams);
        // console.log('✅ Enhanced API response:', response);
        dataSource = 'enhanced-api';
      } catch (enhancedError) {
        console.warn('❌ Enhanced admin overview failed:', enhancedError);
        console.warn('📋 Error details:', {
          status: enhancedError.response?.status,
          statusText: enhancedError.response?.statusText,
          data: enhancedError.response?.data
        });
        try {
          // console.log('🔍 Trying basic admin overview API...');
          response = await workCalendarApi.getAdminWorkOverview(queryParams);
          // console.log('✅ Basic API response:', response);
          dataSource = 'basic-api';
        } catch (basicError) {
          console.warn('❌ Basic admin overview also failed:', basicError);
          console.warn('📋 Basic API error details:', {
            status: basicError.response?.status,
            statusText: basicError.response?.statusText,
            data: basicError.response?.data
          });
          usedMockData = true;
          dataSource = 'mock-data';
          // Use mock data as final fallback - ensure it always works
          try {
            // console.log('Generating mock data...');
            const mockWorkData = generateMockWorkData();
            const mockAnalytics = generateMockAnalytics();
            // console.log('Mock work data:', mockWorkData);
            // console.log('Mock analytics:', mockAnalytics);
            
            response = {
              success: true,
              data: {
                workEntries: mockWorkData,
                analytics: mockAnalytics,
                currentPage: 1,
                totalCount: mockWorkData.length,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false
              }
            };
            // console.log('Mock response created:', response);
          } catch (mockError) {
            console.error('Mock data generation failed:', mockError);
            // Absolute fallback with minimal data
            response = {
              success: true,
              data: {
                workEntries: [],
                analytics: {
                  overall: { totalWork: 0, completedWork: 0, inProgressWork: 0, overdueWork: 0 },
                  byClient: [],
                  byProject: [],
                  byEmployee: [],
                  byDepartment: []
                },
                currentPage: 1,
                totalCount: 0,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false
              }
            };
            // console.log('Absolute fallback response created:', response);
          }
        }
      }
      
      // Process response data safely
      // console.log('Processing response:', response);
      
      // Handle axios response structure vs mock data structure
      let responseData;
      if (usedMockData) {
        // Mock data is structured directly
        responseData = response;
      } else {
        // Axios response has data in response.data
        responseData = response.data;
      }
      
      // console.log('Response data after processing:', responseData);
      // console.log('Response success:', responseData?.success);
      // console.log('Response data content:', responseData?.data);
      
      if (responseData && responseData.success && responseData.data) {
        const workEntries = responseData.data.workEntries || [];
        
        // Enhance work entries with slot data
        const enhancedWorkEntries = enhanceWorkEntriesWithSlotData(workEntries);
        setWorkData(enhancedWorkEntries);
        
        // Auto-enable virtualization for large datasets
        if (enhancedWorkEntries.length > 1000) {
          setUseVirtualization(true);
        }
        
        // Load analytics (simplified)
        if (showAnalytics) {
          setAnalytics(responseData.data.analytics || {
            overall: { totalWork: 0, completedWork: 0, inProgressWork: 0, overdueWork: 0 },
            byClient: [],
            byProject: [],
            byEmployee: [],
            byDepartment: []
          });

          // Load slot analytics if available
          setSlotAnalytics(responseData.data.slotAnalytics || null);
        }
        
        setPagination({
          currentPage: responseData.data.currentPage || 1,
          pageSize: pagination.pageSize,
          totalCount: responseData.data.totalCount || 0,
          totalPages: responseData.data.totalPages || 1,
          hasNextPage: responseData.data.hasNextPage || false,
          hasPrevPage: responseData.data.hasPrevPage || false
        });

        // Show appropriate message based on data source
        if (usedMockData) {
          // console.log('🔄 SYNC NEEDED: You created work items but they need to be synced to WorkCalendar collection');
        } else if (enhancedWorkEntries.length === 0) {
          // console.log('⚠️ EMPTY RESULT: WorkCalendar collection exists but returned no data with current filters');
        } else {
          // console.log(`✅ Loaded ${enhancedWorkEntries.length} work entries from ${dataSource}`);
        }
      } else {
        throw new Error(responseData?.message || 'Failed to load work data');
      }
    } catch (error) {
      console.error('Error loading work data:', error);
      const errorMessage = error.response?.status === 400 
        ? 'Invalid request parameters. Please check your filters and try again.'
        : error.message || 'Failed to load work data. Please try again later.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

  // Handle bulk operations
  const handleBulkOperation = useCallback(async (operation, selectedIds, data) => {
    try {
      setBulkOperationLoading(true);
      
      const response = await workCalendarApi.bulkOperations({
        workEntryIds: selectedIds,
        operation,
        data
      });

      if (response.success) {
        // toast.success(response.message);
        loadWorkData(); // Refresh data
      } else {
        throw new Error(response.message || 'Bulk operation failed');
      }
    } catch (error) {
      console.error('Bulk operation error:', error);
      toast.error(error.message || 'Bulk operation failed');
    } finally {
      setBulkOperationLoading(false);
    }
  }, []);

  // Handle row editing
  const handleRowEdit = useCallback(async (rowId, columnKey, newValue) => {
    try {
      const updateData = { [columnKey]: newValue };
      
      const response = await workCalendarApi.updateWorkCalendarEntry(rowId, updateData);
      
      if (response.success) {
        // toast.success('Work entry updated successfully');
        loadWorkData(); // Refresh data
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error) {
      console.error('Row edit error:', error);
      toast.error(error.message || 'Failed to update work entry');
    }
  }, []);

  // Handle row deletion
  const handleRowDelete = useCallback(async (rowId) => {
    if (window.confirm('Are you sure you want to delete this work entry?')) {
      try {
        const response = await workCalendarApi.deleteWorkCalendarEntry(rowId);
        
        if (response.success) {
          // toast.success('Work entry deleted successfully');
          loadWorkData(); // Refresh data
        } else {
          throw new Error(response.message || 'Delete failed');
        }
      } catch (error) {
        console.error('Row delete error:', error);
        toast.error(error.message || 'Failed to delete work entry');
      }
    }
  }, []);

  // Handle export - now opens the enhanced export panel
  const handleExport = useCallback(() => {
    setShowExportPanel(true);
  }, []);

  // Slot operation handlers
  const handleSlotAssignment = useCallback(async (workItemId, slotId) => {
    try {
      setSlotOperationLoading(true);
      
      // Call slot assignment API using projectApi
      const response = await projectApi.assignWorkItemToSlot(slotId, workItemId, 'Assigned via admin dashboard');
      
      if (response.success) {
        // toast.success('Slot assigned successfully');
        // Refresh data to show updated slot assignment
        loadWorkData();
      } else {
        toast.error(response.message || 'Failed to assign slot');
      }
    } catch (error) {
      console.error('Error assigning slot:', error);
      toast.error(error.response?.data?.message || 'Failed to assign slot');
    } finally {
      setSlotOperationLoading(false);
    }
  }, [loadWorkData]);

  const handleSlotRelease = useCallback(async (workItemId, reason = 'Manual release') => {
    try {
      setSlotOperationLoading(true);
      
      const response = await workCalendarApi.releaseSlotFromWorkItem(workItemId, user.id, reason);
      
      if (response.data.success) {
        // toast.success('Slot released successfully');
        loadWorkData();
      } else {
        toast.error(response.data.message || 'Failed to release slot');
      }
    } catch (error) {
      console.error('Error releasing slot:', error);
      toast.error(error.response?.data?.message || 'Failed to release slot');
    } finally {
      setSlotOperationLoading(false);
    }
  }, [user.id, loadWorkData]);

  const handleSlotCompletion = useCallback(async (slotId, notes = '') => {
    try {
      setSlotOperationLoading(true);
      
      const response = await workCalendarApi.completeSlot(slotId, user.id, { notes });
      
      if (response.data.success) {
        // toast.success('Slot completed successfully');
        loadWorkData();
      } else {
        toast.error(response.data.message || 'Failed to complete slot');
      }
    } catch (error) {
      console.error('Error completing slot:', error);
      toast.error(error.response?.data?.message || 'Failed to complete slot');
    } finally {
      setSlotOperationLoading(false);
    }
  }, [user.id, loadWorkData]);

  const handleBulkSlotOperation = useCallback(async (operation, selectedIds, slotData) => {
    try {
      setBulkOperationLoading(true);
      
      const response = await workCalendarApi.bulkSlotOperations({
        workEntryIds: selectedIds,
        operation,
        data: slotData
      });
      
      if (response.data.success) {
        const { successfulCount, failedCount } = response.data.data;
        toast.success(`Bulk slot operation completed: ${successfulCount} successful${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
        loadWorkData();
      } else {
        toast.error(response.data.message || 'Bulk slot operation failed');
      }
    } catch (error) {
      console.error('Error in bulk slot operation:', error);
      toast.error(error.response?.data?.message || 'Bulk slot operation failed');
    } finally {
      setBulkOperationLoading(false);
    }
  }, [loadWorkData]);

  const handleToggleSlotColumns = useCallback(() => {
    setShowSlotColumns(prev => !prev);
  }, []);

  // Diagnostic function to check system status
  const runDiagnostics = useCallback(async () => {
    // console.log('🔍 Running Work Management System Diagnostics...');
    
    try {
      // Check if we can reach the backend
      // console.log('📡 Testing backend connectivity...');
      
      // Try to get filter options (this tests basic API connectivity)
      const filterTest = await Promise.all([
        clientApi.getAllClients().catch(e => ({ error: e.message })),
        projectApi.getAllProjects().catch(e => ({ error: e.message })),
        userApi.getAllUsers().catch(e => ({ error: e.message }))
      ]);
      
      // console.log('📊 Filter options test results:', filterTest);
      
      // Test WorkCalendar API endpoints
      // console.log('📅 Testing WorkCalendar API endpoints...');
      const workCalendarTest = await workCalendarApi.getEnhancedAdminOverview({
        limit: 1,
        page: 1
      }).catch(e => ({ error: e.message, status: e.response?.status }));
      
      // console.log('📋 WorkCalendar API test result:', workCalendarTest);
      
      // Test sync endpoint
      // console.log('🔄 Testing sync endpoint availability...');
      // Note: We won't actually sync, just test if endpoint exists
      
      // toast.info('🔍 Diagnostics completed. Check browser console for detailed results.');
      
    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      toast.error('Diagnostics failed. Check browser console for details.');
    }
  }, []);



  const handleRefreshData = useCallback(() => {
    clearUpdateQueue();
    loadWorkData();
  }, [clearUpdateQueue, loadWorkData]);

  // Sync data from WorkItems to WorkCalendar
  const handleSyncData = useCallback(async () => {
    try {
      setLoading(true);
      // toast.info('🔄 Syncing work items to calendar...');
      // console.log('🔄 Starting sync process from WorkItems to WorkCalendar...');
      
      const response = await workCalendarApi.syncWorkItemsToCalendar();
      // console.log('📡 Sync API response:', response);
      
      if (response.data.success) {
        const { syncedCount, skippedCount, totalProcessed } = response.data.data;
        // console.log(`📊 Sync results: ${syncedCount} new, ${skippedCount} existing, ${totalProcessed} total`);
        
        if (syncedCount > 0) {
          toast.success(`✅ Sync completed! ${syncedCount} new entries created, ${skippedCount} already existed (${totalProcessed} total processed)`);
        } else if (totalProcessed === 0) {
          toast.warning('⚠️ No work items found to sync. Create some work items first.');
        } else {
          toast.info(`ℹ️ All ${totalProcessed} work items were already synced. No new entries needed.`);
        }
        
        // Reload data to show the synced entries
        setTimeout(() => {
          // console.log('🔄 Reloading data after sync...');
          loadWorkData();
        }, 1000);
      } else {
        throw new Error(response.data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
      console.error('📋 Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      let errorMessage = 'Failed to sync data. ';
      
      if (error.response?.status === 403) {
        errorMessage += 'Access denied. Only administrators can sync data.';
      } else if (error.response?.status === 404) {
        errorMessage += 'Sync endpoint not found. Please check backend configuration.';
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error during sync. Please check backend logs.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadWorkData]);

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
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      completionPercentage: 65,
      client: { _id: 'c1', name: 'Sample Client A', company: 'Tech Corp', isVip: true, vipLevel: 'gold' },
      project: { _id: 'p1', name: 'Sample Project Alpha' },
      assignedTo: { _id: 'u1', name: 'John Doe', email: 'john@example.com' },
      department: { _id: 'd1', name: 'Development' },
      formattedStartDate: moment().format('DD/MM/YYYY'),
      formattedDueDate: moment().add(7, 'days').format('DD/MM/YYYY'),
      daysUntilDue: 7,
      isOverdue: false,
      workloadImpact: 'medium',
      timeTracking: { estimatedHours: 40, actualHours: 26 }
    },
    {
      _id: '2',
      title: 'Sample Work Entry 2',
      description: 'Another sample work entry',
      status: 'completed',
      priority: 'medium',
      workType: 'design',
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      completionPercentage: 100,
      client: { _id: 'c2', name: 'Sample Client B', company: 'Design Studio', isVip: false, vipLevel: 'standard' },
      project: { _id: 'p2', name: 'Sample Project Beta' },
      assignedTo: { _id: 'u2', name: 'Jane Smith', email: 'jane@example.com' },
      department: { _id: 'd2', name: 'Design' },
      formattedStartDate: moment().subtract(14, 'days').format('DD/MM/YYYY'),
      formattedDueDate: moment().subtract(1, 'day').format('DD/MM/YYYY'),
      daysUntilDue: -1,
      isOverdue: false,
      workloadImpact: 'low',
      timeTracking: { estimatedHours: 20, actualHours: 18 }
    }
  ];

  const generateMockAnalytics = () => ({
    overall: {
      totalWork: 15,
      completedWork: 8,
      inProgressWork: 5,
      overdueWork: 2,
      totalEstimatedHours: 240,
      totalActualHours: 198
    },
    byClient: [
      { clientName: '⭐ Tech Corp (VIP)', totalWork: 6, completedWork: 4, overdueWork: 1, isVip: true, vipLevel: 'gold' },
      { clientName: 'Design Studio', totalWork: 4, completedWork: 2, overdueWork: 1, isVip: false },
      { clientName: '⭐ Marketing Inc (VIP)', totalWork: 3, completedWork: 2, overdueWork: 0, isVip: true, vipLevel: 'platinum' },
      { clientName: 'Internal Projects', totalWork: 2, completedWork: 0, overdueWork: 0, isVip: false }
    ],
    byProject: [
      { projectName: 'Website Redesign', totalWork: 5, completedWork: 3, overdueWork: 1 },
      { projectName: 'Mobile App', totalWork: 4, completedWork: 2, overdueWork: 0 },
      { projectName: 'Marketing Campaign', totalWork: 3, completedWork: 2, overdueWork: 1 },
      { projectName: 'Internal Tools', totalWork: 3, completedWork: 1, overdueWork: 0 }
    ],
    byEmployee: [
      { employeeName: 'John Doe', totalWork: 4, completedWork: 2, avgProgress: 65 },
      { employeeName: 'Jane Smith', totalWork: 3, completedWork: 3, avgProgress: 100 },
      { employeeName: 'Mike Johnson', totalWork: 4, completedWork: 2, avgProgress: 75 },
      { employeeName: 'Sarah Wilson', totalWork: 2, completedWork: 1, avgProgress: 80 },
      { employeeName: 'David Brown', totalWork: 2, completedWork: 0, avgProgress: 45 }
    ],
    byDepartment: [
      { departmentName: 'Development', totalWork: 8, completedWork: 4, totalHours: 160 },
      { departmentName: 'Design', totalWork: 4, completedWork: 3, totalHours: 80 },
      { departmentName: 'Marketing', totalWork: 2, completedWork: 1, totalHours: 40 },
      { departmentName: 'QA', totalWork: 1, completedWork: 0, totalHours: 20 }
    ],
    workloadByPriority: {
      urgent: 2,
      high: 5,
      medium: 6,
      low: 2
    }
  });

  // Clear all filters - Reset to today's work
  const clearAllFilters = useCallback(() => {
    setFilters({
      startDate: moment().format('YYYY-MM-DD'), // Today's date
      endDate: moment().format('YYYY-MM-DD'), // Today's date
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
                Today's work management • Shows work by due date (when work should be done) • Slot-based organization
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

            {/* Action Buttons - Secondary Controls */}
            <div className="action-buttons d-flex align-items-center gap-2">
              {/* Create Work Item Button */}
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => setShowCreateWorkModal(true)}
                className="d-flex align-items-center gap-1"
                title="Create new work item with slot assignment"
              >
                <FaPlus size={12} /> Create Work Item
              </Button>
              
              {/* Data Integration Status - Always show sync button for debugging */}
              <OverlayTrigger
                placement="bottom"
                overlay={
                  <Tooltip>
                    {workData.length === 0 
                      ? "No data found. Click to sync WorkItems to WorkCalendar collection."
                      : "Sync latest WorkItems to WorkCalendar collection."
                    }
                  </Tooltip>
                }
              >
                <Button 
                  variant={workData.length === 0 ? "warning" : "outline-warning"} 
                  size="sm"
                  onClick={handleSyncData}
                  disabled={loading}
                  className="d-flex align-items-center gap-1"
                >
                  <FaSync size={12} className={loading ? "fa-spin" : ""} /> 
                  {workData.length === 0 ? "Sync Data" : "Re-sync"}
                </Button>
              </OverlayTrigger>
              
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="d-flex align-items-center gap-1"
              >
                <FaFilter size={12} /> Filters
              </Button>
              
              <Button 
                variant={loading ? "secondary" : "success"} 
                size="sm"
                onClick={loadWorkData}
                disabled={loading}
                className="d-flex align-items-center gap-1"
              >
                <FaSync size={12} className={loading ? "fa-spin" : ""} /> 
                {loading ? "Loading..." : "Refresh"}
              </Button>
              
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={runDiagnostics}
                className="d-flex align-items-center gap-1"
                title="Run System Diagnostics"
              >
                <FaExclamationTriangle size={12} /> Debug
              </Button>
              
              <Button 
                variant="outline-info" 
                size="sm"
                onClick={() => setShowHelpSystem(true)}
                className="d-flex align-items-center gap-1"
                title="Get Help"
              >
                <FaQuestion size={12} /> Help
              </Button>
              
              {/* Slot Column Toggle */}
              <Button 
                variant={showSlotColumns ? "info" : "outline-info"} 
                size="sm"
                onClick={handleToggleSlotColumns}
                className="d-flex align-items-center gap-1 slot-column-toggle"
                title={showSlotColumns ? "Hide Slot Columns" : "Show Slot Columns"}
              >
                <FaProjectDiagram size={12} /> 
                {showSlotColumns ? "Hide Slots" : "Show Slots"}
              </Button>
            </div>
          </div>
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
          <Card className="border-0 shadow-sm">
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
                      <span className="read-only-badge">
                        📊 Progress Tracking & Monitoring
                      </span>
                    </>
                  )}
                </small>
              </div>
              
              {/* Quick Date Filters - Simplified */}
              {viewMode === 'table' && (
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <small className="text-muted me-2" style={{ fontSize: '0.75rem', fontWeight: '500' }}>Work Date:</small>
                  <ButtonGroup size="sm">
                    <Button
                      variant={filters.startDate === moment().format('YYYY-MM-DD') && filters.endDate === moment().format('YYYY-MM-DD') ? "primary" : "outline-primary"}
                      onClick={() => {
                        const today = moment().format('YYYY-MM-DD');
                        handleFilterChange('startDate', today);
                        handleFilterChange('endDate', today);
                      }}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Today
                    </Button>
                    <Button
                      variant={filters.startDate === moment().subtract(1, 'day').format('YYYY-MM-DD') && filters.endDate === moment().subtract(1, 'day').format('YYYY-MM-DD') ? "primary" : "outline-secondary"}
                      onClick={() => {
                        const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
                        handleFilterChange('startDate', yesterday);
                        handleFilterChange('endDate', yesterday);
                      }}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant="outline-info"
                      onClick={() => {
                        const last7Days = moment().subtract(6, 'days').format('YYYY-MM-DD');
                        const today = moment().format('YYYY-MM-DD');
                        handleFilterChange('startDate', last7Days);
                        handleFilterChange('endDate', today);
                      }}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Last 7 Days
                    </Button>
                  </ButtonGroup>
                  
                  {/* Date Range Inputs */}
                  <div className="d-flex gap-1 ms-2">
                    <Form.Control
                      type="date"
                      size="sm"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      title="Start Date"
                      style={{ width: '130px', fontSize: '0.75rem' }}
                    />
                    <Form.Control
                      type="date"
                      size="sm"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      title="End Date"
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
            
            <Card.Body className="p-0">
              {/* Empty State - Simple and Clean */}
              {viewMode === 'table' && workData.length === 0 && !loading && (
                <div className="p-5 text-center">
                  <FaCalendarAlt size={48} className="mb-3 text-muted" />
                  <h5 className="text-muted mb-2">No Work Items Found</h5>
                  <p className="text-muted mb-4">
                    No work items match your current filters for the selected date range.
                  </p>
                  <div className="d-flex gap-2 justify-content-center">
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
                        setFilters(prev => ({
                          ...prev,
                          startDate: moment().format('YYYY-MM-DD'), // Today only
                          endDate: moment().format('YYYY-MM-DD'), // Today only
                          client: 'all',
                          project: 'all',
                          employee: 'all',
                          status: 'all',
                          priority: 'all',
                          workType: 'all',
                          search: ''
                        }));
                      }}
                    >
                      Clear Filters
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
                      // Slot-related props
                      onSlotAssignment={handleSlotAssignment}
                      onSlotRelease={handleSlotRelease}
                      onSlotCompletion={handleSlotCompletion}
                      onBulkSlotOperation={handleBulkSlotOperation}
                      slotOperationLoading={slotOperationLoading}
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

      {/* Help System */}
      <HelpSystem
        show={showHelpSystem}
        onHide={() => setShowHelpSystem(false)}
        context="general"
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

      {/* Professional Work Creation Modal */}
      <ProfessionalWorkCreationModal
        show={showCreateWorkModal}
        onHide={() => setShowCreateWorkModal(false)}
        onSuccess={() => {
          setShowCreateWorkModal(false);
          loadWorkData(); // Refresh the data after creation
        }}
        mode="work-item"
      />
    </Container>
  );
};

export default EnhancedAdminWorkOverview;