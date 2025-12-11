import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form, Modal, Table, Alert } from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import workCalendarApi from '../../api/workCalendarApi';
import departmentApi from '../../api/departmentApi';
import projectApi from '../../api/projectApi';
import clientApi from '../../api/clientApi';
import { userApi } from '../../api/userApi';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './AdminWorkOverview.css';

const localizer = momentLocalizer(moment);

/**
 * Admin Work Overview Component
 * Comprehensive view of all work across projects, employees, departments
 * with advanced filtering, analytics, and PDF export capabilities
 */
const AdminWorkOverview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workData, setWorkData] = useState(null);
  const [filterOptions, setFilterOptions] = useState({});
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [filters, setFilters] = useState({
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().endOf('month').format('YYYY-MM-DD'),
    department: 'all',
    project: 'all',
    client: 'all',
    employee: 'all',
    status: 'all',
    workType: 'all',
    priority: 'all',
    view: 'overview',
    groupBy: 'project',
    sortBy: 'startDate',
    sortOrder: 'asc'
  });



  // Check if user has admin privileges
  const hasAdminAccess = ['admin', 'superadmin', 'hr', 'manager'].includes(user?.role);

  useEffect(() => {
    if (hasAdminAccess) {
      loadFilterOptions();
      loadWorkOverview();
    }
  }, [hasAdminAccess]);

  useEffect(() => {
    if (hasAdminAccess) {
      loadWorkOverview();
    }
  }, [filters, hasAdminAccess]);

  const loadFilterOptions = async () => {
    try {
      const [departments, projects, clients, employees] = await Promise.all([
        departmentApi.getAllDepartments(),
        projectApi.getAllProjects(),
        clientApi.getAllClients(),
        userApi.getAllUsers()
      ]);

      setFilterOptions({
        departments: Array.isArray(departments) ? departments : departments.data || [],
        projects: Array.isArray(projects) ? projects : projects.data || [],
        clients: Array.isArray(clients) ? clients : clients.data || [],
        employees: (Array.isArray(employees) ? employees : employees.data || [])
          .filter(emp => ['employee', 'hod'].includes(emp.role))
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
      toast.error('Failed to load filter options');
    }
  };

  const loadWorkOverview = async () => {
    try {
      setLoading(true);
      const response = await workCalendarApi.getAdminWorkOverview(filters);
      setWorkData(response.data);
    } catch (error) {
      console.error('Error loading work overview:', error);
      toast.error('Failed to load work overview');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleDateRangeChange = (startDate, endDate) => {
    setFilters(prev => ({
      ...prev,
      startDate,
      endDate
    }));
  };



  const handleSyncWorkItems = async () => {
    try {
      setSyncing(true);
      
      const syncFilters = {};
      if (filters.department !== 'all') syncFilters.departmentId = filters.department;
      if (filters.project !== 'all') syncFilters.projectId = filters.project;
      if (filters.employee !== 'all') syncFilters.employeeId = filters.employee;

      const response = await workCalendarApi.syncWorkItemsToCalendar(syncFilters);
      
      toast.success(response.data.message);
      setShowSyncModal(false);
      loadWorkOverview(); // Refresh data
    } catch (error) {
      console.error('Error syncing work items:', error);
      toast.error('Failed to sync work items');
    } finally {
      setSyncing(false);
    }
  };

  const getCalendarEvents = () => {
    if (!workData?.workCalendar) return [];
    
    return workData.workCalendar.map(entry => ({
      id: entry._id,
      title: `${entry.title} (${entry.assignedTo?.name})`,
      start: new Date(entry.startDate),
      end: new Date(entry.endDate),
      allDay: entry.isAllDay,
      resource: entry,
    }));
  };

  const eventStyleGetter = (event) => {
    const resource = event.resource;
    let backgroundColor = '#3B82F6';
    
    // Color by status
    if (resource.status === 'completed') backgroundColor = '#10B981';
    else if (resource.status === 'in-progress') backgroundColor = '#3B82F6';
    else if (resource.status === 'overdue') backgroundColor = '#EF4444';
    else if (resource.status === 'cancelled') backgroundColor = '#6B7280';
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: resource.status === 'completed' ? 0.7 : 1,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const renderGroupedData = () => {
    if (!workData?.groupedData) return null;

    return Object.entries(workData.groupedData).map(([key, group]) => (
      <Card key={key} className="mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            {filters.groupBy === 'project' && group.project?.name || 'Unassigned Project'}
            {filters.groupBy === 'employee' && group.employee?.name || 'Unassigned Employee'}
            {filters.groupBy === 'department' && group.department?.name || 'Unassigned Department'}
            {filters.groupBy === 'client' && group.client?.name || 'Internal Work'}
            {filters.groupBy === 'date' && moment(group.date).format('MMMM DD, YYYY')}
          </h6>
          <div className="d-flex gap-2">
            <Badge bg="primary">{group.analytics.total} total</Badge>
            <Badge bg="success">{group.analytics.completed} completed</Badge>
            <Badge bg="danger">{group.analytics.overdue} overdue</Badge>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table size="sm" hover>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Start Date</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {group.workCalendar?.slice(0, 10).map(work => (
                  <tr key={work._id}>
                    <td>
                      <div>
                        <strong>{work.title}</strong>
                        <div className="small text-muted">{work.workType}</div>
                      </div>
                    </td>
                    <td>{work.assignedTo?.name}</td>
                    <td>
                      <Badge bg={
                        work.status === 'completed' ? 'success' : 
                        work.status === 'in-progress' ? 'primary' : 
                        work.status === 'overdue' ? 'danger' : 'secondary'
                      }>
                        {work.status}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={
                        work.priority === 'urgent' ? 'danger' : 
                        work.priority === 'high' ? 'warning' : 
                        work.priority === 'medium' ? 'info' : 'light'
                      }>
                        {work.priority}
                      </Badge>
                    </td>
                    <td>{moment(work.startDate).format('MMM DD, HH:mm')}</td>
                    <td>
                      {work.dueDate ? moment(work.dueDate).format('MMM DD, YYYY') : 'No due date'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {group.workCalendar?.length > 10 && (
              <div className="text-center text-muted small">
                ... and {group.workCalendar.length - 10} more entries
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    ));
  };

  if (!hasAdminAccess) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have permission to access the admin work overview. This feature is only available to administrators, HR, and managers.</p>
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container fluid className="admin-work-overview">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Work Overview Dashboard</h2>
              <p className="text-muted mb-0">
                Comprehensive view of all work across the organization
              </p>
            </div>
            
            <div className="d-flex gap-2">
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={() => setShowSyncModal(true)}
              >
                Sync Work Items
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                onClick={loadWorkOverview}
              >
                Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {/* First Row - Main Filters */}
              <Row className="g-3 mb-3">
                {/* Date Range */}
                <Col lg={4} md={6}>
                  <Form.Label className="small fw-bold">Date Range</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="date"
                      size="sm"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                    <Form.Control
                      type="date"
                      size="sm"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </Col>

                {/* Department Filter */}
                <Col lg={2} md={3} sm={6}>
                  <Form.Label className="small fw-bold">Department</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                  >
                    <option value="all">All Departments</option>
                    {filterOptions.departments?.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </Form.Select>
                </Col>

                {/* Project Filter */}
                <Col lg={3} md={3} sm={6}>
                  <Form.Label className="small fw-bold">Project</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filters.project}
                    onChange={(e) => handleFilterChange('project', e.target.value)}
                  >
                    <option value="all">All Projects</option>
                    {filterOptions.projects?.map(project => (
                      <option key={project._id} value={project._id}>{project.name}</option>
                    ))}
                  </Form.Select>
                </Col>

                {/* Employee Filter */}
                <Col lg={3} md={6}>
                  <Form.Label className="small fw-bold">Employee</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filters.employee}
                    onChange={(e) => handleFilterChange('employee', e.target.value)}
                  >
                    <option value="all">All Employees</option>
                    {filterOptions.employees?.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>

              {/* Second Row - Status and Options */}
              <Row className="g-3">
                {/* Status Filter */}
                <Col lg={2} md={3} sm={6}>
                  <Form.Label className="small fw-bold">Status</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </Form.Select>
                </Col>

                {/* Priority Filter */}
                <Col lg={2} md={3} sm={6}>
                  <Form.Label className="small fw-bold">Priority</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Form.Select>
                </Col>

                {/* Group By */}
                <Col lg={2} md={3} sm={6}>
                  <Form.Label className="small fw-bold">Group By</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filters.groupBy}
                    onChange={(e) => handleFilterChange('groupBy', e.target.value)}
                  >
                    <option value="project">Project</option>
                    <option value="employee">Employee</option>
                    <option value="department">Department</option>
                    <option value="client">Client</option>
                    <option value="date">Date</option>
                  </Form.Select>
                </Col>

                {/* Work Type Filter */}
                <Col lg={2} md={3} sm={6}>
                  <Form.Label className="small fw-bold">Work Type</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filters.workType}
                    onChange={(e) => handleFilterChange('workType', e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="task">Task</option>
                    <option value="meeting">Meeting</option>
                    <option value="project">Project Work</option>
                    <option value="review">Review</option>
                  </Form.Select>
                </Col>

                {/* Clear Filters Button */}
                <Col lg={4} md={12} className="d-flex align-items-end">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setFilters({
                      startDate: moment().startOf('month').format('YYYY-MM-DD'),
                      endDate: moment().endOf('month').format('YYYY-MM-DD'),
                      department: 'all',
                      project: 'all',
                      client: 'all',
                      employee: 'all',
                      status: 'all',
                      workType: 'all',
                      priority: 'all',
                      view: 'overview',
                      groupBy: 'project',
                      sortBy: 'startDate',
                      sortOrder: 'asc'
                    })}
                    className="w-100"
                  >
                    Clear All Filters
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Analytics Summary */}
      {workData?.analytics && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="border-0 shadow-sm text-center">
              <Card.Body>
                <h3 className="text-primary mb-1">{workData.analytics.overall.totalWork || 0}</h3>
                <p className="text-muted mb-0">Total Work Entries</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm text-center">
              <Card.Body>
                <h3 className="text-success mb-1">{workData.analytics.overall.completedWork || 0}</h3>
                <p className="text-muted mb-0">Completed Work</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm text-center">
              <Card.Body>
                <h3 className="text-info mb-1">{workData.analytics.overall.totalHours || 0}h</h3>
                <p className="text-muted mb-0">Total Hours</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm text-center">
              <Card.Body>
                <h3 className="text-danger mb-1">{workData.analytics.overall.overdueWork || 0}</h3>
                <p className="text-muted mb-0">Overdue Work</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content */}
      <Row>
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Work Calendar</h5>
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  variant={filters.view === 'calendar' ? 'primary' : 'outline-primary'}
                  onClick={() => handleFilterChange('view', 'calendar')}
                >
                  Calendar
                </Button>
                <Button
                  size="sm"
                  variant={filters.view === 'grouped' ? 'primary' : 'outline-primary'}
                  onClick={() => handleFilterChange('view', 'grouped')}
                >
                  Grouped
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {filters.view === 'calendar' && (
                <Calendar
                  localizer={localizer}
                  events={getCalendarEvents()}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 500 }}
                  eventPropGetter={eventStyleGetter}
                  views={['month', 'week', 'day']}
                  defaultView="month"
                  popup
                />
              )}

              {filters.view === 'grouped' && (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {renderGroupedData()}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Department Analytics */}
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header>
              <h6 className="mb-0">Department Breakdown</h6>
            </Card.Header>
            <Card.Body>
              {workData?.analytics?.byDepartment?.map(dept => (
                <div key={dept._id} className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <strong className="small">{dept.departmentName}</strong>
                    <div className="text-muted small">{dept.totalWork} total work</div>
                  </div>
                  <div className="text-end">
                    <Badge bg="success" className="me-1">{dept.completedWork}</Badge>
                    <Badge bg="danger">{dept.overdueWork}</Badge>
                  </div>
                </div>
              ))}
            </Card.Body>
          </Card>

          {/* Project Analytics */}
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header>
              <h6 className="mb-0">Top Projects</h6>
            </Card.Header>
            <Card.Body>
              {workData?.analytics?.byProject?.slice(0, 5).map(project => (
                <div key={project._id} className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <strong className="small">{project.projectName}</strong>
                    <div className="text-muted small">{project.totalWork} work entries</div>
                  </div>
                  <div className="text-end">
                    <Badge bg="success" className="me-1">{project.completedWork}</Badge>
                    <Badge bg="danger">{project.overdueWork}</Badge>
                  </div>
                </div>
              ))}
            </Card.Body>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm">
            <Card.Header>
              <h6 className="mb-0">Quick Actions</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button 
                  variant="outline-success" 
                  size="sm"
                  onClick={() => setShowSyncModal(true)}
                >
                  Sync Work Items
                </Button>
                <Button 
                  variant="outline-info" 
                  size="sm"
                  onClick={() => {
                    const today = moment().format('YYYY-MM-DD');
                    handleDateRangeChange(today, today);
                  }}
                >
                  View Today's Work
                </Button>
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={() => handleFilterChange('status', 'overdue')}
                >
                  Show Overdue Only
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => {
                    const thisWeek = moment().startOf('week');
                    const endWeek = moment().endOf('week');
                    handleDateRangeChange(thisWeek.format('YYYY-MM-DD'), endWeek.format('YYYY-MM-DD'));
                  }}
                >
                  This Week's Work
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>



      {/* Sync Modal */}
      <Modal show={showSyncModal} onHide={() => setShowSyncModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Sync Work Items</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>This will create work calendar entries for work items that don't have them yet.</p>
          <p className="text-muted small">
            Current filters will be applied to determine which work items to sync.
          </p>
          
          <Alert variant="info">
            <strong>Filters Applied:</strong>
            <ul className="mb-0 mt-2">
              {filters.department !== 'all' && <li>Department: {filterOptions.departments?.find(d => d._id === filters.department)?.name}</li>}
              {filters.project !== 'all' && <li>Project: {filterOptions.projects?.find(p => p._id === filters.project)?.name}</li>}
              {filters.employee !== 'all' && <li>Employee: {filterOptions.employees?.find(e => e._id === filters.employee)?.name}</li>}
              {filters.department === 'all' && filters.project === 'all' && filters.employee === 'all' && <li>All work items</li>}
            </ul>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSyncModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleSyncWorkItems}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Work Items'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminWorkOverview;