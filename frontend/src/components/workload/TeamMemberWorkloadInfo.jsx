import React, { useState, useEffect } from 'react';
import { Card, Badge, ProgressBar, Spinner, Alert } from 'react-bootstrap';
import { FaTasks, FaCalendar, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import workloadApi from '../../api/workloadApi';
import './TeamMemberWorkloadInfo.css';

const TeamMemberWorkloadInfo = ({ userId, userName, projectId }) => {
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchWorkload();
    }
  }, [userId]);

  const fetchWorkload = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await workloadApi.getEmployeeWorkload(userId);
      // Handle both response.data and direct response
      const workloadData = response.data || response;
      setWorkload(workloadData);
    } catch (err) {
      console.error('Error fetching workload:', err);
      setError('Could not load workload data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-2">
        <Spinner animation="border" size="sm" className="me-2" />
        <small>Loading workload...</small>
      </div>
    );
  }

  if (error) {
    console.error('Workload error for user:', userId, error);
    return <small className="text-muted">{error}</small>;
  }

  if (!workload) {
    console.warn('No workload data for user:', userId);
    return <small className="text-muted">No workload data</small>;
  }

  const getCapacityColor = (capacity) => {
    switch (capacity) {
      case 'available':
        return 'success';
      case 'busy':
        return 'warning';
      case 'overloaded':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getCapacityIcon = (capacity) => {
    switch (capacity) {
      case 'available':
        return <FaCheckCircle className="me-1" />;
      case 'busy':
        return <FaCalendar className="me-1" />;
      case 'overloaded':
        return <FaExclamationTriangle className="me-1" />;
      default:
        return <FaTasks className="me-1" />;
    }
  };

  return (
    <div className="team-member-workload-info">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="fw-bold">{userName}</small>
        {workload.capacity && (
          <Badge bg={getCapacityColor(workload.capacity)}>
            {getCapacityIcon(workload.capacity)}
            {workload.capacity?.charAt(0).toUpperCase() + workload.capacity?.slice(1)}
          </Badge>
        )}
      </div>

      <div className="workload-stats mb-2">
        <div className="stat-row d-flex justify-content-between mb-1">
          <small className="text-muted">Active Tasks:</small>
          <small className="fw-bold">{workload.totalActive !== undefined ? workload.totalActive : 0}</small>
        </div>
        <div className="stat-row d-flex justify-content-between mb-1">
          <small className="text-muted">Overdue:</small>
          <small className={(workload.overdue > 0) ? 'text-danger fw-bold' : 'text-muted'}>
            {workload.overdue !== undefined ? workload.overdue : 0}
          </small>
        </div>
        <div className="stat-row d-flex justify-content-between mb-1">
          <small className="text-muted">Due This Week:</small>
          <small className="fw-bold">{workload.dueThisWeek !== undefined ? workload.dueThisWeek : 0}</small>
        </div>
      </div>

      {workload.upcomingDeadlines && workload.upcomingDeadlines.length > 0 && (
        <div className="upcoming-deadlines">
          <small className="text-muted d-block mb-1">Upcoming Deadlines:</small>
          {workload.upcomingDeadlines.slice(0, 3).map((deadline, idx) => (
            <div key={idx} className="deadline-item text-truncate mb-1">
              <small className="text-muted">
                {new Date(deadline.dueDate).toLocaleDateString('en-GB', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </small>
              <small className="ms-1 text-truncate" title={deadline.title}>
                {deadline.title}
              </small>
            </div>
          ))}
        </div>
      )}

      {workload.capacity === 'overloaded' && (
        <Alert variant="danger" className="py-1 px-2 mb-0 mt-2" style={{ fontSize: '0.85rem' }}>
          <FaExclamationTriangle className="me-1" />
          This team member is overloaded. Consider distributing work.
        </Alert>
      )}
    </div>
  );
};

export default TeamMemberWorkloadInfo;
