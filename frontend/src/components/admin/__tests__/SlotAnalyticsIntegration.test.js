import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealTimeAnalytics from '../RealTimeAnalytics';
import workCalendarApi from '../../../api/workCalendarApi';

// Mock the API
jest.mock('../../../api/workCalendarApi');

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />
}));

// Mock moment
jest.mock('moment', () => {
  const moment = jest.requireActual('moment');
  return {
    __esModule: true,
    default: (date) => moment(date || '2024-01-15T10:00:00Z')
  };
});

describe('Slot Analytics Integration Tests', () => {
  const mockAnalytics = {
    overall: {
      totalWork: 100,
      completedWork: 60,
      inProgressWork: 25,
      overdueWork: 15,
      totalEstimatedHours: 800,
      totalActualHours: 720,
      avgProgress: 65
    },
    byClient: [
      {
        _id: 'client1',
        clientName: 'Test Client 1',
        totalWork: 50,
        completedWork: 30,
        overdueWork: 5,
        totalHours: 400
      }
    ],
    byProject: [
      {
        _id: 'project1',
        projectName: 'Test Project 1',
        totalWork: 40,
        completedWork: 25,
        overdueWork: 3,
        totalHours: 320,
        totalSlots: 20,
        completedSlots: 12
      }
    ],
    byDepartment: [
      {
        _id: 'dept1',
        departmentName: 'Engineering',
        totalWork: 60,
        completedWork: 35,
        overdueWork: 8,
        totalHours: 480
      }
    ],
    workloadByPriority: {
      urgent: 10,
      high: 25,
      medium: 45,
      low: 20
    }
  };

  const mockSlotAnalytics = {
    overall: {
      totalSlots: 100,
      availableSlots: 20,
      assignedSlots: 30,
      inProgressSlots: 25,
      completedSlots: 20,
      blockedSlots: 5,
      slotUtilizationRate: 75.0,
      slotCompletionRate: 20.0,
      averageSlotsPerProject: 10.0
    },
    byProject: [
      {
        _id: 'project1',
        projectName: 'Test Project 1',
        totalSlots: 20,
        availableSlots: 4,
        assignedSlots: 6,
        inProgressSlots: 5,
        completedSlots: 4,
        blockedSlots: 1,
        slotCompletionRate: 20.0,
        slotUtilizationRate: 75.0
      },
      {
        _id: 'project2',
        projectName: 'Test Project 2',
        totalSlots: 15,
        availableSlots: 3,
        assignedSlots: 5,
        inProgressSlots: 4,
        completedSlots: 3,
        blockedSlots: 0,
        slotCompletionRate: 20.0,
        slotUtilizationRate: 80.0
      }
    ],
    slotStatusDistribution: [
      { name: 'Available', value: 20, status: 'available' },
      { name: 'Assigned', value: 30, status: 'assigned' },
      { name: 'In progress', value: 25, status: 'in-progress' },
      { name: 'Completed', value: 20, status: 'completed' },
      { name: 'Blocked', value: 5, status: 'blocked' }
    ],
    completionTrends: [
      { _id: '2024-01-10', completedSlots: 3 },
      { _id: '2024-01-11', completedSlots: 5 },
      { _id: '2024-01-12', completedSlots: 2 },
      { _id: '2024-01-13', completedSlots: 4 },
      { _id: '2024-01-14', completedSlots: 6 }
    ],
    bottleneckAnalysis: [
      {
        projectId: 'project3',
        projectName: 'Blocked Project',
        blockedRatio: 40.0,
        totalSlots: 10,
        blockedSlots: 4
      }
    ]
  };

  const mockFilters = {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    client: 'all',
    project: 'all',
    status: 'all'
  };

  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    workCalendarApi.getSlotAnalytics.mockResolvedValue({
      data: {
        success: true,
        data: mockSlotAnalytics
      }
    });
  });

  describe('Slot Metrics Display', () => {
    test('displays slot metrics cards when slot analytics are available', async () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotAnalytics}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Check that slot metrics cards are displayed
      expect(screen.getByText('Total Slots')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // Total slots value
      
      expect(screen.getByText('Available Slots')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument(); // Available slots value
      
      expect(screen.getByText('Assigned Slots')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument(); // Assigned slots value
      
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });

    test('does not display slot metrics when slot analytics are not available', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={null}
          showSlotAnalytics={false}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Slot metrics should not be displayed
      expect(screen.queryByText('Total Slots')).not.toBeInTheDocument();
      expect(screen.queryByText('Available Slots')).not.toBeInTheDocument();
    });
  });

  describe('Slot Analytics View Mode', () => {
    test('displays slot analytics charts in slots view mode', async () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotAnalytics}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Switch to slots view mode
      const slotsButton = screen.getByText('Slots');
      fireEvent.click(slotsButton);

      // Check that slot analytics charts are displayed
      expect(screen.getByText('Slot Status Distribution')).toBeInTheDocument();
      expect(screen.getByText('Project Slot Progress')).toBeInTheDocument();
      
      // Check for chart components
      expect(screen.getAllByTestId('bar-chart')).toHaveLength(1);
      expect(screen.getAllByTestId('pie-chart')).toHaveLength(1);
    });

    test('displays slot completion trends when data is available', async () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotAnalytics}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Switch to slots view mode
      const slotsButton = screen.getByText('Slots');
      fireEvent.click(slotsButton);

      // Check for completion trends
      expect(screen.getByText('Slot Completion Trends (Last 30 Days)')).toBeInTheDocument();
      expect(screen.getAllByTestId('line-chart')).toHaveLength(1);
    });

    test('displays bottleneck analysis when bottlenecks exist', async () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotAnalytics}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Switch to slots view mode
      const slotsButton = screen.getByText('Slots');
      fireEvent.click(slotsButton);

      // Check for bottleneck analysis
      expect(screen.getByText('Slot Bottleneck Analysis')).toBeInTheDocument();
      expect(screen.getByText('Blocked Project')).toBeInTheDocument();
      expect(screen.getByText('40.0%')).toBeInTheDocument(); // Blocked ratio
    });
  });

  describe('Slot-based Filtering', () => {
    test('provides slot-based filter options in quick actions', async () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotAnalytics}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Check for slot-based filter button
      const availableSlotsButton = screen.getByText('Available Slots');
      expect(availableSlotsButton).toBeInTheDocument();

      // Click the filter button
      fireEvent.click(availableSlotsButton);

      // Verify filter change was called
      expect(mockOnFilterChange).toHaveBeenCalledWith('slotStatus', 'available');
    });

    test('handles slot status filtering correctly', async () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotAnalytics}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Test clear all filters includes slot filters
      const clearFiltersButton = screen.getByText('Clear All Filters');
      fireEvent.click(clearFiltersButton);

      // Verify slot status filter is cleared
      expect(mockOnFilterChange).toHaveBeenCalledWith('slotStatus', 'all');
    });
  });

  describe('Slot Analytics Alerts', () => {
    test('displays blocked slots alert when blocked slots exist', async () => {
      const slotAnalyticsWithBlocked = {
        ...mockSlotAnalytics,
        overall: {
          ...mockSlotAnalytics.overall,
          blockedSlots: 10
        }
      };

      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={slotAnalyticsWithBlocked}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Check for blocked slots alert
      expect(screen.getByText('blocked slots - resolve dependencies')).toBeInTheDocument();
      expect(screen.getByText('View Blocked')).toBeInTheDocument();
    });

    test('displays capacity alert when no available slots exist', async () => {
      const slotAnalyticsNoAvailable = {
        ...mockSlotAnalytics,
        overall: {
          ...mockSlotAnalytics.overall,
          availableSlots: 0,
          assignedSlots: 50
        }
      };

      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={slotAnalyticsNoAvailable}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Check for capacity alert
      expect(screen.getByText('no available slots - capacity issue')).toBeInTheDocument();
      expect(screen.getByText('Review Capacity')).toBeInTheDocument();
    });

    test('handles alert button clicks correctly', async () => {
      const slotAnalyticsWithBlocked = {
        ...mockSlotAnalytics,
        overall: {
          ...mockSlotAnalytics.overall,
          blockedSlots: 10
        }
      };

      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={slotAnalyticsWithBlocked}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Click the "View Blocked" button
      const viewBlockedButton = screen.getByText('View Blocked');
      fireEvent.click(viewBlockedButton);

      // Verify filter changes
      expect(mockOnFilterChange).toHaveBeenCalledWith('slotStatus', 'blocked');
    });
  });

  describe('Slot Analytics API Integration', () => {
    test('fetches slot analytics when filters change', async () => {
      const { rerender } = render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={null}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Wait for initial render
      await waitFor(() => {
        expect(workCalendarApi.getSlotAnalytics).toHaveBeenCalledWith(mockFilters);
      });

      // Change filters
      const newFilters = { ...mockFilters, client: 'client1' };
      rerender(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={null}
          showSlotAnalytics={true}
          filters={newFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Verify API is called with new filters
      await waitFor(() => {
        expect(workCalendarApi.getSlotAnalytics).toHaveBeenCalledWith(newFilters);
      });
    });

    test('handles slot analytics API errors gracefully', async () => {
      // Mock API error
      workCalendarApi.getSlotAnalytics.mockRejectedValue(new Error('API Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={null}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Wait for error handling
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch slot analytics:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    test('does not fetch slot analytics when showSlotAnalytics is false', async () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={null}
          showSlotAnalytics={false}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Wait a bit to ensure no API call is made
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify API is not called
      expect(workCalendarApi.getSlotAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('Slot Analytics Export Integration', () => {
    test('includes slot analytics in export functionality', async () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotAnalytics}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // The component should be ready to export slot analytics data
      // This would be tested in the actual export component integration
      expect(screen.getByText('Total Slots')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    test('updates slot metrics when slot analytics data changes', async () => {
      const { rerender } = render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotAnalytics}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Initial state
      expect(screen.getByText('20')).toBeInTheDocument(); // Available slots

      // Update slot analytics
      const updatedSlotAnalytics = {
        ...mockSlotAnalytics,
        overall: {
          ...mockSlotAnalytics.overall,
          availableSlots: 15
        }
      };

      rerender(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={updatedSlotAnalytics}
          showSlotAnalytics={true}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Updated state
      expect(screen.getByText('15')).toBeInTheDocument(); // Updated available slots
    });
  });
});