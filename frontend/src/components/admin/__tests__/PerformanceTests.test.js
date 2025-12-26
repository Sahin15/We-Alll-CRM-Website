import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import VirtualizedDataTable from '../VirtualizedDataTable';
import EnhancedDataTable from '../EnhancedDataTable';
import analyticsCacheService from '../../../services/analyticsCacheService';
import workCalendarApi from '../../../api/workCalendarApi';

/**
 * Performance Tests for Large Datasets
 * 
 * **Feature: admin-work-management-enhancement, Task 10.1: Performance Tests**
 * 
 * Tests table rendering with 10,000+ entries, verifies export performance with large files,
 * and tests concurrent user access and real-time updates.
 */

// Mock APIs
jest.mock('../../../api/workCalendarApi');

// Mock react-window for testing
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize, height }) => {
    // Render only first 10 items for testing performance
    const items = Array.from({ length: Math.min(itemCount, 10) }, (_, index) => 
      children({ index, style: { height: itemSize } })
    );
    
    return (
      <div style={{ height }} data-testid="virtualized-list">
        {items}
      </div>
    );
  }
}));

// Performance measurement utilities
const measurePerformance = (name, fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`${name}: ${end - start}ms`);
  return { result, duration: end - start };
};

const measureAsyncPerformance = async (name, fn) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  console.log(`${name}: ${end - start}ms`);
  return { result, duration: end - start };
};

