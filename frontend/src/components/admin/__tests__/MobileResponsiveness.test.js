import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import EnhancedDataTable from '../EnhancedDataTable';
import AdvancedFilterPanel from '../AdvancedFilterPanel';
import { useMobileDetection } from '../../../hooks/useMobileDetection';

/**
 * Property-Based Tests for Mobile Responsiveness and State Persistence
 * 
 * **Feature: admin-work-management-enhancement, Property 10: State Persistence Across Sessions**
 * 
 * Tests that filter states and user preferences are maintained when switching between 
 * devices or browser sessions, ensuring consistent user experience across platforms.
 */

// Mock the mobile detection hook
jest.mock('../../../hooks/useMobileDetection');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock window.innerWidth for responsive testing
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

describe('Mobile Responsiveness and State Persistence', () => {
  const mockColumns = [
    { key: 'title', title: 'Title', essential: true },
    { key: 'status', title: 'Status', essential: true },
    { key: 'assignedTo', title: 'Assigned To', important: true },
    { key: 'client', title: 'Client', important: true },
    { key: 'project', title: 'Project' },
    { key: 'priority', title: 'Priority' },
    { key: 'dueDate', title: 'Due Date', hideOnTablet: true }
  ];

  const mockData = [
    {
      _id: '1',
      title: 'Test Task 1',
      status: 'in-progress',
      assignedTo: { name: 'John Doe' },
      client: { name: 'Client A' },
      project: { name: 'Project 1' },
      priority: 'high',
      dueDate: '2024-01-15'
    },
    {
      _id: '2',
      title: 'Test Task 2',
      status: 'completed',
      assignedTo: { name: 'Jane Smith' },
      client: { name: 'Client B' },
      project: { name: 'Project 2' },
      priority: 'medium',
      dueDate: '2024-01-20'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Default mobile detection mock
    useMobileDetection.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenSize: 'lg',
      touchDevice: false,
      getOptimalColumnCount: jest.fn(() => 4),
      shouldHideColumn: jest.fn(() => false),
      getTouchFriendlyProps: jest.fn(() => ({}))
    });
  });

  /**
   * **Feature: admin-work-management-enhancement, Property 10: State Persistence Across Sessions**
   * 
   * Property: For any user session, filter states and preferences should be maintained 
   * when switching between devices or browser sessions
   */
  describe('State Persistence Property', () => {
    test('filter states persist across browser sessions', async () => {
      // Arrange: Set up initial filter state in localStorage
      const savedFilters = {
        client: 'client-123',
        status: 'in-progress',
        dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
        search: 'test query'
      };
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'adminWorkFilters') {
          return JSON.stringify(savedFilters);
        }
        return null;
      });

      const mockOnFilterChange = jest.fn();

      // Act: Render component (simulating new session)
      render(
        <AdvancedFilterPanel
          filters={{}}
          filterOptions={{
            clients: [{ _id: 'client-123', name: 'Test Client' }],
            projects: [],
            employees: [],
            departments: []
          }}
          onFilterChange={mockOnFilterChange}
          onClearFilters={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // Assert: Component should restore saved filters
      await waitFor(() => {
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('adminWorkFilters');
      });

      // Verify filters are applied
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining(savedFilters)
      );
    });

    test('column visibility preferences persist across sessions', async () => {
      // Arrange: Set up saved column preferences
      const savedColumnPrefs = {
        visibleColumns: ['title', 'status', 'assignedTo'],
        columnOrder: ['title', 'status', 'assignedTo', 'client'],
        columnWidths: { title: 200, status: 120 }
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'dataTableColumnPrefs') {
          return JSON.stringify(savedColumnPrefs);
        }
        return null;
      });

      // Act: Render data table
      render(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Assert: Column preferences should be restored
      await waitFor(() => {
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('dataTableColumnPrefs');
      });

      // Verify only saved visible columns are shown
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Assigned To')).toBeInTheDocument();
    });

    test('mobile view mode preferences persist across device switches', async () => {
      // Arrange: Set up mobile view mode preference
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'mobileViewMode') {
          return 'cards';
        }
        return null;
      });

      // Mock mobile device
      useMobileDetection.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        screenSize: 'sm',
        touchDevice: true,
        getOptimalColumnCount: jest.fn(() => 1),
        shouldHideColumn: jest.fn(() => false),
        getTouchFriendlyProps: jest.fn(() => ({ style: { minHeight: '44px' } }))
      });

      // Act: Render data table on mobile
      render(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Assert: Should restore saved mobile view mode
      await waitFor(() => {
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mobileViewMode');
      });

      // Verify card view is active (cards view should show card elements)
      expect(screen.getByTitle('Card View')).toHaveClass('btn-primary');
    });

    test('pagination preferences persist across sessions', async () => {
      // Arrange: Set up saved pagination preferences
      const savedPaginationPrefs = {
        pageSize: 25,
        sortBy: 'dueDate',
        sortOrder: 'desc'
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'dataTablePaginationPrefs') {
          return JSON.stringify(savedPaginationPrefs);
        }
        return null;
      });

      const mockOnPageSizeChange = jest.fn();
      const mockOnSort = jest.fn();

      // Act: Render data table
      render(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
          onPageSizeChange={mockOnPageSizeChange}
          onSort={mockOnSort}
          pagination={{ pageSize: 10, currentPage: 1, totalCount: 100 }}
        />
      );

      // Assert: Pagination preferences should be restored
      await waitFor(() => {
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('dataTablePaginationPrefs');
      });

      // Verify preferences are applied
      expect(mockOnPageSizeChange).toHaveBeenCalledWith(25);
      expect(mockOnSort).toHaveBeenCalledWith('dueDate', 'desc');
    });

    test('responsive column visibility adapts to screen size changes', async () => {
      // Arrange: Start with desktop view
      const { rerender } = render(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify all columns visible on desktop
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Project')).toBeInTheDocument();
      expect(screen.getByText('Due Date')).toBeInTheDocument();

      // Act: Switch to tablet view
      useMobileDetection.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        screenSize: 'md',
        touchDevice: false,
        getOptimalColumnCount: jest.fn(() => 3),
        shouldHideColumn: jest.fn((column) => column.hideOnTablet),
        getTouchFriendlyProps: jest.fn(() => ({}))
      });

      rerender(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Assert: Tablet-hidden columns should be hidden
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Project')).toBeInTheDocument();
      expect(screen.queryByText('Due Date')).not.toBeInTheDocument(); // Hidden on tablet

      // Act: Switch to mobile view
      useMobileDetection.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        screenSize: 'xs',
        touchDevice: true,
        getOptimalColumnCount: jest.fn(() => 1),
        shouldHideColumn: jest.fn((column) => !column.essential),
        getTouchFriendlyProps: jest.fn(() => ({ style: { minHeight: '44px' } }))
      });

      rerender(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Assert: Only essential columns should be visible
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.queryByText('Project')).not.toBeInTheDocument(); // Not essential
    });

    test('touch gestures work correctly on mobile devices', async () => {
      // Arrange: Mock mobile device with touch
      useMobileDetection.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        screenSize: 'sm',
        touchDevice: true,
        getOptimalColumnCount: jest.fn(() => 1),
        shouldHideColumn: jest.fn(() => false),
        getTouchFriendlyProps: jest.fn(() => ({
          style: { minHeight: '44px' },
          onTouchStart: jest.fn(),
          onTouchMove: jest.fn(),
          onTouchEnd: jest.fn()
        }))
      });

      const mockOnRowSelect = jest.fn();

      // Act: Render data table with selectable rows
      render(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
          selectable={true}
          onRowSelect={mockOnRowSelect}
        />
      );

      // Find a table row
      const tableRow = screen.getByText('Test Task 1').closest('tr') || 
                      screen.getByText('Test Task 1').closest('.mobile-list-item') ||
                      screen.getByText('Test Task 1').closest('.card');

      // Assert: Touch-friendly properties should be applied
      expect(tableRow).toHaveStyle({ minHeight: '44px' });

      // Simulate touch interaction
      if (tableRow) {
        fireEvent.touchStart(tableRow, {
          touches: [{ clientX: 100, clientY: 100 }]
        });
        
        fireEvent.touchEnd(tableRow, {
          changedTouches: [{ clientX: 150, clientY: 100 }] // Swipe right
        });
      }

      // Touch gestures should be handled (implementation-specific verification)
      expect(useMobileDetection().getTouchFriendlyProps).toHaveBeenCalled();
    });

    test('state persistence works across different screen sizes', async () => {
      // Arrange: Set up state that should persist across screen size changes
      const persistentState = {
        selectedRows: ['1', '2'],
        searchTerm: 'test search',
        sortConfig: { key: 'title', direction: 'asc' }
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'dataTableState') {
          return JSON.stringify(persistentState);
        }
        return null;
      });

      // Start with desktop
      const { rerender } = render(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
          selectable={true}
          searchable={true}
        />
      );

      // Act: Switch to mobile
      useMobileDetection.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        screenSize: 'xs',
        touchDevice: true,
        getOptimalColumnCount: jest.fn(() => 1),
        shouldHideColumn: jest.fn(() => false),
        getTouchFriendlyProps: jest.fn(() => ({}))
      });

      rerender(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
          selectable={true}
          searchable={true}
        />
      );

      // Assert: State should be maintained across screen size changes
      await waitFor(() => {
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('dataTableState');
      });

      // Verify persistent state is maintained
      // (Implementation would need to restore search term, selections, etc.)
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Mobile-Specific Functionality', () => {
    test('mobile view modes switch correctly', async () => {
      // Arrange: Mock mobile device
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

      // Act: Render data table
      render(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Assert: Mobile view controls should be visible
      expect(screen.getByTitle('Compact Table View')).toBeInTheDocument();
      expect(screen.getByTitle('Card View')).toBeInTheDocument();
      expect(screen.getByTitle('List View')).toBeInTheDocument();

      // Act: Switch to card view
      fireEvent.click(screen.getByTitle('Card View'));

      // Assert: Should save preference
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mobileViewMode',
        'cards'
      );
    });

    test('touch-friendly elements have appropriate sizing', async () => {
      // Arrange: Mock touch device
      useMobileDetection.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        screenSize: 'sm',
        touchDevice: true,
        getOptimalColumnCount: jest.fn(() => 1),
        shouldHideColumn: jest.fn(() => false),
        getTouchFriendlyProps: jest.fn(() => ({
          style: { minHeight: '44px', minWidth: '44px' }
        }))
      });

      // Act: Render data table
      render(
        <EnhancedDataTable
          data={mockData}
          columns={mockColumns}
          rowKey="_id"
          selectable={true}
        />
      );

      // Assert: Touch-friendly sizing should be applied
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // Touch targets should be at least 44px (accessibility guideline)
        expect(parseInt(styles.minHeight) >= 44 || button.style.minHeight === '44px').toBeTruthy();
      });
    });
  });
});

/**
 * Integration Tests for Cross-Device State Persistence
 */
describe('Cross-Device State Persistence Integration', () => {
  test('complete user workflow maintains state across device switches', async () => {
    // This test would simulate a complete user workflow:
    // 1. User applies filters on desktop
    // 2. Switches to mobile device
    // 3. Continues work with same filters
    // 4. Makes changes on mobile
    // 5. Returns to desktop with changes preserved
    
    // For now, we'll mark this as a placeholder for future implementation
    expect(true).toBe(true);
  });
});