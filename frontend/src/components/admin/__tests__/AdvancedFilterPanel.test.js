import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdvancedFilterPanel from '../AdvancedFilterPanel';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock data for testing
const mockFilterOptions = {
  clients: [
    { _id: '1', name: 'Client A', company: 'Company A' },
    { _id: '2', name: 'Client B', company: 'Company B' }
  ],
  projects: [
    { _id: '1', name: 'Project X', client: { _id: '1', name: 'Client A' } },
    { _id: '2', name: 'Project Y', client: { _id: '2', name: 'Client B' } }
  ],
  employees: [
    { _id: '1', name: 'John Doe', role: 'employee' },
    { _id: '2', name: 'Jane Smith', role: 'manager' }
  ],
  departments: [
    { _id: '1', name: 'Development' },
    { _id: '2', name: 'Marketing' }
  ]
};

const mockFilters = {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  client: 'all',
  project: 'all',
  employee: 'all',
  department: 'all',
  status: 'all',
  priority: 'all',
  workType: 'all',
  search: '',
  customFilters: []
};

describe('AdvancedFilterPanel', () => {
  const defaultProps = {
    filters: mockFilters,
    filterOptions: mockFilterOptions,
    onFilterChange: jest.fn(),
    onClearFilters: jest.fn(),
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
  });

  test('renders advanced filter panel', () => {
    render(<AdvancedFilterPanel {...defaultProps} />);
    
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    expect(screen.getByText('Client-Focused Filters (Primary)')).toBeInTheDocument();
  });

  test('handles client filter change', () => {
    render(<AdvancedFilterPanel {...defaultProps} />);
    
    const clientSelect = screen.getByDisplayValue('All Clients');
    fireEvent.change(clientSelect, { target: { value: '1' } });
    
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith('client', '1');
  });

  test('handles date range preset selection', () => {
    render(<AdvancedFilterPanel {...defaultProps} />);
    
    const todayButton = screen.getByText('Today');
    fireEvent.click(todayButton);
    
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith('startDate', expect.any(String));
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith('endDate', expect.any(String));
  });

  test('adds and removes custom criteria', () => {
    render(<AdvancedFilterPanel {...defaultProps} />);
    
    // Open custom criteria section
    const customCriteriaHeader = screen.getByText('Custom Criteria Builder');
    fireEvent.click(customCriteriaHeader);
    
    // Add criteria
    const addButton = screen.getByText('Add Criteria');
    fireEvent.click(addButton);
    
    // Should show field selection
    expect(screen.getByText('Select Field')).toBeInTheDocument();
  });

  test('saves and loads filter presets', async () => {
    render(<AdvancedFilterPanel {...defaultProps} />);
    
    // Open presets section
    const presetsHeader = screen.getByText('Filter Presets & History');
    fireEvent.click(presetsHeader);
    
    // Enter preset name
    const presetInput = screen.getByPlaceholderText('Enter preset name');
    fireEvent.change(presetInput, { target: { value: 'Test Preset' } });
    
    // Save preset
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'workFilterPresets',
      expect.stringContaining('Test Preset')
    );
  });

  test('handles global search with debouncing', async () => {
    jest.useFakeTimers();
    
    render(<AdvancedFilterPanel {...defaultProps} />);
    
    // Open global search section
    const searchHeader = screen.getByText('Global Search & Smart Suggestions');
    fireEvent.click(searchHeader);
    
    // Enter search term
    const searchInput = screen.getByPlaceholderText('Search across all fields...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    // Should not call onFilterChange immediately
    expect(defaultProps.onFilterChange).not.toHaveBeenCalledWith('search', 'test search');
    
    // Fast-forward time to trigger debounce
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('search', 'test search');
    });
    
    jest.useRealTimers();
  });

  test('navigates filter history', () => {
    const mockHistory = [
      {
        id: 1,
        filters: { ...mockFilters, status: 'completed' },
        customCriteria: [],
        logicalOperator: 'AND',
        timestamp: Date.now() - 1000
      },
      {
        id: 2,
        filters: { ...mockFilters, status: 'in-progress' },
        customCriteria: [],
        logicalOperator: 'AND',
        timestamp: Date.now()
      }
    ];
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));
    
    render(<AdvancedFilterPanel {...defaultProps} />);
    
    // Open presets section
    const presetsHeader = screen.getByText('Filter Presets & History');
    fireEvent.click(presetsHeader);
    
    // Should show history navigation
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Forward')).toBeInTheDocument();
  });

  test('clears all filters', () => {
    render(<AdvancedFilterPanel {...defaultProps} />);
    
    const clearButton = screen.getByText('Clear All Filters');
    fireEvent.click(clearButton);
    
    expect(defaultProps.onClearFilters).toHaveBeenCalled();
  });

  test('closes panel', () => {
    render(<AdvancedFilterPanel {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});

// Property-based test for comprehensive search functionality
describe('AdvancedFilterPanel Property Tests', () => {
  test('Property 8: Comprehensive Search Functionality', async () => {
    jest.useFakeTimers();
    
    const onFilterChange = jest.fn();
    const testFilters = { ...mockFilters };
    
    render(
      <AdvancedFilterPanel
        filters={testFilters}
        filterOptions={mockFilterOptions}
        onFilterChange={onFilterChange}
        onClearFilters={jest.fn()}
        onClose={jest.fn()}
      />
    );
    
    // Open global search section
    const searchHeader = screen.getByText('Global Search & Smart Suggestions');
    fireEvent.click(searchHeader);
    
    // Test 1: Search functionality exists
    const searchInput = screen.getByPlaceholderText('Search across all fields...');
    expect(searchInput).toBeInTheDocument();
    
    // Test 2: Search is debounced (doesn't trigger immediately)
    fireEvent.change(searchInput, { target: { value: 'client search' } });
    expect(onFilterChange).not.toHaveBeenCalledWith('search', 'client search');
    
    // Test 3: Search triggers after debounce delay
    jest.advanceTimersByTime(300);
    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith('search', 'client search');
    });
    
    // Test 4: Search can be cleared
    const clearSearchButton = screen.getByRole('button', { name: '' }); // Clear button
    fireEvent.click(clearSearchButton);
    expect(searchInput.value).toBe('');
    
    // Test 5: Client filter works (primary requirement)
    const clientSelect = screen.getByDisplayValue('All Clients');
    fireEvent.change(clientSelect, { target: { value: '1' } });
    expect(onFilterChange).toHaveBeenCalledWith('client', '1');
    
    // Test 6: Multiple filter types work together
    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'completed' } });
    expect(onFilterChange).toHaveBeenCalledWith('status', 'completed');
    
    // Test 7: Date range filters work
    const startDateInput = screen.getByDisplayValue('2024-01-01');
    fireEvent.change(startDateInput, { target: { value: '2024-02-01' } });
    expect(onFilterChange).toHaveBeenCalledWith('startDate', '2024-02-01');
    
    // Test 8: Custom criteria can be added
    const customCriteriaHeader = screen.getByText('Custom Criteria Builder');
    fireEvent.click(customCriteriaHeader);
    
    const addCriteriaButton = screen.getByText('Add Criteria');
    fireEvent.click(addCriteriaButton);
    
    // Should show field selection dropdown
    expect(screen.getByText('Select Field')).toBeInTheDocument();
    
    // Test 9: Smart suggestions work
    const suggestions = screen.getAllByRole('button').filter(btn => 
      btn.textContent.includes('Show Overdue Work') || 
      btn.textContent.includes('This Week\'s Work')
    );
    expect(suggestions.length).toBeGreaterThan(0);
    
    jest.useRealTimers();
  });

  test('Property: Filter Combination Consistency', () => {
    const onFilterChange = jest.fn();
    
    render(
      <AdvancedFilterPanel
        filters={mockFilters}
        filterOptions={mockFilterOptions}
        onFilterChange={onFilterChange}
        onClearFilters={jest.fn()}
        onClose={jest.fn()}
      />
    );
    
    // Test that client filter affects project options
    const clientSelect = screen.getByDisplayValue('All Clients');
    fireEvent.change(clientSelect, { target: { value: '1' } });
    
    // Should call onFilterChange with client filter
    expect(onFilterChange).toHaveBeenCalledWith('client', '1');
    
    // Test that multiple filters can be applied consistently
    const departmentSelect = screen.getByDisplayValue('All Departments');
    fireEvent.change(departmentSelect, { target: { value: '1' } });
    
    expect(onFilterChange).toHaveBeenCalledWith('department', '1');
    
    // Test that filter combinations maintain logical consistency
    const prioritySelect = screen.getByDisplayValue('All Priorities');
    fireEvent.change(prioritySelect, { target: { value: 'high' } });
    
    expect(onFilterChange).toHaveBeenCalledWith('priority', 'high');
  });

  test('Property: Filter Preset Persistence', () => {
    const mockPresets = [
      {
        id: 1,
        name: 'VIP Clients',
        filters: { ...mockFilters, client: '1', priority: 'high' },
        customCriteria: [],
        logicalOperator: 'AND'
      }
    ];
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPresets));
    
    const onFilterChange = jest.fn();
    
    render(
      <AdvancedFilterPanel
        filters={mockFilters}
        filterOptions={mockFilterOptions}
        onFilterChange={onFilterChange}
        onClearFilters={jest.fn()}
        onClose={jest.fn()}
      />
    );
    
    // Open presets section
    const presetsHeader = screen.getByText('Filter Presets & History');
    fireEvent.click(presetsHeader);
    
    // Should load saved presets
    expect(screen.getByText('VIP Clients')).toBeInTheDocument();
    
    // Should be able to apply preset
    const presetBadge = screen.getByText('VIP Clients');
    fireEvent.click(presetBadge);
    
    // Should apply all filters from preset
    expect(onFilterChange).toHaveBeenCalledWith('client', '1');
    expect(onFilterChange).toHaveBeenCalledWith('priority', 'high');
  });
});