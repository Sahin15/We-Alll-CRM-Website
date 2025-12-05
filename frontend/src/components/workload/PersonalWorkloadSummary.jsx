import React, { useState, useEffect } from 'react';
import { Card, Badge, Collapse, Spinner, Alert } from 'react-bootstrap';
import { 
  FaTasks, FaChevronDown, FaChevronUp, FaExclamationCircle, 
  FaCalendarDay, FaCalendarWeek, FaCalendarAlt 
} from 'react-icons/fa';
import { getEmployeeWorkload } from '../../api/workloadApi';
import './PersonalWorkloadSummary.css';

const PersonalWorkloadSummary = ({ employeeId, autoRefresh = true }) => {
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({
    overdue: true,
    dueToday: false,
    dueThisWeek: false,
    dueLater: false
  });

  // Fetch workload data
  const fetchWorkload = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEmployeeWorkload(employeeId);
      setWorkload(data);
    } catch (err) {
      console.error('Error fetching personal workload:', err);
      setError(err.message || 'Failed to load workload data');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (employeeId) {
      fetchWorkload();
    }
  }, [employeeId]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!autoRefresh || !employeeId) return;

    const interval = setInterval(() => {
      fetchWorkload();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, employeeId]);

  // Toggle group expansion
  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Group tasks by due date
  const groupTasksByDueDate = (tasks) => {
    if (!tasks || tasks.length === 0) return {};

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));

    const groups = {
      overdue: [],
      dueToday: [],
      dueThisWeek: [],
      dueLater: []
    };

    tasks.forEach(task => {
      if (!task.dueDate) {
        groups.dueLater.push(task);
        return;
      }

      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Check if overdue
      const completedStatuses = ['done', 'Completed', 'Approved'];
      if (dueDate < now && !completedStatuses.includes(task.status)) {
        groups.overdue.push(task);
      }
      // Check if due today
      else if (dueDate.getTime() === today.getTime()) {
        groups.dueToday.push(task);
      }
      // Check if due this week
      else if (dueDate > today && dueDate <= endOfWeek) {
        groups.dueThisWeek.push(task);
      }
      // Due later
      else {
        groups.dueLater.push(task);
      }
    });

    return groups;
  };

  const taskGroups = workload?.tasks ? groupTasksByDueDate(workload.tasks) : {};

  // Get status badge variant
  const getStatusVariant = (status) => {
    const statusMap = {
      'Pending': 'secondary',
      'In Progress': 'primary',
      'Review': 'info',
      'Revision': 'warning',
      'Approved': 'success',
      'Completed': 'success',
      'todo': 'secondary',
      'in-progress': 'primary',
      'review': 'info',
      'done': 'success'
    };
    return statusMap[status] || 'secondary';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="personal-workload-card">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading your workload...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="personal-workload-card">
        <Card.Body>
          <Alert variant="danger">
            <strong>Error:</strong> {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="personal-workload-card">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <FaTasks className="text-primary" />
          <h5 className="mb-0">My Workload</h5>
        </div>
        <Badge 
          bg={workload?.capacity === 'available' ? 'success' : workload?.capacity === 'busy' ? 'warning' : 'danger'}
          className="capacity-badge"
        >
          {workload?.capacity?.toUpperCase() || 'UNKNOWN'}
        </Badge>
      </Card.Header>

      <Card.Body>
        {/* Summary Stats */}
        <div className="workload-summary-stats mb-4">
          <div className="summary-stat">
            <div className="stat-value">{workload?.totalActive || 0}</div>
            <div className="stat-label">Active Tasks</div>
          </div>
          <div className="summary-stat">
            <div className="stat-value text-warning">{workload?.dueThisWeek || 0}</div>
            <div className="stat-label">Due This Week</div>
          </div>
          <div className="summary-stat">
            <div className={`stat-value ${workload?.overdue > 0 ? 'text-danger' : ''}`}>
              {workload?.overdue || 0}
            </div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>

        {/* Task Groups */}
        {workload?.tasks && workload.tasks.length > 0 ? (
          <div className="task-groups">
            {/* Overdue Tasks */}
            {taskGroups.overdue && taskGroups.overdue.length > 0 && (
              <div className="task-group overdue-group">
                <div 
                  className="task-group-header"
                  onClick={() => toggleGroup('overdue')}
                >
                  <div className="d-flex align-items-center gap-2">
                    <FaExclamationCircle className="text-danger" />
                    <span className="group-title">Overdue</span>
                    <Badge bg="danger" pill>{taskGroups.overdue.length}</Badge>
                  </div>
                  {expandedGroups.overdue ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                <Collapse in={expandedGroups.overdue}>
                  <div className="task-list">
                    {taskGroups.overdue.map(task => (
                      <div key={task._id} className="task-item">
                        <div className="task-info">
                          <div className="task-title">{task.title}</div>
                          <div className="task-meta">
                            <small className="text-danger">Due: {formatDate(task.dueDate)}</small>
                          </div>
                        </div>
                        <Badge bg={getStatusVariant(task.status)}>{task.status}</Badge>
                      </div>
                    ))}
                  </div>
                </Collapse>
              </div>
            )}

            {/* Due Today */}
            {taskGroups.dueToday && taskGroups.dueToday.length > 0 && (
              <div className="task-group today-group">
                <div 
                  className="task-group-header"
                  onClick={() => toggleGroup('dueToday')}
                >
                  <div className="d-flex align-items-center gap-2">
                    <FaCalendarDay className="text-warning" />
                    <span className="group-title">Due Today</span>
                    <Badge bg="warning" pill>{taskGroups.dueToday.length}</Badge>
                  </div>
                  {expandedGroups.dueToday ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                <Collapse in={expandedGroups.dueToday}>
                  <div className="task-list">
                    {taskGroups.dueToday.map(task => (
                      <div key={task._id} className="task-item">
                        <div className="task-info">
                          <div className="task-title">{task.title}</div>
                          <div className="task-meta">
                            <small className="text-muted">Due: Today</small>
                          </div>
                        </div>
                        <Badge bg={getStatusVariant(task.status)}>{task.status}</Badge>
                      </div>
                    ))}
                  </div>
                </Collapse>
              </div>
            )}

            {/* Due This Week */}
            {taskGroups.dueThisWeek && taskGroups.dueThisWeek.length > 0 && (
              <div className="task-group week-group">
                <div 
                  className="task-group-header"
                  onClick={() => toggleGroup('dueThisWeek')}
                >
                  <div className="d-flex align-items-center gap-2">
                    <FaCalendarWeek className="text-info" />
                    <span className="group-title">Due This Week</span>
                    <Badge bg="info" pill>{taskGroups.dueThisWeek.length}</Badge>
                  </div>
                  {expandedGroups.dueThisWeek ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                <Collapse in={expandedGroups.dueThisWeek}>
                  <div className="task-list">
                    {taskGroups.dueThisWeek.map(task => (
                      <div key={task._id} className="task-item">
                        <div className="task-info">
                          <div className="task-title">{task.title}</div>
                          <div className="task-meta">
                            <small className="text-muted">Due: {formatDate(task.dueDate)}</small>
                          </div>
                        </div>
                        <Badge bg={getStatusVariant(task.status)}>{task.status}</Badge>
                      </div>
                    ))}
                  </div>
                </Collapse>
              </div>
            )}

            {/* Due Later */}
            {taskGroups.dueLater && taskGroups.dueLater.length > 0 && (
              <div className="task-group later-group">
                <div 
                  className="task-group-header"
                  onClick={() => toggleGroup('dueLater')}
                >
                  <div className="d-flex align-items-center gap-2">
                    <FaCalendarAlt className="text-secondary" />
                    <span className="group-title">Due Later</span>
                    <Badge bg="secondary" pill>{taskGroups.dueLater.length}</Badge>
                  </div>
                  {expandedGroups.dueLater ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                <Collapse in={expandedGroups.dueLater}>
                  <div className="task-list">
                    {taskGroups.dueLater.map(task => (
                      <div key={task._id} className="task-item">
                        <div className="task-info">
                          <div className="task-title">{task.title}</div>
                          <div className="task-meta">
                            <small className="text-muted">Due: {formatDate(task.dueDate)}</small>
                          </div>
                        </div>
                        <Badge bg={getStatusVariant(task.status)}>{task.status}</Badge>
                      </div>
                    ))}
                  </div>
                </Collapse>
              </div>
            )}
          </div>
        ) : (
          <Alert variant="info" className="mb-0">
            <FaTasks className="me-2" />
            You have no active tasks at the moment. Great job!
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default PersonalWorkloadSummary;
