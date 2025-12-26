import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedExportPanel from '../EnhancedExportPanel';
import workCalendarApi from '../../../api/workCalendarApi';

// Mock the API
jest.mock('../../../api/workCalendarApi');

// Mock the auth context
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'admin' }
  })
}));

// Mock moment
jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  return {
    ...actualMoment,
    default: () => ({
      format: jest.fn(() => '2024-01-15 10:30:00')
    })
  };
});

describe('EnhancedExportPanel - Slot Integration Tests', () => {
  const mockWorkData = [
    {
      id: 1,
      title: 'Task 1',
      status: 'in-progress',
      priority: 'high',
      client: { name: 'Client A' },
      assignedTo: { name: 'John Doe' },
      startDate: '2024-01-01',
      dueDate: '2024-01-15',
      completionPercentage: 50,
      slot: {
        slotNumber: 'S001',
        status: 'in-progress',
        assignedDate: '2024-01-01',
        estimatedHours: 8,
        actualHours: 4,
        progressContribution: 25
      },
      project: {
        name: 'Project Alpha',
        totalSlots: 10,
        completedSlots: 3,
        slotCompletionRate: 30
      }
    },
    {
      id: 2,
      title: 'Task 2',
      status: 'completed',
      priority: 'medium',
      client: { name: 'Client B' },
      assignedTo: { name: 'Jane Smith' },
      startDate: '2024-01-02',
      dueDate: '2024-01-10',
      completionPercentage: 100,
      slot: {
        slotNumber: 'S002',
        status: 'completed',
        assignedDate: '2024-01-02',
        completedDate: '2024-01-10',
        estimatedHours: 6,
        actualHours: 5,
        progressContribution: 50
      },
      project: {
        name: 'Project Beta',
        totalSlots: 8,
        completedSlots: 5,
        slotCompletionRate: 62.5
      }
    }
  ];

  const mockSlotAnalytics = {
    availableSlots: 15,
    assignedSlots: 20,
    inProgressSlots: 12,
    completedSlots: 25,
    blockedSlots: 3
  };

  const mockFilters = {
    status: 'all',
    client: 'all'
  };

  const mockOnHide = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    workCalendarApi.exportWorkData.mockResolvedValue(new Blob(['test'], { type: 'text/csv' }));
  });

  describe('Slot Column Display', () => {
    test('shows slot columns when slot analytics are available', () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Check for slot column section
      expect(screen.getByText('Slot Columns')).toBeInTheDocument();
      
      // Check for specific slot columns
      expect(screen.getByText('Slot Number')).toBeInTheDocument();
      expect(screen.getByText('Slot Status')).toBeInTheDocument();
      expect(screen.getByText('Slot Assigned Date')).toBeInTheDocument();
      expect(screen.getByText('Slot Completed Date')).toBeInTheDocument();
      expect(screen.getByText('Slot Progress Contribution')).toBeInTheDocument();
      expect(screen.getByText('Project Total Slots')).toBeInTheDocument();
      expect(screen.getByText('Project Completed Slots')).toBeInTheDocument();
    });

    test('hides slot columns when slot analytics are not available', () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={null}
          showSlotColumns={false}
        />
      );

      // Slot columns section should not be visible
      expect(screen.queryByText('Slot Columns')).not.toBeInTheDocument();
      expect(screen.queryByText('Slot Number')).not.toBeInTheDocument();
    });

    test('allows selecting all slot columns at once', () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      const selectAllSlotsButton = screen.getByText('Select All Slots');
      fireEvent.click(selectAllSlotsButton);

      // Check that slot columns are selected
      const slotNumberCheckbox = screen.getByLabelText('Slot Number');
      const slotStatusCheckbox = screen.getByLabelText('Slot Status');
      
      expect(slotNumberCheckbox).toBeChecked();
      expect(slotStatusCheckbox).toBeChecked();
    });
  });

  describe('Slot Analytics Export Options', () => {
    test('shows slot analytics option when slot data is available', () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      expect(screen.getByText('Include Slot Analytics Summary')).toBeInTheDocument();
    });

    test('hides slot analytics option when slot data is not available', () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={null}
          showSlotColumns={false}
        />
      );

      expect(screen.queryByText('Include Slot Analytics Summary')).not.toBeInTheDocument();
    });

    test('includes slot analytics in export data when enabled', async () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Enable slot analytics
      const slotAnalyticsCheckbox = screen.getByLabelText('Include Slot Analytics Summary');
      fireEvent.click(slotAnalyticsCheckbox);

      // Select some columns and export
      const titleCheckbox = screen.getByLabelText('Work Title');
      fireEvent.click(titleCheckbox);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(workCalendarApi.exportWorkData).toHaveBeenCalledWith(
          expect.objectContaining({
            includeSlotAnalytics: true,
            slotAnalytics: mockSlotAnalytics
          })
        );
      });
    });
  });

  describe('Export Formats with Slot Data', () => {
    test('includes slot data in CSV export', async () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Select slot columns
      const slotNumberCheckbox = screen.getByLabelText('Slot Number');
      const slotStatusCheckbox = screen.getByLabelText('Slot Status');
      fireEvent.click(slotNumberCheckbox);
      fireEvent.click(slotStatusCheckbox);

      // Export CSV
      const csvButton = screen.getByRole('button', { name: /csv/i });
      fireEvent.click(csvButton);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(workCalendarApi.exportWorkData).toHaveBeenCalledWith(
          expect.objectContaining({
            format: 'csv',
            columns: expect.arrayContaining(['slot.slotNumber', 'slot.status'])
          })
        );
      });
    });

    test('includes slot data in Excel export', async () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Select Excel format
      const excelButton = screen.getByRole('button', { name: /excel/i });
      fireEvent.click(excelButton);

      // Select slot columns
      const slotProgressCheckbox = screen.getByLabelText('Slot Progress Contribution');
      fireEvent.click(slotProgressCheckbox);

      const exportButton = screen.getByRole('button', { name: /export xlsx/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(workCalendarApi.exportWorkData).toHaveBeenCalledWith(
          expect.objectContaining({
            format: 'excel',
            columns: expect.arrayContaining(['slot.progressContribution'])
          })
        );
      });
    });

    test('includes slot data in PDF export', async () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Select PDF format
      const pdfButton = screen.getByRole('button', { name: /pdf/i });
      fireEvent.click(pdfButton);

      // Select project slot columns
      const totalSlotsCheckbox = screen.getByLabelText('Project Total Slots');
      const completedSlotsCheckbox = screen.getByLabelText('Project Completed Slots');
      fireEvent.click(totalSlotsCheckbox);
      fireEvent.click(completedSlotsCheckbox);

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(workCalendarApi.exportWorkData).toHaveBeenCalledWith(
          expect.objectContaining({
            format: 'pdf',
            columns: expect.arrayContaining(['project.totalSlots', 'project.completedSlots'])
          })
        );
      });
    });
  });

  describe('Print View with Slot Data', () => {
    test('includes slot analytics in print view when enabled', () => {
      // Mock window.open
      const mockWindow = {
        document: {
          write: jest.fn(),
          close: jest.fn()
        }
      };
      global.window.open = jest.fn(() => mockWindow);

      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Enable slot analytics
      const slotAnalyticsCheckbox = screen.getByLabelText('Include Slot Analytics Summary');
      fireEvent.click(slotAnalyticsCheckbox);

      // Select print view
      const printButton = screen.getByRole('button', { name: /print view/i });
      fireEvent.click(printButton);

      const exportButton = screen.getByRole('button', { name: /export html/i });
      fireEvent.click(exportButton);

      // Check that print view was opened
      expect(window.open).toHaveBeenCalled();
      expect(mockWindow.document.write).toHaveBeenCalled();

      // Check that the HTML content includes slot analytics
      const htmlContent = mockWindow.document.write.mock.calls[0][0];
      expect(htmlContent).toContain('Slot Analytics');
      expect(htmlContent).toContain('Total Slots');
      expect(htmlContent).toContain('Available');
      expect(htmlContent).toContain('Completed');
    });

    test('includes slot columns in print view table when selected', () => {
      const mockWindow = {
        document: {
          write: jest.fn(),
          close: jest.fn()
        }
      };
      global.window.open = jest.fn(() => mockWindow);

      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Select slot columns
      const slotNumberCheckbox = screen.getByLabelText('Slot Number');
      const slotStatusCheckbox = screen.getByLabelText('Slot Status');
      fireEvent.click(slotNumberCheckbox);
      fireEvent.click(slotStatusCheckbox);

      // Select print view
      const printButton = screen.getByRole('button', { name: /print view/i });
      fireEvent.click(printButton);

      const exportButton = screen.getByRole('button', { name: /export html/i });
      fireEvent.click(exportButton);

      // Check that the HTML content includes slot columns
      const htmlContent = mockWindow.document.write.mock.calls[0][0];
      expect(htmlContent).toContain('Slot #');
      expect(htmlContent).toContain('Slot Status');
      expect(htmlContent).toContain('S001');
      expect(htmlContent).toContain('S002');
    });
  });

  describe('Column Selection with Slot Data', () => {
    test('shows correct column count including slot columns', () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Should show total columns including slot columns
      const columnCount = screen.getByText(/\d+ of \d+ columns selected/);
      expect(columnCount).toBeInTheDocument();
      
      // Should show slot column count
      const slotColumnCount = screen.getByText(/\(\d+ slot columns\)/);
      expect(slotColumnCount).toBeInTheDocument();
    });

    test('updates slot column count when slot columns are selected', () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Select a slot column
      const slotNumberCheckbox = screen.getByLabelText('Slot Number');
      fireEvent.click(slotNumberCheckbox);

      // Should update the slot column count
      expect(screen.getByText(/\(1 slot columns\)/)).toBeInTheDocument();

      // Select another slot column
      const slotStatusCheckbox = screen.getByLabelText('Slot Status');
      fireEvent.click(slotStatusCheckbox);

      // Should update to 2 slot columns
      expect(screen.getByText(/\(2 slot columns\)/)).toBeInTheDocument();
    });
  });

  describe('Integration with Existing Export Features', () => {
    test('slot columns work with background processing', async () => {
      const largeWorkData = Array(150).fill(null).map((_, index) => ({
        ...mockWorkData[0],
        id: index + 1,
        title: `Task ${index + 1}`
      }));

      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={largeWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Background processing should be enabled for large datasets
      const backgroundCheckbox = screen.getByLabelText(/Use Background Processing/);
      expect(backgroundCheckbox).toBeChecked();

      // Select slot columns
      const slotNumberCheckbox = screen.getByLabelText('Slot Number');
      fireEvent.click(slotNumberCheckbox);

      // Mock background job response
      workCalendarApi.exportWorkData.mockResolvedValue({
        success: true,
        data: { jobId: 'job123', status: 'queued' }
      });

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(workCalendarApi.exportWorkData).toHaveBeenCalledWith(
          expect.objectContaining({
            backgroundProcessing: true,
            columns: expect.arrayContaining(['slot.slotNumber'])
          })
        );
      });
    });

    test('slot analytics work with existing analytics export', async () => {
      render(
        <EnhancedExportPanel
          show={true}
          onHide={mockOnHide}
          filters={mockFilters}
          workData={mockWorkData}
          slotAnalytics={mockSlotAnalytics}
          showSlotColumns={true}
        />
      );

      // Enable both regular and slot analytics
      const analyticsCheckbox = screen.getByLabelText('Include Analytics Summary');
      const slotAnalyticsCheckbox = screen.getByLabelText('Include Slot Analytics Summary');
      
      fireEvent.click(analyticsCheckbox);
      fireEvent.click(slotAnalyticsCheckbox);

      const exportButton = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(workCalendarApi.exportWorkData).toHaveBeenCalledWith(
          expect.objectContaining({
            includeAnalytics: true,
            includeSlotAnalytics: true,
            slotAnalytics: mockSlotAnalytics
          })
        );
      });
    });
  });
});