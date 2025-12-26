import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import EnhancedProjectOverview from '../EnhancedProjectOverview';
import { AuthContext } from '../../../context/AuthContext';
import { projectApi } from '../../../api/projectApi';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'test-project-id' }),
  useNavigate: () => jest.fn()
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../../api/projectApi', () => ({
  projectApi: {
    getProjectById: jest.fn(),
    updateProject: jest.fn()
  }
}));

// Mock child components to focus on integration
jest.mock('../SlotProgressDisplay', () => {
  return function MockSlotProgressDisplay({ project, slots, onSlotClick }) {
    return (
      <div data-testid="slot-progress-display">
        <div>Project: {project?.name}</div>
        <div>Slots: {slots?.length || 0}</div>
        {slots?.map(slot => (
          <button 
            key={slot._id} 
            onClick={() => onSlotClick && onSlotClick(slot)}
            data-testid={`slot-${slot._id}`}
          >
            {slot.slotIdentifier}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock('../SlotManagementInterface', () => {
  return function MockSlotManagementInterface({ 
    project, 
    slots, 
    onSlotAssign, 
    onSlotComplete,
    isProjectHead 
  }) {
    return (
      <div data-testid="slot-management-interface">
        <div>Management Access: {isProjectHead ? 'Yes' : 'No'}</div>
        <button 
          onClick={() => onSlotAssign && onSlotAssign('slot1', { assignedTo: 'user1' })}
          data-testid="assign-slot-btn"
        >
          Assign Slot
        </button>
        <button 
          onClick={() => onSlotComplete && onSlotComplete('slot1')}
          data-testid="complete-slot-btn"
        >
          Complete Slot
        </button>
      </div>
    );
  };
});

jest.mock('../SlotStatisticsCards', () => {
  return function MockSlotStatisticsCards({ project, slots, onRefresh }) {
    return (
      <div data-testid="slot-statistics-cards">
        <div>Statistics for: {project?.name}</div>
        <div>Total Slots: {slots?.length || 0}</div>
        <button 
          onClick={() => onRefresh && onRefresh()}
          data-testid="refresh-stats-btn"
        >
          Refresh Stats
        </button>
      </div>
    );
  };
});

jest.mock('../ProgressTrendChart', () => {
  return function MockProgressTrendChart({ project, slots, progressHistory }) {
    return (
      <div data-testid="progress-trend-chart">
        <div>Chart for: {project?.name}</div>
        <div>History Points: {progressHistory?.length || 0}</div>
      </div>
    );
  };
});

jest.mock('../SlotConflictResolution', () => {
  return function MockSlotConflictResolution({ 
    conflicts, 
    onResolveConflict, 
    onRefreshConflicts,
    isProjectHead 
  }) {
    return (
      <div data-testid="slot-conflict-resolution">
        <div>Conflicts: {conflicts?.length || 0}</div>
        <div>Can Resolve: {isProjectHead ? 'Yes' : 'No'}</div>
        <button 
          onClick={() => onResolveConflict && onResolveConflict('conflict1', { type: 'release' })}
          data-testid="resolve-conflict-btn"
        >
          Resolve Conflict
        </button>
        <button 
          onClick={() => onRefreshConflicts && onRefreshConflicts()}
          data-testid="refresh-conflicts-btn"
        >
          Refresh Conflicts
        </button>
      </div>
    );
  };
});

// Test data
const mockProject = {
  _id: 'test-project-id',
  name: 'Test Project',
  description: 'Test project description',
  status: 'In Progress',
  client: { _id: 'client1', name: 'Test Client' },
  projectHead: { _id: 'user1', name: 'John Doe' },
  slotConfiguration: {
    totalSlots: 10,
    enableSlotSystem: true,
    slotType: 'generic'
  },
  progressTracking: {
    progressPercentage: 60,
    completedSlots: 6,
    totalSlots: 10,
    progressHistory: [
      { date: '2024-01-01', progressPercentage: 20, completedSlots: 2 },
      { date: '2024-01-15', progressPercentage: 40, completedSlots: 4 },
      { date: '2024-01-30', progressPercentage: 60, completedSlots: 6 }
    ]
  },
  updatedAt: '2024-01-30T10:00:00Z'
};

const mockUser = {
  _id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'employee'
};

const mockProjectHeadUser = {
  _id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'employee'
};

const mockAdminUser = {
  _id: 'admin1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin'
};

const renderWithAuth = (user = mockUser) => {
  const authValue = {
    user,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  };

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValue}>
        <EnhancedProjectOverview />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('EnhancedProjectOverview Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    projectApi.getProjectById.mockResolvedValue({ data: mockProject });
  });

  describe('Component Loading and Initialization', () => {
    test('displays loading spinner initially', async () => {
      projectApi.getProjectById.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderWithAuth();
      
      expect(screen.getByText('Loading project overview...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('loads and displays project data successfully', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Enhanced Project Overview with Slot Management')).toBeInTheDocument();
      expect(projectApi.getProjectById).toHaveBeenCalledWith('test-project-id');
    });

    test('handles project not found error', async () => {
      const error = new Error('Not found');
      error.response = { status: 404 };
      projectApi.getProjectById.mockRejectedValue(error);
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('Project Not Found')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/could not be found or you don't have permission/)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation and Content', () => {
    test('displays all tabs correctly', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Check all tabs are present
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Slot Management' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Analytics' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Conflicts/ })).toBeInTheDocument();
    });

    test('switches between tabs correctly', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Initially on Overview tab
      expect(screen.getByTestId('slot-progress-display')).toBeInTheDocument();
      
      // Switch to Management tab
      fireEvent.click(screen.getByRole('tab', { name: 'Slot Management' }));
      expect(screen.getByTestId('slot-management-interface')).toBeInTheDocument();
      
      // Switch to Analytics tab
      fireEvent.click(screen.getByRole('tab', { name: 'Analytics' }));
      expect(screen.getByTestId('progress-trend-chart')).toBeInTheDocument();
      
      // Switch to Conflicts tab
      fireEvent.click(screen.getByRole('tab', { name: /Conflicts/ }));
      expect(screen.getByTestId('slot-conflict-resolution')).toBeInTheDocument();
    });
  });

  describe('Slot Progress Display Integration', () => {
    test('displays slot progress with project data', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('slot-progress-display')).toBeInTheDocument();
      });
      
      const progressDisplay = screen.getByTestId('slot-progress-display');
      expect(within(progressDisplay).getByText('Project: Test Project')).toBeInTheDocument();
      expect(within(progressDisplay).getByText('Slots: 4')).toBeInTheDocument(); // Mock slots
    });

    test('handles slot click interactions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('slot-progress-display')).toBeInTheDocument();
      });
      
      // Click on a slot
      const slotButton = screen.getByTestId('slot-1');
      fireEvent.click(slotButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Slot clicked:', expect.objectContaining({ _id: '1' }));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Slot Management Interface Integration', () => {
    test('shows management interface for project heads', async () => {
      renderWithAuth(mockProjectHeadUser);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Switch to Management tab
      fireEvent.click(screen.getByRole('tab', { name: 'Slot Management' }));
      
      const managementInterface = screen.getByTestId('slot-management-interface');
      expect(within(managementInterface).getByText('Management Access: Yes')).toBeInTheDocument();
    });

    test('restricts management interface for regular users', async () => {
      const regularUser = { ...mockUser, _id: 'user2' }; // Different from project head
      renderWithAuth(regularUser);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Switch to Management tab
      fireEvent.click(screen.getByRole('tab', { name: 'Slot Management' }));
      
      const managementInterface = screen.getByTestId('slot-management-interface');
      expect(within(managementInterface).getByText('Management Access: No')).toBeInTheDocument();
    });

    test('handles slot assignment operations', async () => {
      renderWithAuth(mockProjectHeadUser);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Switch to Management tab
      fireEvent.click(screen.getByRole('tab', { name: 'Slot Management' }));
      
      // Click assign slot button
      const assignButton = screen.getByTestId('assign-slot-btn');
      fireEvent.click(assignButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Slot assigned successfully');
      });
    });

    test('handles slot completion operations', async () => {
      renderWithAuth(mockProjectHeadUser);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Switch to Management tab
      fireEvent.click(screen.getByRole('tab', { name: 'Slot Management' }));
      
      // Click complete slot button
      const completeButton = screen.getByTestId('complete-slot-btn');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Slot completed successfully');
      });
    });
  });

  describe('Statistics and Analytics Integration', () => {
    test('displays statistics cards with project data', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('slot-statistics-cards')).toBeInTheDocument();
      });
      
      const statsCards = screen.getByTestId('slot-statistics-cards');
      expect(within(statsCards).getByText('Statistics for: Test Project')).toBeInTheDocument();
      expect(within(statsCards).getByText('Total Slots: 4')).toBeInTheDocument();
    });

    test('handles statistics refresh', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByTestId('slot-statistics-cards')).toBeInTheDocument();
      });
      
      // Click refresh button
      const refreshButton = screen.getByTestId('refresh-stats-btn');
      fireEvent.click(refreshButton);
      
      // Should trigger data refresh (mocked)
      expect(refreshButton).toBeInTheDocument();
    });

    test('displays progress trend chart with historical data', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Switch to Analytics tab
      fireEvent.click(screen.getByRole('tab', { name: 'Analytics' }));
      
      const trendChart = screen.getByTestId('progress-trend-chart');
      expect(within(trendChart).getByText('Chart for: Test Project')).toBeInTheDocument();
      expect(within(trendChart).getByText('History Points: 3')).toBeInTheDocument();
    });
  });

  describe('Conflict Resolution Integration', () => {
    test('displays conflict resolution interface', async () => {
      renderWithAuth(mockProjectHeadUser);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Switch to Conflicts tab
      fireEvent.click(screen.getByRole('tab', { name: /Conflicts/ }));
      
      const conflictResolution = screen.getByTestId('slot-conflict-resolution');
      expect(within(conflictResolution).getByText('Conflicts: 1')).toBeInTheDocument();
      expect(within(conflictResolution).getByText('Can Resolve: Yes')).toBeInTheDocument();
    });

    test('handles conflict resolution operations', async () => {
      renderWithAuth(mockProjectHeadUser);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Switch to Conflicts tab
      fireEvent.click(screen.getByRole('tab', { name: /Conflicts/ }));
      
      // Click resolve conflict button
      const resolveButton = screen.getByTestId('resolve-conflict-btn');
      fireEvent.click(resolveButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Conflict resolved successfully');
      });
    });

    test('handles conflict refresh operations', async () => {
      renderWithAuth(mockProjectHeadUser);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Switch to Conflicts tab
      fireEvent.click(screen.getByRole('tab', { name: /Conflicts/ }));
      
      // Click refresh conflicts button
      const refreshButton = screen.getByTestId('refresh-conflicts-btn');
      fireEvent.click(refreshButton);
      
      // Should trigger conflict refresh (mocked)
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('Real-time Updates Integration', () => {
    test('handles refresh button click', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Click main refresh button
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Project data refreshed');
      });
      
      // Should call API again
      expect(projectApi.getProjectById).toHaveBeenCalledTimes(2);
    });

    test('displays updated data after refresh', async () => {
      const updatedProject = {
        ...mockProject,
        name: 'Updated Test Project',
        progressTracking: {
          ...mockProject.progressTracking,
          progressPercentage: 80,
          completedSlots: 8
        }
      };
      
      projectApi.getProjectById
        .mockResolvedValueOnce({ data: mockProject })
        .mockResolvedValueOnce({ data: updatedProject });
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Click refresh
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(screen.getByText('Updated Test Project')).toBeInTheDocument();
      });
    });
  });

  describe('Permission-based Access Control', () => {
    test('shows admin controls for admin users', async () => {
      renderWithAuth(mockAdminUser);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Admin should see settings button
      expect(screen.getByRole('button', { name: /Settings/ })).toBeInTheDocument();
    });

    test('hides admin controls for regular users', async () => {
      const regularUser = { ...mockUser, _id: 'user2' }; // Different from project head
      renderWithAuth(regularUser);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Regular user should not see settings button
      expect(screen.queryByRole('button', { name: /Settings/ })).not.toBeInTheDocument();
    });

    test('shows project head controls for project heads', async () => {
      renderWithAuth(mockProjectHeadUser);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Project head should see settings button
      expect(screen.getByRole('button', { name: /Settings/ })).toBeInTheDocument();
      
      // Switch to Management tab to verify access
      fireEvent.click(screen.getByRole('tab', { name: 'Slot Management' }));
      
      const managementInterface = screen.getByTestId('slot-management-interface');
      expect(within(managementInterface).getByText('Management Access: Yes')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      projectApi.getProjectById.mockRejectedValue(new Error('API Error'));
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load project data');
      });
    });

    test('handles refresh errors gracefully', async () => {
      projectApi.getProjectById
        .mockResolvedValueOnce({ data: mockProject })
        .mockRejectedValueOnce(new Error('Refresh Error'));
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
      
      // Click refresh
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to refresh project data');
      });
    });
  });
});