import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { toast } from 'react-toastify';

// Import components to test
import SlotSelectionDropdown from '../SlotSelectionDropdown';
import SlotOptionCard from '../SlotOptionCard';
import SlotAvailabilityIndicator from '../SlotAvailabilityIndicator';
import SlotRecommendationEngine from '../SlotRecommendationEngine';
import NoSlotsAvailable from '../NoSlotsAvailable';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

// Test data
const mockSlots = [
  {
    _id: 'slot1',
    slotNumber: 1,
    slotIdentifier: 'Slot 1',
    title: 'Initial Setup',
    description: 'Project setup and configuration',
    assignmentStatus: 'available',
    priority: 'High',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedEffort: 8,
    dependencies: [],
    slotConfiguration: {
      isRequired: true,
      canBeSkipped: false,
      requiresApproval: false
    },
    slotMetadata: {
      tags: ['setup', 'configuration'],
      deliverables: ['Environment setup']
    }
  },
  {
    _id: 'slot2',
    slotNumber: 2,
    slotIdentifier: 'Slot 2',
    title: 'Development Phase 1',
    description: 'Core functionality development',
    assignmentStatus: 'assigned',
    assignedTo: { _id: 'user1', name: 'John Doe' },
    priority: 'High',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedEffort: 16,
    dependencies: ['slot1'],
    slotConfiguration: {
      isRequired: true,
      canBeSkipped: false,
      requiresApproval: true
    }
  },
  {
    _id: 'slot3',
    slotNumber: 3,
    slotIdentifier: 'Slot 3',
    title: 'Testing Phase',
    description: 'Quality assurance and testing',
    assignmentStatus: 'available',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedEffort: 12,
    dependencies: ['slot2'],
    slotConfiguration: {
      isRequired: false,
      canBeSkipped: true,
      requiresApproval: false
    }
  }
];

const mockWorkItemData = {
  type: 'task',
  title: 'Setup project environment',
  description: 'Initial project setup and configuration',
  priority: 'high',
  estimatedHours: 8,
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  tags: ['setup', 'configuration']
};