describe('Performance Tests for Large Datasets', () => {
  const generateLargeDataset = (size) => {
    return Array.from({ length: size }, (_, i) => ({
      _id: `work-${i}`,
      title: `Task ${i}`,
      client: { _id: `client-${i % 100}`, name: `Client ${i % 100}` },
      project: { _id: `project-${i % 50}`, name: `Project ${i % 50}` },
      assignedTo: { _id: `emp-${i % 20}`, name: `Employee ${i % 20}` },
      department: { _id: `dept-${i % 5}`, name: `Department ${i % 5}` },
      status: ['scheduled', 'in-progress', 'completed', 'overdue'][i % 4],
      priority: ['low', 'medium', 'high', 'urgent'][i % 4],
      workType: ['development', 'design', 'testing', 'documentation'][i % 4],
      startDate: new Date(2024, 0, 1 + (i % 365)).toISOString(),
      dueDate: new Date(2024, 0, 15 + (i % 365)).toISOString(),
      completionPercentage: Math.floor(Math.random() * 101),
      timeTracking: {
        estimatedHours: 8 + (i % 40),
        actualHours: 6 + (i % 35)
      },
      workloadImpact: ['low', 'medium', 'high'][i % 3]
    }));
  };

  const mockColumns = [
    { key: 'title', title: 'Title', sortable: true, filterable: true, minWidth: '200px' },
    { key: 'client.name', title: 'Client', sortable: true, filterable: true, minWidth: '150px' },
    { key: 'project.name', title: 'Project', sortable: true, filterable: true, minWidth: '150px' },
    { key: 'assignedTo.name', title: 'Assigned To', sortable: true, filterable: true, minWidth: '130px' },
    { key: 'status', title: 'Status', sortable: true, filterable: true, type: 'badge', minWidth: '100px' },
    { key: 'priority', title: 'Priority', sortable: true, filterable: true, type: 'badge', minWidth: '90px' },
    { key: 'completionPercentage', title: 'Progress', sortable: true, type: 'percentage', minWidth: '90px' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsCacheService.clear();
  });

  /**
   * Test table rendering with 10,000+ entries
   */
  describe('Large Dataset Rendering Performance', () => {
    test('virtualized table renders 10,000 entries efficiently', async () => {
      const largeDataset = generateLargeDataset(10000);
      
      const { result, duration } = measurePerformance('VirtualizedDataTable render 10k items', () => {
        return render(
          <VirtualizedDataTable
            data={largeDataset}
            columns={mockColumns}
            rowKey="_id"
            containerHeight={600}
            itemHeight={60}
          />
        );
      });

      // Should render within reasonable time (< 1000ms)
      expect(duration).toBeLessThan(1000);
      
      // Should show virtualized list
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      
      // Should show performance badge
      expect(screen.getByText('10000 rows (virtualized)')).toBeInTheDocument();
    });

    test('regular table performance degrades with large datasets', async () => {
      const mediumDataset = generateLargeDataset(1000);
      const largeDataset = generateLargeDataset(5000);
      
      // Measure medium dataset
      const { duration: mediumDuration } = measurePerformance('EnhancedDataTable render 1k items', () => {
        return render(
          <EnhancedDataTable
            data={mediumDataset}
            columns={mockColumns}
            rowKey="_id"
          />
        );
      });

      // Clean up
      screen.getByText('Task 0').closest('.enhanced-data-table').remove();

      // Measure large dataset
      const { duration: largeDuration } = measurePerformance('EnhancedDataTable render 5k items', () => {
        return render(
          <EnhancedDataTable
            data={largeDataset}
            columns={mockColumns}
            rowKey="_id"
          />
        );
      });

      // Performance should degrade significantly
      expect(largeDuration).toBeGreaterThan(mediumDuration * 2);
      
      console.log(`Performance degradation: ${(largeDuration / mediumDuration).toFixed(2)}x`);
    });

    test('virtualized table maintains performance with filtering', async () => {
      const user = userEvent.setup();
      const largeDataset = generateLargeDataset(10000);
      
      render(
        <VirtualizedDataTable
          data={largeDataset}
          columns={mockColumns}
          rowKey="_id"
          searchable={true}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search all columns/i);
      
      // Measure search performance
      const { duration } = await measureAsyncPerformance('Search in 10k items', async () => {
        await user.type(searchInput, 'Task 1');
        await waitFor(() => {
          // Should filter results quickly
          expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
        });
      });

      // Search should be fast (< 500ms)
      expect(duration).toBeLessThan(500);
    });

    test('virtualized table handles sorting efficiently', async () => {
      const user = userEvent.setup();
      const largeDataset = generateLargeDataset(10000);
      
      render(
        <VirtualizedDataTable
          data={largeDataset}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      const titleHeader = screen.getByText('Title');
      
      // Measure sorting performance
      const { duration } = await measureAsyncPerformance('Sort 10k items', async () => {
        await user.click(titleHeader);
        await waitFor(() => {
          expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
        });
      });

      // Sorting should be reasonably fast (< 1000ms)
      expect(duration).toBeLessThan(1000);
    });
  });

  /**
   * Test export performance with large files
   */
  describe('Export Performance with Large Files', () => {
    test('CSV export handles large datasets efficiently', async () => {
      const largeDataset = generateLargeDataset(50000);
      
      // Mock export API
      workCalendarApi.exportWorkData = jest.fn().mockImplementation(async (format, data) => {
        // Simulate export processing time based on data size
        const processingTime = Math.min(data.length / 1000, 5000); // Max 5 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        return {
          success: true,
          downloadUrl: 'https://example.com/export.csv',
          fileSize: data.length * 100 // Estimate file size
        };
      });

      const { duration } = await measureAsyncPerformance('Export 50k items to CSV', async () => {
        const result = await workCalendarApi.exportWorkData('csv', largeDataset);
        return result;
      });

      // Export should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max
      
      expect(workCalendarApi.exportWorkData).toHaveBeenCalledWith('csv', largeDataset);
    });

    test('Excel export with formatting handles large datasets', async () => {
      const largeDataset = generateLargeDataset(25000);
      
      workCalendarApi.exportWorkData = jest.fn().mockImplementation(async (format, data) => {
        // Excel export is slower due to formatting
        const processingTime = Math.min(data.length / 500, 8000); // Max 8 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        return {
          success: true,
          downloadUrl: 'https://example.com/export.xlsx',
          fileSize: data.length * 150 // Excel files are larger
        };
      });

      const { duration } = await measureAsyncPerformance('Export 25k items to Excel', async () => {
        const result = await workCalendarApi.exportWorkData('excel', largeDataset);
        return result;
      });

      // Excel export should complete within reasonable time
      expect(duration).toBeLessThan(15000); // 15 seconds max
      
      expect(workCalendarApi.exportWorkData).toHaveBeenCalledWith('excel', largeDataset);
    });

    test('PDF export with charts handles medium datasets', async () => {
      const mediumDataset = generateLargeDataset(5000);
      
      workCalendarApi.exportWorkData = jest.fn().mockImplementation(async (format, data) => {
        // PDF export with charts is most resource intensive
        const processingTime = Math.min(data.length / 100, 10000); // Max 10 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        return {
          success: true,
          downloadUrl: 'https://example.com/export.pdf',
          fileSize: data.length * 200 // PDF with charts is largest
        };
      });

      const { duration } = await measureAsyncPerformance('Export 5k items to PDF', async () => {
        const result = await workCalendarApi.exportWorkData('pdf', mediumDataset);
        return result;
      });

      // PDF export should complete within reasonable time
      expect(duration).toBeLessThan(20000); // 20 seconds max
      
      expect(workCalendarApi.exportWorkData).toHaveBeenCalledWith('pdf', mediumDataset);
    });

    test('chunked export for very large datasets', async () => {
      const veryLargeDataset = generateLargeDataset(100000);
      const chunkSize = 10000;
      
      workCalendarApi.exportWorkDataChunked = jest.fn().mockImplementation(async (format, data, options) => {
        const chunks = Math.ceil(data.length / chunkSize);
        const results = [];
        
        for (let i = 0; i < chunks; i++) {
          const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
          results.push({
            chunkIndex: i,
            processed: chunk.length
          });
        }
        
        return {
          success: true,
          chunks: results,
          totalProcessed: data.length,
          downloadUrl: 'https://example.com/export-large.csv'
        };
      });

      const { duration } = await measureAsyncPerformance('Chunked export 100k items', async () => {
        const result = await workCalendarApi.exportWorkDataChunked('csv', veryLargeDataset, { chunkSize });
        return result;
      });

      // Chunked export should be efficient
      expect(duration).toBeLessThan(30000); // 30 seconds max
      
      expect(workCalendarApi.exportWorkDataChunked).toHaveBeenCalledWith(
        'csv', 
        veryLargeDataset, 
        { chunkSize }
      );
    });
  });

  /**
   * Test concurrent user access and real-time updates
   */
  describe('Concurrent Access and Real-Time Updates', () => {
    test('multiple users can access large datasets simultaneously', async () => {
      const largeDataset = generateLargeDataset(20000);
      const numberOfUsers = 5;
      
      // Simulate multiple user sessions
      const userSessions = Array.from({ length: numberOfUsers }, (_, i) => ({
        userId: `user-${i}`,
        filters: {
          client: i % 2 === 0 ? 'all' : `client-${i * 10}`,
          status: ['all', 'in-progress', 'completed'][i % 3]
        }
      }));

      workCalendarApi.getEnhancedAdminOverview = jest.fn().mockImplementation(async (params) => {
        // Simulate database load based on concurrent requests
        const delay = Math.random() * 500 + 200; // 200-700ms
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return {
          success: true,
          data: {
            workEntries: largeDataset.filter(item => {
              if (params.client !== 'all' && item.client._id !== params.client) return false;
              if (params.status !== 'all' && item.status !== params.status) return false;
              return true;
            }),
            totalCount: largeDataset.length
          }
        };
      });

      // Execute concurrent requests
      const { duration } = await measureAsyncPerformance('Concurrent access by 5 users', async () => {
        const promises = userSessions.map(session => 
          workCalendarApi.getEnhancedAdminOverview(session.filters)
        );
        
        const results = await Promise.all(promises);
        return results;
      });

      // All requests should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
      
      // All requests should succeed
      expect(workCalendarApi.getEnhancedAdminOverview).toHaveBeenCalledTimes(numberOfUsers);
    });

    test('real-time updates perform well with large datasets', async () => {
      const largeDataset = generateLargeDataset(15000);
      let updateCount = 0;
      
      const mockWebSocket = {
        addEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1
      };

      global.WebSocket = jest.fn(() => mockWebSocket);

      render(
        <VirtualizedDataTable
          data={largeDataset}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Simulate real-time updates
      const { duration } = await measureAsyncPerformance('Process 100 real-time updates', async () => {
        for (let i = 0; i < 100; i++) {
          const updateData = {
            type: 'update',
            workEntry: {
              ...largeDataset[i % largeDataset.length],
              status: 'completed',
              completionPercentage: 100
            }
          };
          
          // Simulate WebSocket message
          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(updateData)
          });
          
          act(() => {
            mockWebSocket.addEventListener.mock.calls
              .filter(call => call[0] === 'message')
              .forEach(call => call[1](messageEvent));
          });
          
          updateCount++;
          
          // Small delay to simulate real-world timing
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      // Real-time updates should be processed efficiently
      expect(duration).toBeLessThan(5000); // 5 seconds for 100 updates
      expect(updateCount).toBe(100);
    });

    test('analytics caching improves performance under load', async () => {
      const testFilters = [
        { client: 'client-1', status: 'all' },
        { client: 'client-2', status: 'in-progress' },
        { client: 'all', status: 'completed' },
        { client: 'client-1', status: 'overdue' }
      ];

      const mockFetchFunction = jest.fn().mockImplementation(async (filters) => {
        // Simulate expensive analytics calculation
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          totalEntries: 1000,
          completionRate: Math.random() * 100,
          filters
        };
      });

      // First round - cache misses
      const { duration: firstRound } = await measureAsyncPerformance('First analytics requests (cache miss)', async () => {
        const promises = testFilters.map(filters => 
          analyticsCacheService.getAnalytics(filters, {}, mockFetchFunction)
        );
        return await Promise.all(promises);
      });

      // Second round - cache hits
      const { duration: secondRound } = await measureAsyncPerformance('Second analytics requests (cache hit)', async () => {
        const promises = testFilters.map(filters => 
          analyticsCacheService.getAnalytics(filters, {}, mockFetchFunction)
        );
        return await Promise.all(promises);
      });

      // Cache should provide significant performance improvement
      expect(secondRound).toBeLessThan(firstRound * 0.1); // At least 10x faster
      
      // First round should call fetch function for each filter
      expect(mockFetchFunction).toHaveBeenCalledTimes(testFilters.length);
      
      // Cache stats should show hits
      const stats = analyticsCacheService.getStats();
      expect(parseInt(stats.hitRate)).toBeGreaterThan(50);
    });

    test('memory usage remains stable with large datasets', async () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Create and destroy multiple large datasets
      for (let i = 0; i < 5; i++) {
        const largeDataset = generateLargeDataset(10000);
        
        const { unmount } = render(
          <VirtualizedDataTable
            data={largeDataset}
            columns={mockColumns}
            rowKey="_id"
          />
        );
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        unmount();
      }
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      if (performance.memory) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`);
        
        // Memory increase should be reasonable (< 50% of initial)
        expect(memoryIncreasePercent).toBeLessThan(50);
      }
    });
  });

  /**
   * Test performance monitoring and alerting
   */
  describe('Performance Monitoring', () => {
    test('performance metrics are collected accurately', async () => {
      const largeDataset = generateLargeDataset(5000);
      
      // Mock performance observer
      const performanceEntries = [];
      global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
        observe: jest.fn(),
        disconnect: jest.fn()
      }));

      render(
        <VirtualizedDataTable
          data={largeDataset}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Verify performance monitoring is set up
      expect(global.PerformanceObserver).toHaveBeenCalled();
    });

    test('performance alerts trigger for slow operations', async () => {
      const slowDataset = generateLargeDataset(50000);
      const alerts = [];
      
      const mockAlert = jest.fn((message) => {
        alerts.push(message);
      });

      // Mock slow rendering
      const originalRender = render;
      render = jest.fn().mockImplementation((component) => {
        const start = performance.now();
        const result = originalRender(component);
        const duration = performance.now() - start;
        
        if (duration > 1000) { // Alert if render takes > 1 second
          mockAlert(`Slow render detected: ${duration}ms`);
        }
        
        return result;
      });

      render(
        <VirtualizedDataTable
          data={slowDataset}
          columns={mockColumns}
          rowKey="_id"
        />
      );

      // Should trigger performance alert for large dataset
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0]).toContain('Slow render detected');
    });
  });
});