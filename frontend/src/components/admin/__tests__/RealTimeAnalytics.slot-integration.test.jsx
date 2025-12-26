import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealTimeAnalytics from '../RealTimeAnalytics';

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />
}));

describe('RealTimeAnalytics - Slot Integration Tests', () => {
  const mockAnalytics = {
    overall: {
      totalWork: 100,
      completedWork: 60,
      overdueWork: 10,
      inProgressWork: 30,
      totalEstimatedHours: 800,
      totalActualHours: 720
    },
    byClient: [
      {
        clientName: 'Client A',
        totalWork: 50,
        completedWork: 30,
        overdueWork: 5,
        totalSlots: 10,
        completedSlots: 6
      },
      {
        clientName: 'Client B',
        totalWork: 50,
        completedWork: 30,
        overdueWork: 5,
        totalSlots: 8,
        completedSlots: 4
      }
    ],
    byProject: [
      {
        projectName: 'Project Alpha',
        totalWork: 40,
        completedWork: 25,
        overdueWork: 3,
        totalSlots: 8,
        completedSlots: 5
      },
      {
        projectName: 'Project Beta',
        totalWork: 60,
        completedWork: 35,
        overdueWork: 7,
        totalSlots: 10,
        completedSlots: 5
      }
    ],
    byDepartment: [
      {
        departmentName: 'Engineering',
        totalWork: 70,
        completedWork: 45,
        overdueWork: 8
      }
    ],
    workloadByPriority: {
      urgent: 15,
      high: 25,
      medium: 40,
      low: 20
    }
  };

  const mockSlotMetrics = {
    availableSlots: 12,
    assignedSlots: 25,
    inProgressSlots: 18,
    completedSlots: 35,
    blockedSlots: 5
  };

  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Slot Metrics Display', () => {
    test('displays slot metrics cards when slot analytics are enabled', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Check for slot metrics cards
      expect(screen.getByText('Total Slots')).toBeInTheDocument();
      expect(screen.getByText('Available Slots')).toBeInTheDocument();
      expect(screen.getByText('Assigned Slots')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Blocked')).toBeInTheDocument();

      // Check slot metric values
      expect(screen.getByText('95')).toBeInTheDocument(); // Total slots
      expect(screen.getByText('12')).toBeInTheDocument(); // Available
      expect(screen.getByText('25')).toBeInTheDocument(); // Assigned
      expect(screen.getByText('18')).toBeInTheDocument(); // In Progress
      expect(screen.getByText('35')).toBeInTheDocument(); // Completed
      expect(screen.getByText('5')).toBeInTheDocument(); // Blocked
    });

    test('hides slot metrics when slot analytics are disabled', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={false}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Slot metrics should not be visible
      expect(screen.queryByText('Total Slots')).not.toBeInTheDocument();
      expect(screen.queryByText('Available Slots')).not.toBeInTheDocument();
    });

    test('handles missing slot metrics gracefully', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={null}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Should not crash and should not show slot metrics
      expect(screen.queryByText('Total Slots')).not.toBeInTheDocument();
    });
  });

  describe('Slot View Mode', () => {
    test('shows slots button when slot analytics are enabled', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByRole('button', { name: /slots/i })).toBeInTheDocument();
    });

    test('hides slots button when slot analytics are disabled', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={false}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.queryByRole('button', { name: /slots/i })).not.toBeInTheDocument();
    });

    test('switches to slot view mode when slots button is clicked', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      const slotsButton = screen.getByRole('button', { name: /slots/i });
      fireEvent.click(slotsButton);

      // Should show slot analytics content
      expect(screen.getByText('Slot Status Distribution')).toBeInTheDocument();
      expect(screen.getByText('Project Slot Progress')).toBeInTheDocument();
    });

    test('displays slot analytics charts in slot view mode', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Switch to slot view
      const slotsButton = screen.getByRole('button', { name: /slots/i });
      fireEvent.click(slotsButton);

      // Check for chart components
      expect(screen.getAllByTestId('responsive-container')).toHaveLength(2);
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  describe('Slot-based Filtering', () => {
    test('provides slot-based filter options', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      const availableSlotsButton = screen.getByRole('button', { name: /available slots/i });
      expect(availableSlotsButton).toBeInTheDocument();
    });

    test('calls onFilterChange when slot filter is applied', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      const availableSlotsButton = screen.getByRole('button', { name: /available slots/i });
      fireEvent.click(availableSlotsButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith('slotStatus', 'available');
    });

    test('includes slot filters in clear all filters action', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      const clearFiltersButton = screen.getByRole('button', { name: /clear all filters/i });
      fireEvent.click(clearFiltersButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith('slotStatus', 'all');
    });
  });

  describe('Slot Alerts Integration', () => {
    test('shows blocked slots alert when blocked slots exist', () => {
      const metricsWithBlockedSlots = {
        ...mockSlotMetrics,
        blockedSlots: 8
      };

      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={metricsWithBlockedSlots}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('blocked slots - resolve dependencies')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view blocked/i })).toBeInTheDocument();
    });

    test('shows capacity alert when no available slots exist', () => {
      const metricsWithNoAvailable = {
        ...mockSlotMetrics,
        availableSlots: 0,
        assignedSlots: 20
      };

      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={metricsWithNoAvailable}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('no available slots - capacity issue')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /review capacity/i })).toBeInTheDocument();
    });

    test('blocked slots alert switches to slot view and applies filter', () => {
      const metricsWithBlockedSlots = {
        ...mockSlotMetrics,
        blockedSlots: 8
      };

      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={metricsWithBlockedSlots}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      const viewBlockedButton = screen.getByRole('button', { name: /view blocked/i });
      fireEvent.click(viewBlockedButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith('slotStatus', 'blocked');
      // Should also switch to slot view mode
      expect(screen.getByText('Slot Status Distribution')).toBeInTheDocument();
    });
  });

  describe('Slot Trend Analysis', () => {
    test('displays project slot progress data correctly', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Switch to slot view
      const slotsButton = screen.getByRole('button', { name: /slots/i });
      fireEvent.click(slotsButton);

      // Should show project slot progress chart
      expect(screen.getByText('Project Slot Progress')).toBeInTheDocument();
    });

    test('handles empty slot data gracefully', () => {
      const emptySlotMetrics = {
        availableSlots: 0,
        assignedSlots: 0,
        inProgressSlots: 0,
        completedSlots: 0,
        blockedSlots: 0
      };

      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={emptySlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Switch to slot view
      const slotsButton = screen.getByRole('button', { name: /slots/i });
      fireEvent.click(slotsButton);

      // Should show empty state messages
      expect(screen.getByText('No Slot Data Available')).toBeInTheDocument();
      expect(screen.getByText('No Project Slot Data')).toBeInTheDocument();
    });
  });

  describe('Integration with Existing Analytics', () => {
    test('slot analytics coexist with existing analytics views', () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Should have all view mode buttons
      expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clients/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /projects/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /slots/i })).toBeInTheDocument();

      // Should show regular analytics by default
      expect(screen.getByText('Priority Distribution')).toBeInTheDocument();
      expect(screen.getByText('Department Workload')).toBeInTheDocument();
    });

    test('switching between views maintains slot functionality', async () => {
      render(
        <RealTimeAnalytics
          analytics={mockAnalytics}
          slotAnalytics={mockSlotMetrics}
          showSlotAnalytics={true}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Start in overview
      expect(screen.getByText('Priority Distribution')).toBeInTheDocument();

      // Switch to client view
      fireEvent.click(screen.getByRole('button', { name: /clients/i }));
      expect(screen.getByText('Client Work Distribution')).toBeInTheDocument();

      // Switch to slot view
      fireEvent.click(screen.getByRole('button', { name: /slots/i }));
      expect(screen.getByText('Slot Status Distribution')).toBeInTheDocument();

      // Switch back to overview
      fireEvent.click(screen.getByRole('button', { name: /overview/i }));
      expect(screen.getByText('Priority Distribution')).toBeInTheDocument();
    });
  });
});