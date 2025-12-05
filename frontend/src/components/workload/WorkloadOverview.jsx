import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Button, Form } from 'react-bootstrap';
import { FaSync, FaFilter, FaUsers } from 'react-icons/fa';
import WorkloadCard from './WorkloadCard';
import { getDepartmentWorkload } from '../../api/workloadApi';
import './WorkloadOverview.css';

const WorkloadOverview = ({ departmentId, autoRefresh = true, refreshInterval = 300000 }) => {
  const [workloads, setWorkloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filterCapacity, setFilterCapacity] = useState('all');
  const [sortBy, setSortBy] = useState('capacity'); // capacity, name, tasks

  // Fetch workload data
  const fetchWorkload = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDepartmentWorkload(departmentId);
      setWorkloads(data.employees || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching department workload:', err);
      setError(err.message || 'Failed to load workload data');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (departmentId) {
      fetchWorkload();
    }
  }, [departmentId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !departmentId) return;

    const interval = setInterval(() => {
      fetchWorkload();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, departmentId]);

  // Filter and sort workloads
  const getFilteredAndSortedWorkloads = () => {
    let filtered = [...workloads];

    // Apply capacity filter
    if (filterCapacity !== 'all') {
      filtered = filtered.filter(w => w.capacity === filterCapacity);
    }

    // Apply sorting
    switch (sortBy) {
      case 'capacity':
        // Already sorted by backend (overloaded → busy → available)
        const capacityOrder = { overloaded: 0, busy: 1, available: 2 };
        filtered.sort((a, b) => capacityOrder[a.capacity] - capacityOrder[b.capacity]);
        break;
      case 'name':
        filtered.sort((a, b) => a.employee.name.localeCompare(b.employee.name));
        break;
      case 'tasks':
        filtered.sort((a, b) => b.totalActive - a.totalActive);
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredWorkloads = getFilteredAndSortedWorkloads();

  // Calculate summary stats
  const summary = {
    total: workloads.length,
    available: workloads.filter(w => w.capacity === 'available').length,
    busy: workloads.filter(w => w.capacity === 'busy').length,
    overloaded: workloads.filter(w => w.capacity === 'overloaded').length,
    totalTasks: workloads.reduce((sum, w) => sum + w.totalActive, 0),
    totalOverdue: workloads.reduce((sum, w) => sum + w.overdue, 0)
  };

  return (
    <Card className="workload-overview-card">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <FaUsers className="text-primary" />
          <h5 className="mb-0">Team Workload Overview</h5>
        </div>
        <div className="d-flex align-items-center gap-2">
          {lastRefresh && (
            <small className="text-muted">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </small>
          )}
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={fetchWorkload}
            disabled={loading}
          >
            <FaSync className={loading ? 'fa-spin' : ''} /> Refresh
          </Button>
        </div>
      </Card.Header>

      <Card.Body>
        {/* Summary Stats */}
        <Row className="mb-4">
          <Col md={3}>
            <div className="stat-card stat-total">
              <div className="stat-value">{summary.total}</div>
              <div className="stat-label">Total Employees</div>
            </div>
          </Col>
          <Col md={3}>
            <div className="stat-card stat-available">
              <div className="stat-value">{summary.available}</div>
              <div className="stat-label">Available</div>
            </div>
          </Col>
          <Col md={3}>
            <div className="stat-card stat-busy">
              <div className="stat-value">{summary.busy}</div>
              <div className="stat-label">Busy</div>
            </div>
          </Col>
          <Col md={3}>
            <div className="stat-card stat-overloaded">
              <div className="stat-value">{summary.overloaded}</div>
              <div className="stat-label">Overloaded</div>
            </div>
          </Col>
        </Row>

        {/* Filters and Sorting */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">
                <FaFilter /> Filter by Capacity
              </Form.Label>
              <Form.Select 
                size="sm"
                value={filterCapacity}
                onChange={(e) => setFilterCapacity(e.target.value)}
              >
                <option value="all">All Employees</option>
                <option value="available">Available Only</option>
                <option value="busy">Busy Only</option>
                <option value="overloaded">Overloaded Only</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Sort By</Form.Label>
              <Form.Select 
                size="sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="capacity">Capacity Level</option>
                <option value="name">Name (A-Z)</option>
                <option value="tasks">Task Count (High to Low)</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* Loading State */}
        {loading && workloads.length === 0 && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Loading workload data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="danger">
            <strong>Error:</strong> {error}
            <Button 
              variant="link" 
              size="sm" 
              onClick={fetchWorkload}
              className="ms-2"
            >
              Try Again
            </Button>
          </Alert>
        )}

        {/* Empty State */}
        {!loading && !error && filteredWorkloads.length === 0 && (
          <Alert variant="info">
            <FaUsers className="me-2" />
            {filterCapacity === 'all' 
              ? 'No employees found in this department.'
              : `No ${filterCapacity} employees found.`}
          </Alert>
        )}

        {/* Workload Cards Grid */}
        {!loading && !error && filteredWorkloads.length > 0 && (
          <Row>
            {filteredWorkloads.map((workload) => (
              <Col key={workload.employee._id} md={6} lg={4} className="mb-3">
                <WorkloadCard
                  employee={workload.employee}
                  workload={{
                    totalActive: workload.totalActive,
                    dueThisWeek: workload.dueThisWeek,
                    overdue: workload.overdue,
                    capacity: workload.capacity,
                    tasks: workload.tasks
                  }}
                  showDetails={false}
                  onClick={() => {
                    // TODO: Show detailed task breakdown modal
                    console.log('Show details for:', workload.employee.name);
                  }}
                />
              </Col>
            ))}
          </Row>
        )}
      </Card.Body>
    </Card>
  );
};

export default WorkloadOverview;
