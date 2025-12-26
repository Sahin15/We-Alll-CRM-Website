import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedDataTable from '../EnhancedDataTable';

// Mock data for testing
const mockColumns = [
  { key: 'title', title: 'Title', sortable: true, filterable: true },
  { key: 'status', title: 'Status', sortable: true, type: 'badge' },
  { key: 'priority', title: 'Priority', sortable: true, type: 'badge' },
  { key: 'assignedTo.name', title: 'Assigned To', sortable: true }
];

const mockData = [
  {
    _id: '1',
    title: 'Test Work Item 1',
    status: 'in-progress',
    priority: 'high',
    assignedTo: { name: 'John Doe' }
  },
  {
    _id: '2',
    title: 'Test Work Item 2',
    status: 'completed',
    priority: 'medium',
    assignedTo: { name: 'Jane Smith' }
  }
];

const mockPagination = {
  currentPage: 1,
  pageSize: 10,
  totalCount: 2,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false
};

describe('EnhancedDataTable', () => {
  const defaultProps = {
    data: mockData,
    columns: mockColumns,
    pagination: mockPagination,
    loading: false,
    error: null,
    onSort: jest.fn(),
    onBulkOperation: jest.fn(),
    onRowEdit: jest.fn(),
    onRowDelete: jest.fn(),
    onExport: jest.fn(),
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders table with data', () => {
    render(<EnhancedDataTable {...defaultProps} />);
    
    expect(screen.getByText('Test Work Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Work Item 2')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('renders column headers', () => {
    render(<EnhancedDataTable {...defaultProps} />);
    
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Assigned To')).toBeInTheDocument();
  });

  test('handles sorting when column header is clicked', () => {
    render(<EnhancedDataTable {...defaultProps} />);
    
    const titleHeader = screen.getByText('Title').closest('th');
    fireEvent.click(titleHeader);
    
    expect(defaultProps.onSort).toHaveBeenCalledWith('title', 'asc');
  });

  test('shows loading state', () => {
    render(<EnhancedDataTable {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('shows error state', () => {
    const errorMessage = 'Failed to load data';
    render(<EnhancedDataTable {...defaultProps} error={errorMessage} />);
    
    expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('shows empty state when no data', () => {
    render(<EnhancedDataTable {...defaultProps} data={[]} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  test('renders search input when searchable is true', () => {
    render(<EnhancedDataTable {...defaultProps} searchable={true} />);
    
    expect(screen.getByPlaceholderText('Search all columns...')).toBeInTheDocument();
  });

  test('renders export dropdown when exportable is true', () => {
    render(<EnhancedDataTable {...defaultProps} exportable={true} />);
    
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  test('renders bulk actions when rows are selected', () => {
    render(<EnhancedDataTable {...defaultProps} selectable={true} />);
    
    // Select first row
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First checkbox is select all
    
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByText('Bulk Actions')).toBeInTheDocument();
  });

  test('handles select all functionality', () => {
    render(<EnhancedDataTable {...defaultProps} selectable={true} />);
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  test('filters data based on search term', () => {
    render(<EnhancedDataTable {...defaultProps} searchable={true} />);
    
    const searchInput = screen.getByPlaceholderText('Search all columns...');
    fireEvent.change(searchInput, { target: { value: 'Test Work Item 1' } });
    
    expect(screen.getByText('Test Work Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Work Item 2')).not.toBeInTheDocument();
  });

  test('renders pagination controls', () => {
    const paginationProps = {
      ...defaultProps,
      pagination: {
        ...mockPagination,
        totalPages: 3,
        hasNextPage: true
      }
    };
    
    render(<EnhancedDataTable {...paginationProps} />);
    
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 to 2 of 2 entries/)).toBeInTheDocument();
  });
});

// Property-based test for table reactivity and sorting
describe('EnhancedDataTable Property Tests', () => {
  test('Property 3: Table Reactivity and Sorting', () => {
    const testData = [
      { _id: '1', title: 'A Task', priority: 'high' },
      { _id: '2', title: 'B Task', priority: 'low' },
      { _id: '3', title: 'C Task', priority: 'medium' }
    ];
    
    const columns = [
      { key: 'title', title: 'Title', sortable: true },
      { key: 'priority', title: 'Priority', sortable: true }
    ];
    
    const onSort = jest.fn();
    
    render(
      <EnhancedDataTable
        data={testData}
        columns={columns}
        onSort={onSort}
        pagination={mockPagination}
      />
    );
    
    // Test sorting by title
    const titleHeader = screen.getByText('Title').closest('th');
    fireEvent.click(titleHeader);
    
    expect(onSort).toHaveBeenCalledWith('title', 'asc');
    
    // Test sorting by priority
    const priorityHeader = screen.getByText('Priority').closest('th');
    fireEvent.click(priorityHeader);
    
    expect(onSort).toHaveBeenCalledWith('priority', 'asc');
    
    // Verify all data is displayed
    expect(screen.getByText('A Task')).toBeInTheDocument();
    expect(screen.getByText('B Task')).toBeInTheDocument();
    expect(screen.getByText('C Task')).toBeInTheDocument();
  });

  test('Property 4: Data Completeness in Display', () => {
    const testData = [
      {
        _id: '1',
        title: 'Complete Task',
        status: 'completed',
        priority: 'high',
        assignedTo: { name: 'John Doe' },
        client: { name: 'Client A' },
        project: { name: 'Project X' }
      }
    ];
    
    const columns = [
      { key: 'title', title: 'Title' },
      { key: 'status', title: 'Status' },
      { key: 'priority', title: 'Priority' },
      { key: 'assignedTo.name', title: 'Assigned To' },
      { key: 'client.name', title: 'Client' },
      { key: 'project.name', title: 'Project' }
    ];
    
    render(
      <EnhancedDataTable
        data={testData}
        columns={columns}
        pagination={mockPagination}
      />
    );
    
    // Verify all data fields are displayed
    expect(screen.getByText('Complete Task')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Client A')).toBeInTheDocument();
    expect(screen.getByText('Project X')).toBeInTheDocument();
  });
});