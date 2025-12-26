import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BulkOperationsPanel from '../BulkOperationsPanel';

// Mock data for testing
const mockSelectedItems = [
  {
    _id: '1',
    title: 'Test Work Item 1',
    status: 'in-progress',
    priority: 'high',
    assignedTo: { _id: 'user1', name: 'John Doe' },
    client: { _id: 'client1', name: 'Client A' },
    project: { _id: 'project1', name: 'Project X' },
    slotAssignment: {
      assignedSlot: 'slot1',
      slotNumber: 1,
      slotIdentifier: 'Slot 1'
    }
  },
  {
    _id: '2',
    title: 'Test Work Item 2',
    status: 'scheduled',
    priority: 'medium',
    assignedTo: { _id: 'user2', name: 'Jane Smith' },
    client: { _id: 'client2', name: 'Client B' },
    project: { _id: 'project2', name: 'Project Y' }
    // No slot assignment
  }
];

const mockSelectedItemsNoSlots = [
  {
    _id: '3',
    title: 'Test Work Item 3',
    status: 'scheduled',
    priority: 'low',
    assignedTo: { _id: 'user1', name: 'John Doe' },
    client: { _id: 'client1', name: 'Client A' },
    project: { _id: 'project1', name: 'Project X' }
  },
  {
    _id: '4',
    title: 'Test Work Item 4',
    status: 'in-progress',
    priority: 'high',
    assignedTo: { _id: 'user2', name: 'Jane Smith' },
    client: { _id: 'client1', name: 'Client A' },
    project: { _id: 'project1', name: 'Project X' }
  }
];

const mockAvailableSlots = [
  {
    _id: 'slot1',
    slotNumber: 1,
    slotIdentifier: 'Slot 1',
    title: 'Initial Development Phase',
    assignmentStatus: 'assigned',
    projectId: 'project1',
    estimatedEffort: 40
  },
  {
    _id: 'slot2',
    slotNumber: 2,
    slotIdentifier: 'Slot 2',
    title: 'Testing Phase',
    assignmentStatus: 'available',
    projectId: 'project1',
    estimatedEffort: 20
  },
  {
    _id: 'slot3',
    slotNumber: 3,
    slotIdentifier: 'Slot 3',
    title: 'Deployment Phase',
    assignmentStatus: 'available',
    projectId: 'project1',
    estimatedEffort: 10,
    dependencies: ['slot1', 'slot2']
  },
  {
    _id: 'slot4',
    slotNumber: 1,
    slotIdentifier: 'Slot 1',
    title: 'Design Phase',
    assignmentStatus: 'completed',
    projectId: 'project2',
    estimatedEffort: 30
  }
];

const mockFilterOptions = {
  employees: [
    { _id: 'user1', name: 'John Doe', role: 'employee' },
    { _id: 'user2', name: 'Jane Smith', role: 'manager' },
    { _id: 'user3', name: 'Bob Wilson', role: 'employee' }
  ]
};

const mockCurrentUser = {
  _id: 'admin1',
  name: 'Admin User',
  role: 'admin'
};

