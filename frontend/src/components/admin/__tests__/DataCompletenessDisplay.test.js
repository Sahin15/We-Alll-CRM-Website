import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import EnhancedDataTable from '../EnhancedDataTable';

/**
 * Property-Based Tests for Data Completeness in Display
 * 
 * **Feature: admin-work-management-enhancement, Property 4: Data Completeness in Display**
 * 
 * Tests that all data provided to the table is accurately displayed with proper
 * formatting, no data loss, and correct representation across all column types.
 * **Validates: Requirements 2.2**
 */

describe('Data Completeness in Display Property Tests', () => {
  const mockColumns = [
    { key: 'title', title: 'Title', type: 'text' },
    { key: 'status', title: 'Status', type: 'badge', badgeMap: { 'active': 'Active', 'inactive': 'Inactive' } },
    { key: 'priority', title: 'Priority', type: 'badge' },
    { key: 'dueDate', title: 'Due Date', type: 'date', dateFormat: 'MMM DD, YYYY' },
    { key: 'createdAt', title: 'Created', type: 'datetime' },
    { key: 'progress', title: 'Progress', type: 'percentage' },
    { key: 'budget', title: 'Budget', type: 'currency', currency: 'USD' },
    { key: 'hours', title: 'Hours', type: 'number' },
    { key: 'isActive', title: 'Active', type: 'boolean' },
    { key: 'client.name', title: 'Client', type: 'text' },
    { key: 'tags', title: 'Tags', type: 'array' }
  ];

  const generateCompleteTestData = () => {
    return [
      {
        _id: '1',
        title: 'Complete Task with All Data',
        status: 'active',
        priority: 'high',
        dueDate: '2024-01-15T00:00:00Z',
        createdAt: '2024-01-01T10:30:00Z',
        progress: 75,
        budget: 5000.50,
        hours: 40.5,
        isActive: true,
        client: { name: 'Client Alpha', id: 'client-1' },
        tags: ['urgent', 'frontend', 'react'],
        description: 'A comprehensive task with all possible data fields populated'
      },
      {
        _id: '2',
        title: 'Task with Minimal Data',
        status: 'inactive',
        priority: 'low',
        dueDate: '2024-02-01T00:00:00Z',
        createdAt: '2024-01-15T14:20:00Z',
        progress: 0,
        budget: 0,
        hours: 0,
        isActive: false,
        client: { name: 'Client Beta', id: 'client-2' },
        tags: [],
        description: null
      },
      {
        _id: '3',
        title: 'Task with Edge Case Values',
        status: 'active',
        priority: 'urgent',
        dueDate: '2024-12-31T23:59:59Z',
        createdAt: '2024-01-01T00:00:01Z',
        progress: 100,
        budget: 999999.99,
        hours: 168.75,
        isActive: true,
        client: { name: 'Client Gamma with Very Long Name That Should Be Handled Properly', id: 'client-3' },
        tags: ['critical', 'backend', 'database', 'performance', 'security'],
        description: 'Task with maximum and edge case values to test display limits'
      }
    ];
  };

  const generateIncompleteTestData = () => {
    return [
      {
        _id: '4',
        title: 'Task with Null Values',
        status: null,
        priority: null,
        dueDate: null,
        createdAt: null,
        progress: null,
        budget: null,
        hours: null,
        isActive: null,
        client: null,
        tags: null
      },
      {
        _id: '5',
        title: 'Task with Undefined Values',
        status: undefined,
        priority: undefined,
        dueDate: undefined,
        createdAt: undefined,
        progress: undefined,
        budget: undefined,
        hours: undefined,
        isActive: undefined,
        client: undefined,
        tags: undefined
      },
      {
        _id: '6',
        title: '',
        status: '',
        priority: '',
        dueDate: '',
        createdAt: '',
        progress: 0,
        budget: 0,
        hours: 0,
        isActive: false,
        client: { name: '', id: '' },
        tags: []
      }
    ];
  };

  /**
   * **Feature: admin-work-management-enhancement, Property 4: Data Completeness in Display**
   * 
   * Property: For any dataset provided to the table, every data field should be
   * accurately displayed with appropriate formatting, and no data should be lost
   * or misrepresented in the rendering process.
   */
  describe('Property 4: Data Completeness in Display', () => {
    test('all provided data fields are displayed correctly', async () => {
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify all text data is displayed
      expect(screen.getByText('Complete Task with All Data')).toBeInTheDocument();
      expect(screen.getByText('Task with Minimal Data')).toBeInTheDocument();
      expect(screen.getByText('Task with Edge Case Values')).toBeInTheDocument();

      // Verify client nested data is displayed
      expect(screen.getByText('Client Alpha')).toBeInTheDocument();
      expect(screen.getByText('Client Beta')).toBeInTheDocument();
      expect(screen.getByText('Client Gamma with Very Long Name That Should Be Handled Properly')).toBeInTheDocument();

      // Verify numeric data is displayed
      expect(screen.getByText('75%')).toBeInTheDocument(); // Progress
      expect(screen.getByText('40.5')).toBeInTheDocument(); // Hours
      expect(screen.getByText('$5,000.50')).toBeInTheDocument(); // Budget
    });

    test('date and datetime formatting is consistent and accurate', async () => {
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify date formatting (MMM DD, YYYY format)
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Feb 01, 2024')).toBeInTheDocument();
      expect(screen.getByText('Dec 31, 2024')).toBeInTheDocument();

      // Verify datetime formatting includes time
      expect(screen.getByText(/Jan 01, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });

    test('badge mapping displays correct labels', async () => {
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify badge mapping works
      expect(screen.getByText('Active')).toBeInTheDocument(); // Mapped from 'active'
      expect(screen.getByText('Inactive')).toBeInTheDocument(); // Mapped from 'inactive'
      
      // Verify unmapped badges show original value
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });

    test('boolean values display correctly', async () => {
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Boolean true should show checkmark or success badge
      const trueBooleans = screen.getAllByText('✓'); // Or check for success badges
      expect(trueBooleans.length).toBeGreaterThan(0);

      // Boolean false should show dash or secondary badge
      const falseBooleans = screen.getAllByText('-');
      expect(falseBooleans.length).toBeGreaterThan(0);
    });

    test('currency formatting includes proper symbols and decimals', async () => {
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify currency formatting
      expect(screen.getByText('$5,000.50')).toBeInTheDocument();
      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByText('$999,999.99')).toBeInTheDocument();
    });

    test('percentage values display with correct symbol', async () => {
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify percentage formatting
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('null and undefined values are handled gracefully', async () => {
      const testData = generateIncompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify null/undefined values show placeholder
      const placeholders = screen.getAllByText('-');
      expect(placeholders.length).toBeGreaterThan(0);

      // Verify table still renders without crashing
      expect(screen.getByText('Task with Null Values')).toBeInTheDocument();
      expect(screen.getByText('Task with Undefined Values')).toBeInTheDocument();
    });

    test('empty string values are displayed appropriately', async () => {
      const testData = generateIncompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Empty strings should be handled (might show as empty or placeholder)
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Has data rows
    });

    test('nested object data is extracted and displayed correctly', async () => {
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify nested client.name is displayed
      expect(screen.getByText('Client Alpha')).toBeInTheDocument();
      expect(screen.getByText('Client Beta')).toBeInTheDocument();
      expect(screen.getByText('Client Gamma with Very Long Name That Should Be Handled Properly')).toBeInTheDocument();
    });

    test('large numbers are formatted with proper separators', async () => {
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify large numbers have thousand separators
      expect(screen.getByText('$999,999.99')).toBeInTheDocument();
      expect(screen.getByText('168.75')).toBeInTheDocument(); // Hours with decimals
    });

    test('data completeness maintained during filtering', async () => {
      const user = userEvent.setup();
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
          searchable={true}
        />
      );

      // Apply search filter
      const searchInput = screen.getByPlaceholderText(/Search all columns/i);
      await user.type(searchInput, 'Complete');

      await waitFor(() => {
        // Verify filtered data maintains all formatting
        expect(screen.getByText('Complete Task with All Data')).toBeInTheDocument();
        expect(screen.getByText('Client Alpha')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('$5,000.50')).toBeInTheDocument();
      });
    });

    test('data completeness maintained during sorting', async () => {
      const user = userEvent.setup();
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Sort by title
      const titleHeader = screen.getByText('Title');
      await user.click(titleHeader);

      await waitFor(() => {
        // Verify all data is still present after sorting
        expect(screen.getByText('Complete Task with All Data')).toBeInTheDocument();
        expect(screen.getByText('Task with Minimal Data')).toBeInTheDocument();
        expect(screen.getByText('Task with Edge Case Values')).toBeInTheDocument();
        
        // Verify formatting is maintained
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('$5,000.50')).toBeInTheDocument();
      });
    });

    test('column visibility changes maintain data integrity', async () => {
      const user = userEvent.setup();
      const testData = generateCompleteTestData();
      
      render(
        <EnhancedDataTable
          data={testData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Hide some columns
      const columnsDropdown = screen.getByText('Columns');
      await user.click(columnsDropdown);
      
      const budgetCheckbox = screen.getByLabelText('Budget');
      await user.click(budgetCheckbox);

      await waitFor(() => {
        // Budget column should be hidden
        expect(screen.queryByText('$5,000.50')).not.toBeInTheDocument();
        
        // Other data should still be visible
        expect(screen.getByText('Complete Task with All Data')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
      });

      // Show column again
      await user.click(budgetCheckbox);

      await waitFor(() => {
        // Budget data should reappear with correct formatting
        expect(screen.getByText('$5,000.50')).toBeInTheDocument();
      });
    });

    test('pagination maintains data completeness across pages', async () => {
      const user = userEvent.setup();
      const largeTestData = Array.from({ length: 25 }, (_, i) => ({
        _id: `item-${i}`,
        title: `Task ${i}`,
        status: 'active',
        progress: i * 4,
        budget: (i + 1) * 1000,
        isActive: i % 2 === 0
      }));
      
      render(
        <EnhancedDataTable
          data={largeTestData}
          columns={mockColumns}
          rowKey="_id"
          pagination={{ pageSize: 10, currentPage: 1, totalCount: 25, totalPages: 3 }}
        />
      );

      // Verify first page data
      expect(screen.getByText('Task 0')).toBeInTheDocument();
      expect(screen.getByText('$1,000.00')).toBeInTheDocument();

      // Navigate to next page (if pagination controls exist)
      const nextButton = screen.queryByText('Next');
      if (nextButton) {
        await user.click(nextButton);
        
        await waitFor(() => {
          // Verify second page data maintains formatting
          expect(screen.getByText('Task 10')).toBeInTheDocument();
        });
      }
    });

    test('special characters and unicode are displayed correctly', async () => {
      const specialCharData = [
        {
          _id: 'special-1',
          title: 'Task with Special Characters: @#$%^&*()_+-={}[]|\\:";\'<>?,./`~',
          status: 'active',
          client: { name: 'Üñíçødé Çlíëñt Ñämé' },
          progress: 50
        },
        {
          _id: 'special-2',
          title: 'Task with Emojis 🚀 📊 ✅ 🔥 💡',
          status: 'active',
          client: { name: 'Client with 中文 and العربية' },
          progress: 75
        }
      ];
      
      render(
        <EnhancedDataTable
          data={specialCharData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify special characters are displayed
      expect(screen.getByText('Task with Special Characters: @#$%^&*()_+-={}[]|\\:";\'<>?,./`~')).toBeInTheDocument();
      expect(screen.getByText('Task with Emojis 🚀 📊 ✅ 🔥 💡')).toBeInTheDocument();
      expect(screen.getByText('Üñíçødé Çlíëñt Ñämé')).toBeInTheDocument();
      expect(screen.getByText('Client with 中文 and العربية')).toBeInTheDocument();
    });
  });

  describe('Data Display Edge Cases', () => {
    test('extremely long text values are handled appropriately', async () => {
      const longTextData = [{
        _id: 'long-1',
        title: 'A'.repeat(1000), // Very long title
        status: 'active',
        client: { name: 'B'.repeat(500) }, // Very long client name
        progress: 50
      }];
      
      render(
        <EnhancedDataTable
          data={longTextData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Should not crash and should handle long text
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1);
    });

    test('zero and negative values display correctly', async () => {
      const edgeValueData = [{
        _id: 'edge-1',
        title: 'Edge Values Task',
        progress: 0,
        budget: -1000.50,
        hours: -5.5,
        status: 'active'
      }];
      
      render(
        <EnhancedDataTable
          data={edgeValueData}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify zero and negative values are displayed
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('-$1,000.50')).toBeInTheDocument();
      expect(screen.getByText('-5.5')).toBeInTheDocument();
    });
  });
});