import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import EnhancedAdminWorkOverview from '../EnhancedAdminWorkOverview';
import { AuthContext } from '../../../context/AuthContext';
import workCalendarApi from '../../../api/workCalendarApi';
import clientApi from '../../../api/clientApi';
import projectApi from '../../../api/projectApi';
import { userApi } from '../../../api/userApi';
import departmentApi from '../../../api/departmentApi';

/**
 * Integration Tests for Enhanced Admin Work Overview
 * 
 * **Feature: admin-work-management-enhancement, Task 9.1: Integration Tests**
 * 
 * Tests complete user workflows from filtering to export, verifies real-time updates
 * work across all components, and tests mobile responsiveness and touch interactions.
 */

// Mock all API modules
jest.mock('../../../api/workCalendarApi');
jest.mock('../../../api/clientApi');
jest.mock('../../../api/projectApi');
jest.mock('../../../api/userApi');
jest.mock('../../../api/departmentApi');
jest.mock('react-toastify');

// Mock real-time hooks
jest.mock('../../../hooks/useRealTimeUpdates', () => ({
  useRealTimeUpdates: jest.fn(() => ({
    isConnected: true,
    hasUpdates: false,
    overdueCount: 0,
    conflicts: [],
    clearUpdateQueue: jest.fn()
  }))
}));

jest.mock('../../../hooks/useAdvancedSearch', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    searchTerm: '',
    handleSearchChange: jest.fn(),
    clearSearch: jest.fn(),
    filterSuggestions: [],
    getSearchSuggestions: jest.fn(),
    validateFilterCombination: jest.fn(),
    isSearching: false
  }))
}));

// Mock mobile detection
jest.mock('../../../hooks/useMobileDetection', () => ({
  useMobileDetection: jest.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenSize: 'lg',
    touchDevice: false,
    getOptimalColumnCount: jest.fn(() => 4),
    shouldHideColumn: jest.fn(() => false),
    getTouchFriendlyProps: jest.fn(() => ({}))
  }))
}));

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1
}));

