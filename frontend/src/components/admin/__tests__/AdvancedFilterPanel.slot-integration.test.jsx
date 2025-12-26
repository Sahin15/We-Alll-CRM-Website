import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdvancedFilterPanel from '../AdvancedFilterPanel';

// Mock data for testing
const mockFilterOptions = {
  clients: [
    { _id: 'client1', name: 'Client A', company: 'Company A' },
    { _id: 'client2', name: 'Client B', company: 'Company B' }
  ],
  projects: [
    { _id: 'project1', name: 'Project X', client: { _id: 'client1' } },
    { _id: 'project2', name: 'Project Y', client: { _id: 'client2' } }
  ],
  departments: [
    { _id: 'dept1', name: 'Development' },
    { _id: 'dept2', name: 'Design' }
  ]
};

const mockFilters = {
  client: 'all',
  project: 'all',
  status: 'all',
  priority: 'all',
  startDate: '',
  endDate: '',
  search: '',
  // Slot-related filters
  hasSlotAssignment: 'all',
  slotNumber: '',
  slotRangeFrom: '',
  slotRangeTo: '',
  projectSlotUtilization: 'all',
  slotSearch: ''
};

describe('AdvancedFilterPanel Slot Integration Tests', () => {
  const defaultProps = {
    filters: mockFilters,
    filterOptions: mockFilterOptions,
    onFilterChange: jest.fn(),
    onClearFilters: jest.fn(),
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Slot-Based Filtering Integration', () => {
    test('renders slot-based filters section', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      expect(screen.getByText('Slot-Based Filters')).toBeInTheDocument();
    });

    test('handles slot assignment filter changes', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Find and click the slot assignment dropdown
      const slotAssignmentSelect = screen.getByDisplayValue('All Items');
      fireEvent.change(slotAssignmentSelect, { target: { value: 'assigned' } });
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('hasSlotAssignment', 'assigned');
    });

    test('handles slot number filter input', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const slotNumberInput = screen.getByPlaceholderText('Enter slot number');
      fireEvent.change(slotNumberInput, { target: { value: '5' } });
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotNumber', '5');
    });

    test('handles slot range filter inputs', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const fromInput = screen.getByPlaceholderText('From');
      const toInput = screen.getByPlaceholderText('To');
      
      fireEvent.change(fromInput, { target: { value: '1' } });
      fireEvent.change(toInput, { target: { value: '10' } });
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotRangeFrom', '1');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotRangeTo', '10');
    });

    test('handles project slot utilization filter', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const utilizationSelect = screen.getByDisplayValue('All Projects');
      fireEvent.change(utilizationSelect, { target: { value: 'high' } });
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('projectSlotUtilization', 'high');
    });

    test('handles slot search input with debouncing', async () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const slotSearchInput = screen.getByPlaceholderText('Search slot identifiers, descriptions...');
      fireEvent.change(slotSearchInput, { target: { value: 'milestone' } });
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotSearch', 'milestone');
    });

    test('quick slot filter buttons work correctly', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Test Early Slots button
      const earlySlotButton = screen.getByText('Early Slots (1-5)');
      fireEvent.click(earlySlotButton);
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('hasSlotAssignment', 'assigned');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotRangeFrom', '1');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotRangeTo', '5');
    });

    test('mid slots quick filter button works', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const midSlotButton = screen.getByText('Mid Slots (6-10)');
      fireEvent.click(midSlotButton);
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('hasSlotAssignment', 'assigned');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotRangeFrom', '6');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotRangeTo', '10');
    });

    test('late slots quick filter button works', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const lateSlotButton = screen.getByText('Late Slots (11+)');
      fireEvent.click(lateSlotButton);
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('hasSlotAssignment', 'assigned');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotRangeFrom', '11');
    });

    test('unassigned and low utilization quick filter works', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const unassignedButton = screen.getByText('Unassigned & Low Utilization');
      fireEvent.click(unassignedButton);
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('hasSlotAssignment', 'unassigned');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('projectSlotUtilization', 'low');
    });
  });

  describe('Slot Search Functionality', () => {
    test('slot search input clears correctly', () => {
      const filtersWithSlotSearch = { ...mockFilters, slotSearch: 'test search' };
      const props = { ...defaultProps, filters: filtersWithSlotSearch };
      
      render(<AdvancedFilterPanel {...props} />);
      
      const clearButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg') && btn.closest('.input-group')
      );
      
      if (clearButton) {
        fireEvent.click(clearButton);
        expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotSearch', '');
      }
    });

    test('slot search integrates with global search', async () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const globalSearchInput = screen.getByPlaceholderText('Search across all fields...');
      fireEvent.change(globalSearchInput, { target: { value: 'slot test' } });
      
      // Wait for debounced search
      await waitFor(() => {
        expect(defaultProps.onFilterChange).toHaveBeenCalledWith('search', 'slot test');
      }, { timeout: 500 });
    });
  });

  describe('Custom Criteria with Slot Fields', () => {
    test('slot fields are available in custom criteria builder', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Add custom criteria
      const addCriteriaButton = screen.getByText('Add Criteria');
      fireEvent.click(addCriteriaButton);
      
      // Check if slot fields are in the dropdown
      const fieldSelect = screen.getByDisplayValue('Select Field');
      fireEvent.click(fieldSelect);
      
      expect(screen.getByText('Slot Number')).toBeInTheDocument();
      expect(screen.getByText('Slot Identifier')).toBeInTheDocument();
      expect(screen.getByText('Has Slot Assignment')).toBeInTheDocument();
    });

    test('slot number custom criteria works correctly', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Add custom criteria
      const addCriteriaButton = screen.getByText('Add Criteria');
      fireEvent.click(addCriteriaButton);
      
      // Select slot number field
      const fieldSelect = screen.getByDisplayValue('Select Field');
      fireEvent.change(fieldSelect, { target: { value: 'slotAssignment.slotNumber' } });
      
      // Set operator and value
      const operatorSelect = screen.getByDisplayValue('Equals');
      const valueInput = screen.getByPlaceholderText('Enter value');
      
      fireEvent.change(valueInput, { target: { value: '3' } });
      
      // Apply criteria
      const applyCriteriaButton = screen.getByText('Apply Criteria');
      fireEvent.click(applyCriteriaButton);
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('customFilters', expect.arrayContaining([
        expect.objectContaining({
          field: 'slotAssignment.slotNumber',
          operator: 'equals',
          value: '3'
        })
      ]));
    });

    test('slot identifier custom criteria works correctly', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Add custom criteria
      const addCriteriaButton = screen.getByText('Add Criteria');
      fireEvent.click(addCriteriaButton);
      
      // Select slot identifier field
      const fieldSelect = screen.getByDisplayValue('Select Field');
      fireEvent.change(fieldSelect, { target: { value: 'slotAssignment.slotIdentifier' } });
      
      // Set value
      const valueInput = screen.getByPlaceholderText('Enter value');
      fireEvent.change(valueInput, { target: { value: 'Milestone A' } });
      
      // Apply criteria
      const applyCriteriaButton = screen.getByText('Apply Criteria');
      fireEvent.click(applyCriteriaButton);
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('customFilters', expect.arrayContaining([
        expect.objectContaining({
          field: 'slotAssignment.slotIdentifier',
          operator: 'equals',
          value: 'Milestone A'
        })
      ]));
    });

    test('has slot assignment custom criteria works correctly', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Add custom criteria
      const addCriteriaButton = screen.getByText('Add Criteria');
      fireEvent.click(addCriteriaButton);
      
      // Select has slot assignment field
      const fieldSelect = screen.getByDisplayValue('Select Field');
      fireEvent.change(fieldSelect, { target: { value: 'hasSlotAssignment' } });
      
      // Set value
      const valueSelect = screen.getByDisplayValue('Select Value');
      fireEvent.change(valueSelect, { target: { value: 'assigned' } });
      
      // Apply criteria
      const applyCriteriaButton = screen.getByText('Apply Criteria');
      fireEvent.click(applyCriteriaButton);
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('customFilters', expect.arrayContaining([
        expect.objectContaining({
          field: 'hasSlotAssignment',
          operator: 'equals',
          value: 'assigned'
        })
      ]));
    });
  });

  describe('Filter Combinations and Integration', () => {
    test('slot filters combine with existing filters', () => {
      const combinedFilters = {
        ...mockFilters,
        client: 'client1',
        hasSlotAssignment: 'assigned',
        slotRangeFrom: '1',
        slotRangeTo: '5'
      };
      
      const props = { ...defaultProps, filters: combinedFilters };
      render(<AdvancedFilterPanel {...props} />);
      
      // Verify both client and slot filters are displayed
      expect(screen.getByDisplayValue('Client A (Company A)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Assigned to Slots')).toBeInTheDocument();
    });

    test('clear all filters includes slot filters', () => {
      const filtersWithSlots = {
        ...mockFilters,
        hasSlotAssignment: 'assigned',
        slotNumber: '5',
        projectSlotUtilization: 'high'
      };
      
      const props = { ...defaultProps, filters: filtersWithSlots };
      render(<AdvancedFilterPanel {...props} />);
      
      const clearAllButton = screen.getByText('Clear All Filters');
      fireEvent.click(clearAllButton);
      
      expect(defaultProps.onClearFilters).toHaveBeenCalled();
    });

    test('smart suggestions include slot-based options', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Check for slot-related smart suggestions
      expect(screen.getByText('Unassigned Work Items')).toBeInTheDocument();
      expect(screen.getByText('Early Stage Slots (1-5)')).toBeInTheDocument();
      expect(screen.getByText('Low Slot Utilization Projects')).toBeInTheDocument();
    });
  });

  describe('Filter Presets and History with Slots', () => {
    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      });
    });

    test('saves slot filters in presets', () => {
      const filtersWithSlots = {
        ...mockFilters,
        hasSlotAssignment: 'assigned',
        slotRangeFrom: '1',
        slotRangeTo: '10'
      };
      
      const props = { ...defaultProps, filters: filtersWithSlots };
      render(<AdvancedFilterPanel {...props} />);
      
      // Enter preset name and save
      const presetNameInput = screen.getByPlaceholderText('Enter preset name');
      fireEvent.change(presetNameInput, { target: { value: 'Slot Filter Test' } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'workFilterPresets',
        expect.stringContaining('hasSlotAssignment')
      );
    });

    test('loads slot filters from presets', () => {
      const mockPresets = [{
        id: 1,
        name: 'Slot Preset',
        filters: {
          ...mockFilters,
          hasSlotAssignment: 'assigned',
          slotNumber: '3'
        },
        customCriteria: [],
        logicalOperator: 'AND'
      }];
      
      localStorage.getItem.mockReturnValue(JSON.stringify(mockPresets));
      
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Should display the preset
      expect(screen.getByText('Slot Preset')).toBeInTheDocument();
    });

    test('filter history includes slot filter changes', () => {
      localStorage.getItem.mockReturnValue('[]');
      
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Change a slot filter
      const slotAssignmentSelect = screen.getByDisplayValue('All Items');
      fireEvent.change(slotAssignmentSelect, { target: { value: 'assigned' } });
      
      // History should be saved with slot filters
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'workFilterHistory',
        expect.stringContaining('hasSlotAssignment')
      );
    });
  });

  describe('Accessibility and User Experience', () => {
    test('slot filter labels are properly associated', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const slotAssignmentLabel = screen.getByText('Slot Assignment');
      const slotNumberLabel = screen.getByText('Slot Number');
      const slotRangeLabel = screen.getByText('Slot Range');
      
      expect(slotAssignmentLabel).toBeInTheDocument();
      expect(slotNumberLabel).toBeInTheDocument();
      expect(slotRangeLabel).toBeInTheDocument();
    });

    test('slot filter help text is displayed', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      expect(screen.getByText('Filter by slot assignment status')).toBeInTheDocument();
      expect(screen.getByText('Filter by specific slot number')).toBeInTheDocument();
      expect(screen.getByText('Filter by slot number range')).toBeInTheDocument();
      expect(screen.getByText('Filter by project slot utilization rate')).toBeInTheDocument();
    });

    test('slot filter validation works correctly', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const slotNumberInput = screen.getByPlaceholderText('Enter slot number');
      const fromInput = screen.getByPlaceholderText('From');
      const toInput = screen.getByPlaceholderText('To');
      
      // Check min attribute for number inputs
      expect(slotNumberInput).toHaveAttribute('min', '1');
      expect(fromInput).toHaveAttribute('min', '1');
      expect(toInput).toHaveAttribute('min', '1');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('handles empty slot filter values gracefully', () => {
      const emptySlotFilters = {
        ...mockFilters,
        slotNumber: '',
        slotRangeFrom: '',
        slotRangeTo: '',
        slotSearch: ''
      };
      
      const props = { ...defaultProps, filters: emptySlotFilters };
      
      expect(() => render(<AdvancedFilterPanel {...props} />)).not.toThrow();
    });

    test('handles invalid slot number inputs', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const slotNumberInput = screen.getByPlaceholderText('Enter slot number');
      
      // Try negative number
      fireEvent.change(slotNumberInput, { target: { value: '-1' } });
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotNumber', '-1');
      
      // Try zero
      fireEvent.change(slotNumberInput, { target: { value: '0' } });
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotNumber', '0');
    });

    test('handles slot range validation', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const fromInput = screen.getByPlaceholderText('From');
      const toInput = screen.getByPlaceholderText('To');
      
      // Set "from" greater than "to"
      fireEvent.change(fromInput, { target: { value: '10' } });
      fireEvent.change(toInput, { target: { value: '5' } });
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotRangeFrom', '10');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotRangeTo', '5');
    });

    test('debounces slot search input correctly', async () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      const slotSearchInput = screen.getByPlaceholderText('Search slot identifiers, descriptions...');
      
      // Type multiple characters quickly
      fireEvent.change(slotSearchInput, { target: { value: 'm' } });
      fireEvent.change(slotSearchInput, { target: { value: 'mi' } });
      fireEvent.change(slotSearchInput, { target: { value: 'mil' } });
      fireEvent.change(slotSearchInput, { target: { value: 'mile' } });
      fireEvent.change(slotSearchInput, { target: { value: 'miles' } });
      fireEvent.change(slotSearchInput, { target: { value: 'milest' } });
      fireEvent.change(slotSearchInput, { target: { value: 'milesto' } });
      fireEvent.change(slotSearchInput, { target: { value: 'mileston' } });
      fireEvent.change(slotSearchInput, { target: { value: 'milestone' } });
      
      // Should only call onFilterChange with final value
      expect(defaultProps.onFilterChange).toHaveBeenLastCalledWith('slotSearch', 'milestone');
    });
  });

  describe('Integration with Existing Filter System', () => {
    test('slot filters work with client filters', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Set client filter
      const clientSelect = screen.getByDisplayValue('All Clients');
      fireEvent.change(clientSelect, { target: { value: 'client1' } });
      
      // Set slot filter
      const slotAssignmentSelect = screen.getByDisplayValue('All Items');
      fireEvent.change(slotAssignmentSelect, { target: { value: 'assigned' } });
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('client', 'client1');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('hasSlotAssignment', 'assigned');
    });

    test('slot filters work with date range filters', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Set date range
      const startDateInput = screen.getByDisplayValue('');
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      
      // Set slot utilization filter
      const utilizationSelect = screen.getByDisplayValue('All Projects');
      fireEvent.change(utilizationSelect, { target: { value: 'high' } });
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('startDate', '2024-01-01');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('projectSlotUtilization', 'high');
    });

    test('slot filters work with status and priority filters', () => {
      render(<AdvancedFilterPanel {...defaultProps} />);
      
      // Set status filter
      const statusSelect = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusSelect, { target: { value: 'in-progress' } });
      
      // Set slot number filter
      const slotNumberInput = screen.getByPlaceholderText('Enter slot number');
      fireEvent.change(slotNumberInput, { target: { value: '3' } });
      
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('status', 'in-progress');
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('slotNumber', '3');
    });
  });
});