describe('Slot Selection Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SlotSelectionDropdown Component', () => {
    test('displays loading state initially', () => {
      render(
        <SlotSelectionDropdown 
          projectId="project1" 
          onSlotSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('Loading slots...')).toBeInTheDocument();
    });

    test('shows no project message when projectId is not provided', () => {
      render(<SlotSelectionDropdown onSlotSelect={jest.fn()} />);
      
      expect(screen.getByText('Please select a project first to view available slots')).toBeInTheDocument();
    });

    test('displays available slots after loading', async () => {
      const onSlotSelect = jest.fn();
      
      render(
        <SlotSelectionDropdown 
          projectId="project1" 
          onSlotSelect={onSlotSelect}
        />
      );
      
      // Wait for slots to load (mocked)
      await waitFor(() => {
        expect(screen.getByDisplayValue('')).toBeInTheDocument();
      });
      
      // Check that slots are available in dropdown
      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();
      
      // Should have placeholder option plus available slots
      const options = within(dropdown).getAllByRole('option');
      expect(options.length).toBeGreaterThan(1);
    });

    test('handles slot selection correctly', async () => {
      const onSlotSelect = jest.fn();
      
      render(
        <SlotSelectionDropdown 
          projectId="project1" 
          onSlotSelect={onSlotSelect}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
      
      // Select a slot
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'slot1' } });
      
      await waitFor(() => {
        expect(onSlotSelect).toHaveBeenCalled();
      });
    });

    test('shows slot details when slot is selected', async () => {
      render(
        <SlotSelectionDropdown 
          projectId="project1" 
          selectedSlot={mockSlots[0]}
          onSlotSelect={jest.fn()}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Slot 1')).toBeInTheDocument();
      });
      
      // Should show slot details
      expect(screen.getByText('Project setup and configuration')).toBeInTheDocument();
      expect(screen.getByText('8 hours')).toBeInTheDocument();
    });

    test('filters slots by availability when enabled', async () => {
      render(
        <SlotSelectionDropdown 
          projectId="project1" 
          filterByAvailability={true}
          onSlotSelect={jest.fn()}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
      
      // Should only show available and assigned slots (for reassignment)
      const dropdown = screen.getByRole('combobox');
      const options = within(dropdown).getAllByRole('option');
      
      // Check that completed/blocked slots are not shown
      const optionTexts = options.map(option => option.textContent);
      expect(optionTexts.some(text => text.includes('[Not Available]'))).toBe(false);
    });
  });

  describe('SlotOptionCard Component', () => {
    test('renders slot information correctly', () => {
      render(
        <SlotOptionCard 
          slot={mockSlots[0]} 
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('Slot 1')).toBeInTheDocument();
      expect(screen.getByText('Initial Setup')).toBeInTheDocument();
      expect(screen.getByText('Project setup and configuration')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
    });

    test('shows selected state correctly', () => {
      render(
        <SlotOptionCard 
          slot={mockSlots[0]} 
          isSelected={true}
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('Selected for assignment')).toBeInTheDocument();
      
      // Should have primary border styling
      const card = screen.getByText('Slot 1').closest('.card');
      expect(card).toHaveClass('border-primary');
    });

    test('handles click events when selectable', () => {
      const onSelect = jest.fn();
      
      render(
        <SlotOptionCard 
          slot={mockSlots[0]} 
          isSelectable={true}
          onSelect={onSelect} 
        />
      );
      
      const card = screen.getByText('Slot 1').closest('.card');
      fireEvent.click(card);
      
      expect(onSelect).toHaveBeenCalledWith(mockSlots[0]);
    });

    test('shows assignment information for assigned slots', () => {
      render(
        <SlotOptionCard 
          slot={mockSlots[1]} // Assigned slot
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('Assigned to John Doe')).toBeInTheDocument();
      expect(screen.getByText('Assigned')).toBeInTheDocument();
    });

    test('displays progress when enabled', () => {
      render(
        <SlotOptionCard 
          slot={mockSlots[1]} 
          showProgress={true}
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      
      // Should show progress bar
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    test('shows dependencies warning', () => {
      render(
        <SlotOptionCard 
          slot={mockSlots[2]} // Has dependencies
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('1 dependency(ies)')).toBeInTheDocument();
    });
  });

  describe('SlotAvailabilityIndicator Component', () => {
    test('shows loading state initially', () => {
      render(
        <SlotAvailabilityIndicator 
          slotId="slot1" 
          projectId="project1" 
        />
      );
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('displays status badge correctly', async () => {
      render(
        <SlotAvailabilityIndicator 
          slot={mockSlots[0]} // Available slot
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Available for assignment')).toBeInTheDocument();
      });
    });

    test('shows different variants correctly', () => {
      const { rerender } = render(
        <SlotAvailabilityIndicator 
          slot={mockSlots[0]}
          variant="text"
        />
      );
      
      expect(screen.getByText('Available for assignment')).toBeInTheDocument();
      
      // Test icon-only variant
      rerender(
        <SlotAvailabilityIndicator 
          slot={mockSlots[0]}
          variant="icon-only"
          showText={false}
        />
      );
      
      // Should only show icon, no text
      expect(screen.queryByText('Available for assignment')).not.toBeInTheDocument();
    });

    test('handles status changes with callback', async () => {
      const onStatusChange = jest.fn();
      
      render(
        <SlotAvailabilityIndicator 
          slotId="slot1"
          projectId="project1"
          onStatusChange={onStatusChange}
          realTimeUpdates={true}
          refreshInterval={1000}
        />
      );
      
      // Wait for initial load and potential status change
      await waitFor(() => {
        expect(screen.getByRole('generic')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('SlotRecommendationEngine Component', () => {
    test('shows analysis loading state', () => {
      render(
        <SlotRecommendationEngine 
          projectId="project1"
          workItemData={mockWorkItemData}
          onSlotSelect={jest.fn()}
        />
      );
      
      expect(screen.getByText('Analyzing Slot Recommendations')).toBeInTheDocument();
      expect(screen.getByText(/Analyzing work item characteristics/)).toBeInTheDocument();
    });

    test('displays recommendations after analysis', async () => {
      const onSlotSelect = jest.fn();
      
      render(
        <SlotRecommendationEngine 
          projectId="project1"
          workItemData={mockWorkItemData}
          availableSlots={mockSlots}
          onSlotSelect={onSlotSelect}
        />
      );
      
      // Wait for analysis to complete
      await waitFor(() => {
        expect(screen.getByText('Recommended Slots')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Should show recommendations
      expect(screen.getByText('#1')).toBeInTheDocument(); // Rank badge
      expect(screen.getByText(/Match Score:/)).toBeInTheDocument();
    });

    test('handles slot selection from recommendations', async () => {
      const onSlotSelect = jest.fn();
      
      render(
        <SlotRecommendationEngine 
          projectId="project1"
          workItemData={mockWorkItemData}
          availableSlots={mockSlots}
          onSlotSelect={onSlotSelect}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Recommended Slots')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Click on "Select This Slot" button
      const selectButton = screen.getByText('Select This Slot');
      fireEvent.click(selectButton);
      
      expect(onSlotSelect).toHaveBeenCalled();
    });

    test('shows no recommendations message when no slots available', async () => {
      render(
        <SlotRecommendationEngine 
          projectId="project1"
          workItemData={mockWorkItemData}
          availableSlots={[]} // No available slots
          onSlotSelect={jest.fn()}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/No slot recommendations available/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('displays reasoning details when enabled', async () => {
      render(
        <SlotRecommendationEngine 
          projectId="project1"
          workItemData={mockWorkItemData}
          availableSlots={mockSlots}
          showReasoningDetails={true}
          onSlotSelect={jest.fn()}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Why this slot is recommended:')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Should show reasoning badges
      expect(screen.getByText(/Priority alignment/)).toBeInTheDocument();
    });
  });

  describe('NoSlotsAvailable Component', () => {
    test('shows no project selected message', () => {
      render(
        <NoSlotsAvailable 
          reason="no-project"
        />
      );
      
      expect(screen.getByText('No Project Selected')).toBeInTheDocument();
      expect(screen.getByText('Please select a project first to view available slots.')).toBeInTheDocument();
    });

    test('shows no slots configured message', () => {
      render(
        <NoSlotsAvailable 
          projectId="project1"
          projectName="Test Project"
          reason="no-slots"
        />
      );
      
      expect(screen.getByText('No Slots Configured')).toBeInTheDocument();
      expect(screen.getByText(/doesn't have any slots set up yet/)).toBeInTheDocument();
    });

    test('shows all slots assigned message', () => {
      render(
        <NoSlotsAvailable 
          projectId="project1"
          reason="all-assigned"
        />
      );
      
      expect(screen.getByText('All Slots Are Assigned')).toBeInTheDocument();
      expect(screen.getByText(/All available slots in this project are currently assigned/)).toBeInTheDocument();
    });

    test('shows create slot button for project managers', () => {
      const onCreateSlot = jest.fn();
      
      render(
        <NoSlotsAvailable 
          projectId="project1"
          reason="no-slots"
          canCreateSlots={true}
          onCreateSlot={onCreateSlot}
        />
      );
      
      const createButton = screen.getByText('Create New Slot');
      expect(createButton).toBeInTheDocument();
      
      fireEvent.click(createButton);
      expect(onCreateSlot).toHaveBeenCalled();
    });

    test('shows refresh button when available', () => {
      const onRefresh = jest.fn();
      
      render(
        <NoSlotsAvailable 
          projectId="project1"
          reason="loading-error"
          onRefresh={onRefresh}
        />
      );
      
      const refreshButton = screen.getByText('Refresh Slots');
      expect(refreshButton).toBeInTheDocument();
      
      fireEvent.click(refreshButton);
      expect(onRefresh).toHaveBeenCalled();
    });

    test('shows manage project button for authorized users', () => {
      const onManageProject = jest.fn();
      
      render(
        <NoSlotsAvailable 
          projectId="project1"
          reason="no-slots"
          canManageProject={true}
          onManageProject={onManageProject}
        />
      );
      
      const manageButton = screen.getByText('Manage Project');
      expect(manageButton).toBeInTheDocument();
      
      fireEvent.click(manageButton);
      expect(onManageProject).toHaveBeenCalled();
    });

    test('displays detailed information for different reasons', () => {
      const { rerender } = render(
        <NoSlotsAvailable reason="no-project" />
      );
      
      expect(screen.getByText('About Slot-Based Work Assignment')).toBeInTheDocument();
      
      // Test no-slots reason
      rerender(
        <NoSlotsAvailable 
          projectId="project1"
          projectName="Test Project"
          reason="no-slots" 
        />
      );
      
      expect(screen.getByText('Setting Up Slots for Test Project')).toBeInTheDocument();
      expect(screen.getByText('For Project Managers')).toBeInTheDocument();
      expect(screen.getByText('For Team Members')).toBeInTheDocument();
    });
  });

  describe('Slot Selection Workflow Integration', () => {
    test('complete workflow from no project to slot selection', async () => {
      const onSlotSelect = jest.fn();
      let projectId = null;
      
      const { rerender } = render(
        <div>
          {!projectId ? (
            <NoSlotsAvailable reason="no-project" />
          ) : (
            <SlotSelectionDropdown 
              projectId={projectId}
              onSlotSelect={onSlotSelect}
            />
          )}
        </div>
      );
      
      // Initially shows no project message
      expect(screen.getByText('No Project Selected')).toBeInTheDocument();
      
      // Simulate project selection
      projectId = 'project1';
      rerender(
        <div>
          {!projectId ? (
            <NoSlotsAvailable reason="no-project" />
          ) : (
            <SlotSelectionDropdown 
              projectId={projectId}
              onSlotSelect={onSlotSelect}
            />
          )}
        </div>
      );
      
      // Should now show slot dropdown
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });

    test('workflow with recommendations and selection', async () => {
      const onSlotSelect = jest.fn();
      
      render(
        <div>
          <SlotRecommendationEngine 
            projectId="project1"
            workItemData={mockWorkItemData}
            availableSlots={mockSlots}
            onSlotSelect={onSlotSelect}
          />
          <SlotSelectionDropdown 
            projectId="project1"
            onSlotSelect={onSlotSelect}
          />
        </div>
      );
      
      // Wait for recommendations to load
      await waitFor(() => {
        expect(screen.getByText('Recommended Slots')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Wait for dropdown to load
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
      
      // Select from recommendations
      const selectButton = screen.getByText('Select This Slot');
      fireEvent.click(selectButton);
      
      expect(onSlotSelect).toHaveBeenCalled();
    });

    test('handles error states gracefully', async () => {
      render(
        <NoSlotsAvailable 
          reason="loading-error"
          onRefresh={jest.fn()}
        />
      );
      
      expect(screen.getByText('Unable to Load Slots')).toBeInTheDocument();
      expect(screen.getByText('Refresh Slots')).toBeInTheDocument();
    });
  });
});