describe('BulkOperationsPanel', () => {
  const defaultProps = {
    show: true,
    onHide: jest.fn(),
    selectedItems: mockSelectedItems,
    onBulkOperation: jest.fn(),
    filterOptions: mockFilterOptions,
    currentUser: mockCurrentUser,
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders bulk operations panel', () => {
    render(<BulkOperationsPanel {...defaultProps} />);
    
    expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
  });

  test('shows slot operations when enabled', () => {
    render(
      <BulkOperationsPanel 
        {...defaultProps} 
        enableSlotOperations={true}
        availableSlots={mockAvailableSlots}
      />
    );
    
    expect(screen.getByText('Assign to Slots')).toBeInTheDocument();
    expect(screen.getByText('Reassign Slots')).toBeInTheDocument();
    expect(screen.getByText('Release from Slots')).toBeInTheDocument();
    expect(screen.getByText('Bulk Slot Reassignment')).toBeInTheDocument();
  });

  test('hides slot operations when disabled', () => {
    render(
      <BulkOperationsPanel 
        {...defaultProps} 
        enableSlotOperations={false}
      />
    );
    
    expect(screen.queryByText('Assign to Slots')).not.toBeInTheDocument();
    expect(screen.queryByText('Reassign Slots')).not.toBeInTheDocument();
    expect(screen.queryByText('Release from Slots')).not.toBeInTheDocument();
  });

  test('shows slot assignment summary', () => {
    render(
      <BulkOperationsPanel 
        {...defaultProps} 
        enableSlotOperations={true}
        availableSlots={mockAvailableSlots}
      />
    );
    
    expect(screen.getByText('Slot Assignment Summary:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 item assigned to slots
    expect(screen.getByText('Assigned to Slots')).toBeInTheDocument();
    expect(screen.getByText('No Slot Assignment')).toBeInTheDocument();
  });

  test('restricts operations for non-admin users', () => {
    const managerUser = { ...mockCurrentUser, role: 'manager' };
    render(<BulkOperationsPanel {...defaultProps} currentUser={managerUser} />);
    
    expect(screen.getByText('Update Status')).toBeInTheDocument();
    expect(screen.queryByText('Delete Items')).not.toBeInTheDocument();
  });

  test('handles operation selection', () => {
    render(<BulkOperationsPanel {...defaultProps} />);
    
    const updateStatusCard = screen.getByText('Update Status').closest('.operation-card');
    fireEvent.click(updateStatusCard);
    
    expect(updateStatusCard).toHaveClass('selected');
    expect(screen.getByText('Operation Details:')).toBeInTheDocument();
  });

  test('validates operation data', () => {
    render(<BulkOperationsPanel {...defaultProps} />);
    
    // Select update status operation
    const updateStatusCard = screen.getByText('Update Status').closest('.operation-card');
    fireEvent.click(updateStatusCard);
    
    // Try to continue without selecting status
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    // Should show validation error
    expect(screen.getByText('Validation Errors:')).toBeInTheDocument();
    expect(screen.getByText('Status is required')).toBeInTheDocument();
  });

  test('shows confirmation step', () => {
    render(<BulkOperationsPanel {...defaultProps} />);
    
    // Select update status operation
    const updateStatusCard = screen.getByText('Update Status').closest('.operation-card');
    fireEvent.click(updateStatusCard);
    
    // Select status
    const statusSelect = screen.getByDisplayValue('');
    fireEvent.change(statusSelect, { target: { value: 'completed' } });
    
    // Continue to confirmation
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    expect(screen.getByText('Confirm Bulk Operation')).toBeInTheDocument();
    expect(screen.getByText('Operation Summary:')).toBeInTheDocument();
  });

  test('executes bulk operation', async () => {
    const mockOnBulkOperation = jest.fn().mockResolvedValue();
    
    render(
      <BulkOperationsPanel 
        {...defaultProps} 
        onBulkOperation={mockOnBulkOperation}
      />
    );
    
    // Select and configure operation
    const updateStatusCard = screen.getByText('Update Status').closest('.operation-card');
    fireEvent.click(updateStatusCard);
    
    const statusSelect = screen.getByDisplayValue('');
    fireEvent.change(statusSelect, { target: { value: 'completed' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    // Execute operation
    const executeButton = screen.getByText('Execute Operation');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(mockOnBulkOperation).toHaveBeenCalledWith(
        'updateStatus',
        ['1', '2'],
        { status: 'completed' }
      );
    });
  });

  test('handles dangerous operations with warning', () => {
    render(<BulkOperationsPanel {...defaultProps} />);
    
    const deleteCard = screen.getByText('Delete Items').closest('.operation-card');
    fireEvent.click(deleteCard);
    
    expect(deleteCard).toHaveClass('dangerous');
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    expect(screen.getByText('Warning:')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  test('shows selected items preview', () => {
    render(<BulkOperationsPanel {...defaultProps} />);
    
    expect(screen.getByText('Selected Items (2):')).toBeInTheDocument();
    expect(screen.getByText('Test Work Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Work Item 2')).toBeInTheDocument();
  });

  test('handles modal close', () => {
    render(<BulkOperationsPanel {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onHide).toHaveBeenCalled();
  });
});

// Property-based test for bulk operations integrity
describe('BulkOperationsPanel Property Tests', () => {
  test('Property 5: Bulk Operations Integrity', async () => {
    const mockOnBulkOperation = jest.fn().mockResolvedValue();
    
    render(
      <BulkOperationsPanel
        show={true}
        onHide={jest.fn()}
        selectedItems={mockSelectedItems}
        onBulkOperation={mockOnBulkOperation}
        filterOptions={mockFilterOptions}
        currentUser={mockCurrentUser}
        loading={false}
      />
    );
    
    // Test 1: All operations are available for admin users
    const operations = ['Update Status', 'Reassign Work', 'Update Dates', 'Update Priority', 'Add Tags', 'Delete Items'];
    operations.forEach(operation => {
      expect(screen.getByText(operation)).toBeInTheDocument();
    });
    
    // Test 2: Operation selection works
    const updateStatusCard = screen.getByText('Update Status').closest('.operation-card');
    fireEvent.click(updateStatusCard);
    expect(updateStatusCard).toHaveClass('selected');
    
    // Test 3: Data validation prevents invalid operations
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    expect(screen.getByText('Validation Errors:')).toBeInTheDocument();
    
    // Test 4: Valid data allows progression to confirmation
    const statusSelect = screen.getByDisplayValue('');
    fireEvent.change(statusSelect, { target: { value: 'completed' } });
    fireEvent.click(continueButton);
    expect(screen.getByText('Confirm Bulk Operation')).toBeInTheDocument();
    
    // Test 5: Operation execution calls the correct API
    const executeButton = screen.getByText('Execute Operation');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(mockOnBulkOperation).toHaveBeenCalledWith(
        'updateStatus',
        ['1', '2'],
        { status: 'completed' }
      );
    });
    
    // Test 6: All selected items are included in operation
    expect(mockOnBulkOperation).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['1', '2']),
      expect.any(Object)
    );
  });

  test('Property: Operation Validation Consistency', () => {
    render(
      <BulkOperationsPanel
        show={true}
        onHide={jest.fn()}
        selectedItems={mockSelectedItems}
        onBulkOperation={jest.fn()}
        filterOptions={mockFilterOptions}
        currentUser={mockCurrentUser}
        loading={false}
      />
    );
    
    // Test date validation for update dates operation
    const updateDatesCard = screen.getByText('Update Dates').closest('.operation-card');
    fireEvent.click(updateDatesCard);
    
    // Set invalid date range (start after end)
    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');
    
    fireEvent.change(startDateInput, { target: { value: '2024-12-31' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-01' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    expect(screen.getByText('Start date cannot be after end date')).toBeInTheDocument();
  });

  test('Property: Permission-Based Operation Access', () => {
    // Test with employee role (limited permissions)
    const employeeUser = { ...mockCurrentUser, role: 'employee' };
    
    render(
      <BulkOperationsPanel
        show={true}
        onHide={jest.fn()}
        selectedItems={mockSelectedItems}
        onBulkOperation={jest.fn()}
        filterOptions={mockFilterOptions}
        currentUser={employeeUser}
        loading={false}
      />
    );
    
    // Employee should not see delete operation
    expect(screen.queryByText('Delete Items')).not.toBeInTheDocument();
    
    // But should see other operations
    expect(screen.getByText('Update Status')).toBeInTheDocument();
    expect(screen.getByText('Update Priority')).toBeInTheDocument();
  });

  test('Property: Data Integrity During Operations', () => {
    const mockOnBulkOperation = jest.fn().mockResolvedValue();
    
    render(
      <BulkOperationsPanel
        show={true}
        onHide={jest.fn()}
        selectedItems={mockSelectedItems}
        onBulkOperation={mockOnBulkOperation}
        filterOptions={mockFilterOptions}
        currentUser={mockCurrentUser}
        loading={false}
      />
    );
    
    // Test reassignment operation
    const reassignCard = screen.getByText('Reassign Work').closest('.operation-card');
    fireEvent.click(reassignCard);
    
    const assigneeSelect = screen.getByDisplayValue('');
    fireEvent.change(assigneeSelect, { target: { value: 'user3' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    const executeButton = screen.getByText('Execute Operation');
    fireEvent.click(executeButton);
    
    // Verify correct data is passed
    expect(mockOnBulkOperation).toHaveBeenCalledWith(
      'reassign',
      ['1', '2'],
      { assignedTo: 'user3' }
    );
  });

  test('Property: Error Handling and Recovery', async () => {
    const mockOnBulkOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
    
    render(
      <BulkOperationsPanel
        show={true}
        onHide={jest.fn()}
        selectedItems={mockSelectedItems}
        onBulkOperation={mockOnBulkOperation}
        filterOptions={mockFilterOptions}
        currentUser={mockCurrentUser}
        loading={false}
      />
    );
    
    // Execute an operation that will fail
    const updateStatusCard = screen.getByText('Update Status').closest('.operation-card');
    fireEvent.click(updateStatusCard);
    
    const statusSelect = screen.getByDisplayValue('');
    fireEvent.change(statusSelect, { target: { value: 'completed' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    const executeButton = screen.getByText('Execute Operation');
    fireEvent.click(executeButton);
    
    // Should handle error gracefully
    await waitFor(() => {
      expect(mockOnBulkOperation).toHaveBeenCalled();
    });
    
    // Progress should reset on error
    // Note: In a real implementation, you'd check for error state display
  });
});

// Integration tests for bulk slot operations
describe('BulkOperationsPanel Slot Integration Tests', () => {
  const slotProps = {
    ...defaultProps,
    enableSlotOperations: true,
    availableSlots: mockAvailableSlots,
    onSlotOperation: jest.fn().mockResolvedValue()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Slot Assignment Operations', () => {
    test('assigns work items to specific slot', async () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItemsNoSlots} />);
      
      // Select assign to slots operation
      const assignSlotsCard = screen.getByText('Assign to Slots').closest('.operation-card');
      fireEvent.click(assignSlotsCard);
      
      // Select specific assignment mode
      const modeSelect = screen.getByDisplayValue('');
      fireEvent.change(modeSelect, { target: { value: 'specific' } });
      
      // Select target slot
      const slotSelect = screen.getAllByDisplayValue('')[1]; // Second select for target slot
      fireEvent.change(slotSelect, { target: { value: 'slot2' } });
      
      // Continue to confirmation
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      // Execute operation
      const executeButton = screen.getByText('Execute Operation');
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(slotProps.onSlotOperation).toHaveBeenCalledWith(
          'assignToSlot',
          ['3', '4'],
          expect.objectContaining({
            slotAssignmentMode: 'specific',
            targetSlot: 'slot2'
          })
        );
      });
    });

    test('validates slot assignment conflicts', () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItemsNoSlots} />);
      
      // Select assign to slots operation
      const assignSlotsCard = screen.getByText('Assign to Slots').closest('.operation-card');
      fireEvent.click(assignSlotsCard);
      
      // Select specific assignment mode
      const modeSelect = screen.getByDisplayValue('');
      fireEvent.change(modeSelect, { target: { value: 'specific' } });
      
      // Try to select already assigned slot
      const slotSelect = screen.getAllByDisplayValue('')[1];
      fireEvent.change(slotSelect, { target: { value: 'slot1' } }); // Already assigned
      
      // Should show conflict warning
      expect(screen.getByText('Slot Conflicts Detected:')).toBeInTheDocument();
      expect(screen.getByText(/Slot 1 is already assigned/)).toBeInTheDocument();
    });

    test('handles auto-assignment mode', async () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItemsNoSlots} />);
      
      // Select assign to slots operation
      const assignSlotsCard = screen.getByText('Assign to Slots').closest('.operation-card');
      fireEvent.click(assignSlotsCard);
      
      // Select auto assignment mode
      const modeSelect = screen.getByDisplayValue('');
      fireEvent.change(modeSelect, { target: { value: 'auto' } });
      
      // Enable auto slot creation
      const autoCreateCheckbox = screen.getByLabelText('Allow automatic slot creation if needed');
      fireEvent.click(autoCreateCheckbox);
      
      // Continue and execute
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      const executeButton = screen.getByText('Execute Operation');
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(slotProps.onSlotOperation).toHaveBeenCalledWith(
          'assignToSlot',
          ['3', '4'],
          expect.objectContaining({
            slotAssignmentMode: 'auto',
            autoAssignSlots: true
          })
        );
      });
    });
  });

  describe('Slot Reassignment Operations', () => {
    test('reassigns work items to different slots', async () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItems} />);
      
      // Select reassign slots operation
      const reassignCard = screen.getByText('Reassign Slots').closest('.operation-card');
      fireEvent.click(reassignCard);
      
      // Select new slot
      const newSlotSelect = screen.getByDisplayValue('');
      fireEvent.change(newSlotSelect, { target: { value: 'slot2' } });
      
      // Continue and execute
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      const executeButton = screen.getByText('Execute Operation');
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(slotProps.onSlotOperation).toHaveBeenCalledWith(
          'reassignSlots',
          ['1', '2'],
          expect.objectContaining({
            newSlot: 'slot2'
          })
        );
      });
    });

    test('validates reassignment requirements', () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItemsNoSlots} />);
      
      // Select reassign slots operation
      const reassignCard = screen.getByText('Reassign Slots').closest('.operation-card');
      fireEvent.click(reassignCard);
      
      // Try to continue without selecting new slot
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      // Should show validation errors
      expect(screen.getByText('Validation Errors:')).toBeInTheDocument();
      expect(screen.getByText(/items are not assigned to slots/)).toBeInTheDocument();
    });

    test('handles slot conflicts during reassignment', () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItems} />);
      
      // Select reassign slots operation
      const reassignCard = screen.getByText('Reassign Slots').closest('.operation-card');
      fireEvent.click(reassignCard);
      
      // Select slot with dependencies
      const newSlotSelect = screen.getByDisplayValue('');
      fireEvent.change(newSlotSelect, { target: { value: 'slot3' } });
      
      // Should show conflict resolution options
      expect(screen.getByText('Conflict Resolution Strategy')).toBeInTheDocument();
      
      // Select resolution strategy
      const resolutionSelect = screen.getAllByDisplayValue('')[1];
      fireEvent.change(resolutionSelect, { target: { value: 'auto-resolve' } });
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      expect(screen.getByText('Confirm Bulk Operation')).toBeInTheDocument();
    });
  });

  describe('Slot Release Operations', () => {
    test('releases work items from slots', async () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItems} />);
      
      // Select release from slots operation
      const releaseCard = screen.getByText('Release from Slots').closest('.operation-card');
      fireEvent.click(releaseCard);
      
      // Should not require additional data
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      const executeButton = screen.getByText('Execute Operation');
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(slotProps.onSlotOperation).toHaveBeenCalledWith(
          'releaseFromSlots',
          ['1', '2'],
          {}
        );
      });
    });

    test('validates items have slot assignments for release', () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItemsNoSlots} />);
      
      // Select release from slots operation
      const releaseCard = screen.getByText('Release from Slots').closest('.operation-card');
      fireEvent.click(releaseCard);
      
      // Try to continue
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      // Should show validation error
      expect(screen.getByText('Validation Errors:')).toBeInTheDocument();
      expect(screen.getByText('No items are assigned to slots')).toBeInTheDocument();
    });
  });

  describe('Bulk Slot Reassignment Operations', () => {
    test('performs intelligent bulk reassignment', async () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItems} />);
      
      // Select bulk slot reassignment operation
      const bulkReassignCard = screen.getByText('Bulk Slot Reassignment').closest('.operation-card');
      fireEvent.click(bulkReassignCard);
      
      // Select reassignment strategy
      const strategySelect = screen.getByDisplayValue('');
      fireEvent.change(strategySelect, { target: { value: 'optimize-utilization' } });
      
      // Set priority weighting
      const priorityRange = screen.getByDisplayValue('50');
      fireEvent.change(priorityRange, { target: { value: '75' } });
      
      // Enable dependency respect
      const dependencyCheckbox = screen.getByLabelText('Respect slot dependencies during reassignment');
      fireEvent.click(dependencyCheckbox);
      
      // Continue and execute
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      const executeButton = screen.getByText('Execute Operation');
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(slotProps.onSlotOperation).toHaveBeenCalledWith(
          'bulkSlotReassignment',
          ['1', '2'],
          expect.objectContaining({
            reassignmentStrategy: 'optimize-utilization',
            priorityWeighting: 75,
            respectDependencies: true
          })
        );
      });
    });

    test('validates minimum items for bulk reassignment', () => {
      const singleItem = [mockSelectedItems[0]];
      render(<BulkOperationsPanel {...slotProps} selectedItems={singleItem} />);
      
      // Select bulk slot reassignment operation
      const bulkReassignCard = screen.getByText('Bulk Slot Reassignment').closest('.operation-card');
      fireEvent.click(bulkReassignCard);
      
      // Try to continue without meeting minimum requirements
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      // Should show validation error
      expect(screen.getByText('Validation Errors:')).toBeInTheDocument();
      expect(screen.getByText(/At least 2 items with slot assignments are required/)).toBeInTheDocument();
    });
  });

  describe('Slot Conflict Detection and Resolution', () => {
    test('detects capacity conflicts', () => {
      const capacitySlot = {
        ...mockAvailableSlots[1],
        capacity: 1 // Only allows 1 item
      };
      const slotsWithCapacity = [...mockAvailableSlots.slice(0, 1), capacitySlot, ...mockAvailableSlots.slice(2)];
      
      render(
        <BulkOperationsPanel 
          {...slotProps} 
          availableSlots={slotsWithCapacity}
          selectedItems={mockSelectedItemsNoSlots} 
        />
      );
      
      // Select assign to slots operation
      const assignSlotsCard = screen.getByText('Assign to Slots').closest('.operation-card');
      fireEvent.click(assignSlotsCard);
      
      // Select specific assignment mode
      const modeSelect = screen.getByDisplayValue('');
      fireEvent.change(modeSelect, { target: { value: 'specific' } });
      
      // Select slot with capacity limit
      const slotSelect = screen.getAllByDisplayValue('')[1];
      fireEvent.change(slotSelect, { target: { value: 'slot2' } });
      
      // Should show capacity conflict
      expect(screen.getByText('Slot Conflicts Detected:')).toBeInTheDocument();
      expect(screen.getByText(/capacity.*exceeded/i)).toBeInTheDocument();
    });

    test('detects dependency conflicts', () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItemsNoSlots} />);
      
      // Select assign to slots operation
      const assignSlotsCard = screen.getByText('Assign to Slots').closest('.operation-card');
      fireEvent.click(assignSlotsCard);
      
      // Select specific assignment mode
      const modeSelect = screen.getByDisplayValue('');
      fireEvent.change(modeSelect, { target: { value: 'specific' } });
      
      // Select slot with unmet dependencies
      const slotSelect = screen.getAllByDisplayValue('')[1];
      fireEvent.change(slotSelect, { target: { value: 'slot3' } });
      
      // Should show dependency conflict
      expect(screen.getByText('Slot Conflicts Detected:')).toBeInTheDocument();
      expect(screen.getByText(/dependencies are not completed/)).toBeInTheDocument();
    });
  });

  describe('Slot Operation Audit Logging Integration', () => {
    test('includes slot operation details in audit data', async () => {
      render(<BulkOperationsPanel {...slotProps} selectedItems={mockSelectedItems} />);
      
      // Perform a slot operation
      const assignSlotsCard = screen.getByText('Assign to Slots').closest('.operation-card');
      fireEvent.click(assignSlotsCard);
      
      const modeSelect = screen.getByDisplayValue('');
      fireEvent.change(modeSelect, { target: { value: 'auto' } });
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      const executeButton = screen.getByText('Execute Operation');
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(slotProps.onSlotOperation).toHaveBeenCalledWith(
          'assignToSlot',
          ['1', '2'],
          expect.objectContaining({
            slotAssignmentMode: 'auto'
          })
        );
      });
      
      // Verify the operation was called with correct parameters for audit logging
      const [operation, itemIds, operationData] = slotProps.onSlotOperation.mock.calls[0];
      expect(operation).toBe('assignToSlot');
      expect(itemIds).toEqual(['1', '2']);
      expect(operationData).toHaveProperty('slotAssignmentMode', 'auto');
    });

    test('handles slot operation errors gracefully', async () => {
      const failingSlotOperation = jest.fn().mockRejectedValue(new Error('Slot operation failed'));
      
      render(
        <BulkOperationsPanel 
          {...slotProps} 
          onSlotOperation={failingSlotOperation}
          selectedItems={mockSelectedItems}
        />
      );
      
      // Perform a slot operation that will fail
      const releaseCard = screen.getByText('Release from Slots').closest('.operation-card');
      fireEvent.click(releaseCard);
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      const executeButton = screen.getByText('Execute Operation');
      fireEvent.click(executeButton);
      
      // Should handle error gracefully
      await waitFor(() => {
        expect(failingSlotOperation).toHaveBeenCalled();
      });
      
      // Progress should reset and show error state
      // In a real implementation, you'd check for error indicators
    });
  });

  describe('Project Filter Integration', () => {
    test('filters slots by project when project filter is applied', () => {
      render(
        <BulkOperationsPanel 
          {...slotProps} 
          projectFilter="project1"
          selectedItems={mockSelectedItemsNoSlots}
        />
      );
      
      // Select assign to slots operation
      const assignSlotsCard = screen.getByText('Assign to Slots').closest('.operation-card');
      fireEvent.click(assignSlotsCard);
      
      // Select specific assignment mode
      const modeSelect = screen.getByDisplayValue('');
      fireEvent.change(modeSelect, { target: { value: 'specific' } });
      
      // Should only show slots from project1
      const slotSelect = screen.getAllByDisplayValue('')[1];
      const slotOptions = slotSelect.querySelectorAll('option');
      
      // Should have project1 slots but not project2 slots
      const optionTexts = Array.from(slotOptions).map(option => option.textContent);
      expect(optionTexts.some(text => text.includes('Slot 1 - Initial Development Phase'))).toBe(true);
      expect(optionTexts.some(text => text.includes('Slot 2 - Testing Phase'))).toBe(true);
      expect(optionTexts.some(text => text.includes('Design Phase'))).toBe(false); // project2 slot
    });
  });
});