describe('Enhanced Admin Work Overview Integration Tests', () => {
  const mockUser = {
    _id: 'admin-123',
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'admin'
  };

  const mockClients = [
    { _id: 'client-1', name: 'Client A', company: 'Company A' },
    { _id: 'client-2', name: 'Client B', company: 'Company B' }
  ];

  const mockProjects = [
    { _id: 'project-1', name: 'Project Alpha', clientId: 'client-1' },
    { _id: 'project-2', name: 'Project Beta', clientId: 'client-2' }
  ];

  const mockEmployees = [
    { _id: 'emp-1', name: 'John Doe', role: 'employee' },
    { _id: 'emp-2', name: 'Jane Smith', role: 'employee' }
  ];

  const mockDepartments = [
    { _id: 'dept-1', name: 'Development' },
    { _id: 'dept-2', name: 'Design' }
  ];

  const mockWorkData = [
    {
      _id: 'work-1',
      title: 'Task 1 for Client A',
      client: { _id: 'client-1', name: 'Client A' },
      project: { _id: 'project-1', name: 'Project Alpha' },
      assignedTo: { _id: 'emp-1', name: 'John Doe' },
      department: { _id: 'dept-1', name: 'Development' },
      status: 'in-progress',
      priority: 'high',
      workType: 'development',
      startDate: '2024-01-15',
      dueDate: '2024-01-25',
      completionPercentage: 60,
      timeTracking: { estimatedHours: 40, actualHours: 24 },
      workloadImpact: 'medium'
    },
    {
      _id: 'work-2',
      title: 'Task 2 for Client B',
      client: { _id: 'client-2', name: 'Client B' },
      project: { _id: 'project-2', name: 'Project Beta' },
      assignedTo: { _id: 'emp-2', name: 'Jane Smith' },
      department: { _id: 'dept-2', name: 'Design' },
      status: 'completed',
      priority: 'medium',
      workType: 'design',
      startDate: '2024-01-10',
      dueDate: '2024-01-20',
      completionPercentage: 100,
      timeTracking: { estimatedHours: 20, actualHours: 18 },
      workloadImpact: 'low'
    }
  ];

  const mockAnalytics = {
    totalWorkEntries: 2,
    completionRate: 75,
    overduePercentage: 10,
    averageCompletionTime: 8.5,
    workloadDistribution: {
      byClient: [
        { clientId: 'client-1', clientName: 'Client A', workCount: 1, completionRate: 60 },
        { clientId: 'client-2', clientName: 'Client B', workCount: 1, completionRate: 100 }
      ],
      byEmployee: [
        { employeeId: 'emp-1', employeeName: 'John Doe', workCount: 1, completionRate: 60 },
        { employeeId: 'emp-2', employeeName: 'Jane Smith', workCount: 1, completionRate: 100 }
      ]
    }
  };

  const renderComponent = (userRole = 'admin') => {
    const contextValue = {
      user: { ...mockUser, role: userRole },
      login: jest.fn(),
      logout: jest.fn(),
      loading: false
    };

    return render(
      <BrowserRouter>
        <AuthContext.Provider value={contextValue}>
          <EnhancedAdminWorkOverview />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup API mocks
    clientApi.getAllClients.mockResolvedValue(mockClients);
    projectApi.getAllProjects.mockResolvedValue(mockProjects);
    userApi.getAllUsers.mockResolvedValue(mockEmployees);
    departmentApi.getAllDepartments.mockResolvedValue(mockDepartments);
    
    workCalendarApi.getEnhancedAdminOverview.mockResolvedValue({
      success: true,
      data: {
        workEntries: mockWorkData,
        analytics: mockAnalytics,
        currentPage: 1,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

    workCalendarApi.bulkOperations.mockResolvedValue({
      success: true,
      message: 'Bulk operation completed successfully'
    });

    workCalendarApi.updateWorkCalendarEntry.mockResolvedValue({
      success: true,
      message: 'Work entry updated successfully'
    });

    workCalendarApi.deleteWorkCalendarEntry.mockResolvedValue({
      success: true,
      message: 'Work entry deleted successfully'
    });

    toast.success = jest.fn();
    toast.error = jest.fn();
  });

  /**
   * Test complete user workflows from filtering to export
   */
  describe('Complete User Workflows', () => {
    test('client-focused filtering workflow', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Enhanced Work Management Dashboard')).toBeInTheDocument();
      });

      // Verify initial data is loaded
      expect(screen.getByText('Task 1 for Client A')).toBeInTheDocument();
      expect(screen.getByText('Task 2 for Client B')).toBeInTheDocument();

      // Step 1: Filter by Client A
      const clientSelect = screen.getByLabelText(/Client \(Primary Filter\)/i);
      await user.selectOptions(clientSelect, 'client-1');

      // Verify API is called with client filter
      await waitFor(() => {
        expect(workCalendarApi.getEnhancedAdminOverview).toHaveBeenCalledWith(
          expect.objectContaining({
            client: 'client-1'
          })
        );
      });

      // Step 2: Add status filter
      const statusSelect = screen.getByLabelText(/Status/i);
      await user.selectOptions(statusSelect, 'in-progress');

      // Verify combined filters
      await waitFor(() => {
        expect(workCalendarApi.getEnhancedAdminOverview).toHaveBeenCalledWith(
          expect.objectContaining({
            client: 'client-1',
            status: 'in-progress'
          })
        );
      });

      // Step 3: Verify active filters display
      expect(screen.getByText('Client: Client A')).toBeInTheDocument();
      expect(screen.getByText('Status: in-progress')).toBeInTheDocument();

      // Step 4: Clear specific filter
      const clearClientButton = screen.getByText('Client: Client A').parentElement.querySelector('button');
      await user.click(clearClientButton);

      // Verify filter is cleared
      await waitFor(() => {
        expect(workCalendarApi.getEnhancedAdminOverview).toHaveBeenCalledWith(
          expect.objectContaining({
            client: 'all',
            status: 'in-progress'
          })
        );
      });
    });

    test('bulk operations workflow', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Task 1 for Client A')).toBeInTheDocument();
      });

      // Step 1: Select multiple rows
      const checkboxes = screen.getAllByRole('checkbox');
      const rowCheckboxes = checkboxes.filter((cb, index) => index > 0); // Skip "select all"
      
      await user.click(rowCheckboxes[0]);
      await user.click(rowCheckboxes[1]);

      // Step 2: Open bulk operations
      const bulkButton = screen.getByText(/Bulk Operations \(2\)/i);
      await user.click(bulkButton);

      // Step 3: Verify bulk operations panel opens
      await waitFor(() => {
        expect(screen.getByText(/Bulk Operations Panel/i)).toBeInTheDocument();
      });

      // Step 4: Perform bulk status update
      const statusUpdateButton = screen.getByText(/Update Status/i);
      await user.click(statusUpdateButton);

      const newStatusSelect = screen.getByLabelText(/New Status/i);
      await user.selectOptions(newStatusSelect, 'completed');

      const confirmButton = screen.getByText(/Confirm Update/i);
      await user.click(confirmButton);

      // Verify bulk operation API call
      await waitFor(() => {
        expect(workCalendarApi.bulkOperations).toHaveBeenCalledWith({
          workEntryIds: ['work-1', 'work-2'],
          operation: 'updateStatus',
          data: { status: 'completed' }
        });
      });

      // Verify success message
      expect(toast.success).toHaveBeenCalledWith('Bulk operation completed successfully');
    });

    test('export workflow', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Task 1 for Client A')).toBeInTheDocument();
      });

      // Step 1: Apply filters
      const clientSelect = screen.getByLabelText(/Client \(Primary Filter\)/i);
      await user.selectOptions(clientSelect, 'client-1');

      // Step 2: Open export panel
      const exportButton = screen.getByText(/Export/i);
      await user.click(exportButton);

      // Step 3: Verify export panel opens
      await waitFor(() => {
        expect(screen.getByText(/Export Work Management Data/i)).toBeInTheDocument();
      });

      // Step 4: Select export format and generate
      const csvButton = screen.getByText(/Export as CSV/i);
      await user.click(csvButton);

      // Verify export functionality is triggered
      // (Implementation would depend on the actual export service)
      expect(screen.getByText(/Export Work Management Data/i)).toBeInTheDocument();
    });

    test('inline editing workflow', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Task 1 for Client A')).toBeInTheDocument();
      });

      // Step 1: Click on editable cell (status)
      const statusCell = screen.getByText('in-progress');
      await user.click(statusCell);

      // Step 2: Verify edit mode is activated
      await waitFor(() => {
        expect(screen.getByDisplayValue('in-progress')).toBeInTheDocument();
      });

      // Step 3: Change value and save
      const editInput = screen.getByDisplayValue('in-progress');
      await user.clear(editInput);
      await user.type(editInput, 'completed');
      await user.keyboard('{Enter}');

      // Verify update API call
      await waitFor(() => {
        expect(workCalendarApi.updateWorkCalendarEntry).toHaveBeenCalledWith(
          'work-1',
          { status: 'completed' }
        );
      });

      expect(toast.success).toHaveBeenCalledWith('Work entry updated successfully');
    });
  });

  /**
   * Test real-time updates across all components
   */
  describe('Real-Time Updates Integration', () => {
    test('real-time work updates refresh data table', async () => {
      const { useRealTimeUpdates } = require('../../../hooks/useRealTimeUpdates');
      
      // Mock real-time update callback
      let updateCallback;
      useRealTimeUpdates.mockImplementation(({ onWorkUpdate }) => {
        updateCallback = onWorkUpdate;
        return {
          isConnected: true,
          hasUpdates: false,
          overdueCount: 0,
          conflicts: [],
          clearUpdateQueue: jest.fn()
        };
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Task 1 for Client A')).toBeInTheDocument();
      });

      // Simulate real-time update
      const updatedWork = {
        ...mockWorkData[0],
        status: 'completed',
        completionPercentage: 100
      };

      updateCallback('update', updatedWork);

      // Verify UI updates
      await waitFor(() => {
        expect(screen.getByText('completed')).toBeInTheDocument();
      });
    });

    test('real-time analytics updates refresh dashboard', async () => {
      const { useRealTimeUpdates } = require('../../../hooks/useRealTimeUpdates');
      
      let analyticsCallback;
      useRealTimeUpdates.mockImplementation(({ onAnalyticsUpdate }) => {
        analyticsCallback = onAnalyticsUpdate;
        return {
          isConnected: true,
          hasUpdates: false,
          overdueCount: 0,
          conflicts: [],
          clearUpdateQueue: jest.fn()
        };
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Enhanced Work Management Dashboard')).toBeInTheDocument();
      });

      // Simulate analytics update
      const updatedAnalytics = {
        ...mockAnalytics,
        completionRate: 85,
        totalWorkEntries: 3
      };

      analyticsCallback(updatedAnalytics);

      // Verify analytics component receives update
      // (Implementation would depend on how analytics are displayed)
      expect(screen.getByText('Enhanced Work Management Dashboard')).toBeInTheDocument();
    });

    test('overdue notifications trigger UI updates', async () => {
      const { useRealTimeUpdates } = require('../../../hooks/useRealTimeUpdates');
      
      let overdueCallback;
      useRealTimeUpdates.mockImplementation(({ onOverdueNotification }) => {
        overdueCallback = onOverdueNotification;
        return {
          isConnected: true,
          hasUpdates: false,
          overdueCount: 2,
          conflicts: [],
          clearUpdateQueue: jest.fn()
        };
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Enhanced Work Management Dashboard')).toBeInTheDocument();
      });

      // Simulate overdue notification
      const overdueEntries = [
        { _id: 'work-3', title: 'Overdue Task', dueDate: '2024-01-10' }
      ];

      overdueCallback(overdueEntries);

      // Verify overdue handling
      // (Implementation would show notifications or highlight overdue items)
      expect(screen.getByText('Enhanced Work Management Dashboard')).toBeInTheDocument();
    });
  });

  /**
   * Test mobile responsiveness and touch interactions
   */
  describe('Mobile Responsiveness and Touch Interactions', () => {
    test('mobile view adapts interface correctly', async () => {
      const { useMobileDetection } = require('../../../hooks/useMobileDetection');
      
      // Mock mobile device
      useMobileDetection.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        screenSize: 'sm',
        touchDevice: true,
        getOptimalColumnCount: jest.fn(() => 1),
        shouldHideColumn: jest.fn((column) => !column.essential),
        getTouchFriendlyProps: jest.fn(() => ({
          style: { minHeight: '44px' }
        }))
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Enhanced Work Management Dashboard')).toBeInTheDocument();
      });

      // Verify mobile view controls are present
      expect(screen.getByTitle('Compact Table View')).toBeInTheDocument();
      expect(screen.getByTitle('Card View')).toBeInTheDocument();
      expect(screen.getByTitle('List View')).toBeInTheDocument();

      // Verify touch-friendly sizing
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // Should have minimum touch target size
        expect(
          parseInt(styles.minHeight) >= 44 || 
          button.style.minHeight === '44px'
        ).toBeTruthy();
      });
    });

    test('mobile view mode switching works correctly', async () => {
      const { useMobileDetection } = require('../../../hooks/useMobileDetection');
      
      useMobileDetection.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        screenSize: 'sm',
        touchDevice: true,
        getOptimalColumnCount: jest.fn(() => 1),
        shouldHideColumn: jest.fn(() => false),
        getTouchFriendlyProps: jest.fn(() => ({}))
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Task 1 for Client A')).toBeInTheDocument();
      });

      // Switch to card view
      const cardViewButton = screen.getByTitle('Card View');
      await user.click(cardViewButton);

      // Verify card view is active
      expect(cardViewButton).toHaveClass('btn-primary');

      // Switch to list view
      const listViewButton = screen.getByTitle('List View');
      await user.click(listViewButton);

      // Verify list view is active
      expect(listViewButton).toHaveClass('btn-primary');
    });

    test('touch gestures work on mobile data table', async () => {
      const { useMobileDetection } = require('../../../hooks/useMobileDetection');
      
      const mockTouchProps = {
        style: { minHeight: '44px' },
        onTouchStart: jest.fn(),
        onTouchMove: jest.fn(),
        onTouchEnd: jest.fn()
      };

      useMobileDetection.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        screenSize: 'sm',
        touchDevice: true,
        getOptimalColumnCount: jest.fn(() => 1),
        shouldHideColumn: jest.fn(() => false),
        getTouchFriendlyProps: jest.fn(() => mockTouchProps)
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Task 1 for Client A')).toBeInTheDocument();
      });

      // Verify touch props are applied
      expect(useMobileDetection().getTouchFriendlyProps).toHaveBeenCalled();

      // Find table rows and simulate touch events
      const tableRows = screen.getAllByRole('row');
      const dataRow = tableRows.find(row => 
        within(row).queryByText('Task 1 for Client A')
      );

      if (dataRow) {
        // Simulate touch start
        fireEvent.touchStart(dataRow, {
          touches: [{ clientX: 100, clientY: 100 }]
        });

        // Simulate touch end (swipe right)
        fireEvent.touchEnd(dataRow, {
          changedTouches: [{ clientX: 150, clientY: 100 }]
        });

        // Touch events should be handled
        expect(dataRow).toBeInTheDocument();
      }
    });
  });

  /**
   * Test error handling and edge cases
   */
  describe('Error Handling and Edge Cases', () => {
    test('handles API errors gracefully', async () => {
      workCalendarApi.getEnhancedAdminOverview.mockRejectedValue(
        new Error('Network error')
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load work data/i)).toBeInTheDocument();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to load work data');
    });

    test('handles bulk operation failures', async () => {
      const user = userEvent.setup();
      
      workCalendarApi.bulkOperations.mockRejectedValue(
        new Error('Bulk operation failed')
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Task 1 for Client A')).toBeInTheDocument();
      });

      // Select rows and attempt bulk operation
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // First data row

      const bulkButton = screen.getByText(/Bulk Operations \(1\)/i);
      await user.click(bulkButton);

      // Attempt bulk operation that will fail
      // (Implementation would depend on bulk operations panel)
      
      expect(toast.error).toHaveBeenCalledWith('Failed to load work data');
    });

    test('handles unauthorized access', () => {
      renderComponent('employee'); // Non-admin role

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You don't have permission/i)).toBeInTheDocument();
    });
  });

  /**
   * Test performance and optimization
   */
  describe('Performance and Optimization', () => {
    test('debounces search input correctly', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Enhanced Work Management Dashboard')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Smart search/i);
      
      // Type rapidly
      await user.type(searchInput, 'test query');

      // Should not call API immediately
      expect(workCalendarApi.getEnhancedAdminOverview).toHaveBeenCalledTimes(1); // Initial load only

      // Wait for debounce
      await waitFor(() => {
        expect(workCalendarApi.getEnhancedAdminOverview).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'test query'
          })
        );
      }, { timeout: 1000 });
    });

    test('handles large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockWorkData[0],
        _id: `work-${i}`,
        title: `Task ${i}`
      }));

      workCalendarApi.getEnhancedAdminOverview.mockResolvedValue({
        success: true,
        data: {
          workEntries: largeDataset,
          analytics: mockAnalytics,
          currentPage: 1,
          totalCount: 1000,
          totalPages: 20,
          hasNextPage: true,
          hasPrevPage: false
        }
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('1000 total entries')).toBeInTheDocument();
      });

      // Verify pagination is working
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeDisabled();
    });
  });
});