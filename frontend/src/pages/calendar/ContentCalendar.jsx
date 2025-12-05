import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Modal, Dropdown, Alert } from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { FaCalendarAlt, FaFilter, FaPlus, FaDownload, FaPrint, FaUsers } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import * as slotApi from '../../api/slotApi';
import taskApi from '../../api/taskApi';
import { projectApi } from '../../api/projectApi';
import { userApi } from '../../api/userApi';
import departmentApi from '../../api/departmentApi';
import CreateWorkAssignmentForm from '../../components/projects/CreateWorkAssignmentForm';
import WorkItemDetails from '../../components/work/WorkItemDetails';
import toast from '../../utils/toast';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../../styles/calendar.css';

const localizer = momentLocalizer(moment);

const ContentCalendar = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filters, setFilters] = useState({
    department: '',
    project: '',
    employee: '',
    status: '',
    platform: '',
    startDate: '',
    endDate: ''
  });
  
  // Modal states
  const [showProjectSelectModal, setShowProjectSelectModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Status colors for calendar events
  const statusColors = {
    'Planned': '#6B7280',
    'In Design': '#3B82F6',
    'Ready for Review': '#8B5CF6',
    'Needs Revision': '#F59E0B',
    'Approved': '#10B981',
    'Posted': '#059669'
  };

  // Platform colors
  const platformColors = {
    'Facebook': '#1877F2',
    'Instagram': '#E4405F',
    'LinkedIn': '#0A66C2',
    'Twitter': '#1DA1F2',
    'YouTube': '#FF0000',
    'TikTok': '#000000'
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter projects by department
  const filteredProjects = useMemo(() => {
    if (!filters.department) {
      return projects; // Show all if no department selected
    }
    
    return projects.filter(project => {
      const projectDeptId = project.department?._id || project.department;
      return projectDeptId === filters.department;
    });
  }, [projects, filters.department]);

  // Filter employees by department (for HoD, show only department employees)
  const filteredEmployees = useMemo(() => {
    // If HoD, only show employees from their department
    if (user?.role === 'hod' && user?.headOfDepartment) {
      const hodDeptId = user.headOfDepartment._id || user.headOfDepartment;
      return employees.filter(emp => {
        const empDeptId = emp.department?._id || emp.department;
        return empDeptId === hodDeptId;
      });
    }
    
    // For other roles, show all employees
    return employees;
  }, [employees, user]);

  useEffect(() => {
    if (projects.length > 0) {
      loadSlots();
    }
  }, [filters, projects]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load projects, employees, departments in parallel
      const [projectsRes, employeesRes, departmentsRes] = await Promise.all([
        projectApi.getAllProjects(),
        userApi.getAllUsers(),
        departmentApi.getAllDepartments().catch(err => {
          console.error('Error loading departments:', err);
          return []; // Fail gracefully
        })
      ]);
      
      // Handle different response formats
      const projectsArray = Array.isArray(projectsRes) ? projectsRes : (projectsRes.data || []);
      const employeesArray = Array.isArray(employeesRes) ? employeesRes : (employeesRes.data || []);
      const departmentsArray = Array.isArray(departmentsRes) ? departmentsRes : (departmentsRes.data || []);
      
      setProjects(projectsArray);
      setEmployees(employeesArray.filter(u => 
        ['employee', 'admin', 'superadmin', 'hod'].includes(u.role)
      ));
      setDepartments(departmentsArray);
      
      // Auto-select department for HoD users
      if (user?.role === 'hod' && user?.headOfDepartment) {
        setFilters(prev => ({
          ...prev,
          department: user.headOfDepartment._id || user.headOfDepartment
        }));
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async () => {
    try {
      // Load both slots and tasks in parallel
      const [slotsResponse, tasksResponse] = await Promise.all([
        slotApi.getAllSlots(filters),
        taskApi.getMyTasks()
      ]);
      
      // Handle different response formats for slots
      let slotsData = [];
      if (Array.isArray(slotsResponse)) {
        slotsData = slotsResponse;
      } else if (slotsResponse?.data) {
        // Check if data is an array or object
        if (Array.isArray(slotsResponse.data)) {
          slotsData = slotsResponse.data;
        } else if (typeof slotsResponse.data === 'object' && slotsResponse.data !== null) {
          // If data is an object (like {success: true, count: X, data: [...]}), extract the nested data
          slotsData = slotsResponse.data.data || [];
        }
      }
      
      // Apply department filter on client-side if department is selected but not project
      if (filters.department && !filters.project) {
        const filteredProjectIds = new Set(filteredProjects.map(p => p._id));
        slotsData = slotsData.filter(slot => {
          const slotProjectId = slot.project?._id || slot.project;
          return filteredProjectIds.has(slotProjectId);
        });
      }
      
      // Handle different response formats for tasks
      let tasksData = [];
      if (Array.isArray(tasksResponse)) {
        tasksData = tasksResponse;
      } else if (tasksResponse?.data && Array.isArray(tasksResponse.data)) {
        tasksData = tasksResponse.data;
      }
      
      setSlots(slotsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast.error('Failed to load calendar data');
    }
  };

  // Convert slots and tasks to calendar events
  const calendarEvents = [
    // Slot events (Content Tasks)
    ...slots.flatMap(slot => {
      const events = [];
      
      // Start Date Event (when work begins)
      if (slot.designDeadline) {
        events.push({
          id: `slot-${slot._id}-start`,
          title: `🎨 Start: ${slot.brief?.substring(0, 25)}...`,
          start: new Date(slot.designDeadline),
          end: new Date(slot.designDeadline),
          resource: { ...slot, itemType: 'slot', eventType: 'start' },
          style: {
            backgroundColor: '#10B981', // Green for content
            borderColor: '#059669',
            color: 'white',
            borderLeft: '4px solid #059669'
          }
        });
      }
      
      // Due Date Event (deadline)
      if (slot.postingDate) {
        const isOverdue = new Date(slot.postingDate) < new Date() && slot.designStatus !== 'Approved';
        events.push({
          id: `slot-${slot._id}-due`,
          title: `🎨 Due: ${slot.brief?.substring(0, 25)}...`,
          start: new Date(slot.postingDate),
          end: new Date(slot.postingDate),
          resource: { ...slot, itemType: 'slot', eventType: 'due' },
          style: {
            backgroundColor: isOverdue ? '#EF4444' : '#10B981',
            borderColor: isOverdue ? '#DC2626' : '#059669',
            color: 'white',
            borderLeft: '4px solid ' + (isOverdue ? '#DC2626' : '#059669')
          }
        });
      }
      
      return events;
    }),
    
    // Task events (General Tasks)
    ...tasks.map(task => {
      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
      return {
        id: `task-${task._id}`,
        title: `📋 ${task.title?.substring(0, 30)}...`,
        start: new Date(task.dueDate || task.createdAt),
        end: new Date(task.dueDate || task.createdAt),
        resource: { ...task, itemType: 'task' },
        style: {
          backgroundColor: isOverdue ? '#EF4444' : '#3B82F6', // Blue for tasks
          borderColor: isOverdue ? '#DC2626' : '#1E40AF',
          color: 'white',
          borderLeft: '4px solid ' + (isOverdue ? '#DC2626' : '#1E40AF')
        }
      };
    })
  ];

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Check if user can change department filter
  const canChangeDepartment = useMemo(() => {
    // Only HR, Manager, Admin, Superadmin can change departments
    // HoD is locked to their department
    return ['hr', 'manager', 'admin', 'superadmin'].includes(user?.role);
  }, [user]);

  const clearFilters = () => {
    // For HoD, keep their department filter locked
    const baseDepartment = (user?.role === 'hod' && user?.headOfDepartment) 
      ? (user.headOfDepartment._id || user.headOfDepartment)
      : '';
    
    setFilters({
      department: baseDepartment,
      project: '',
      employee: '',
      status: '',
      platform: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleEventClick = (event) => {
    const resource = event.resource;
    setSelectedItem(resource);
    setSelectedItemType(resource.itemType);
    setShowDetailsModal(true);
  };

  const handleOpenCreateSlot = () => {
    // If user has filtered by project, use that project
    if (filters.project) {
      const project = projects.find(p => p._id === filters.project);
      if (project) {
        setSelectedProject(project);
        setShowCreateModal(true);
        return;
      }
    }
    // Otherwise, show project selection modal
    setShowProjectSelectModal(true);
  };

  const handleProjectSelect = (projectId) => {
    const project = projects.find(p => p._id === projectId);
    if (project) {
      setSelectedProject(project);
      setShowProjectSelectModal(false);
      setShowCreateModal(true);
    }
  };

  const handleCreateSlot = async (slotData) => {
    try {
      // Add project and client to slot data
      const payload = {
        ...slotData,
        project: selectedProject._id,
        client: selectedProject.client._id || selectedProject.client
      };
      
      await slotApi.createSlot(payload);
      toast.success('Slot created successfully!');
      loadSlots();
      setShowCreateModal(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Error creating slot:', error);
      toast.error(error.message || 'Failed to create slot');
    }
  };

  const handleUpdateItem = async (itemId, newStatus, type) => {
    try {
      if (type === 'slot') {
        // Use the specific status update endpoint
        await slotApi.updateSlotStatus(itemId, newStatus);
      } else {
        await taskApi.updateTaskStatus(itemId, newStatus);
      }
      
      toast.success('Status updated successfully!');
      
      // Reload data to refresh calendar
      loadSlots();
      
      // Update the selected item
      if (selectedItem && selectedItem._id === itemId) {
        const updatedItem = { ...selectedItem };
        if (type === 'slot') {
          updatedItem.designStatus = newStatus;
        } else {
          updatedItem.status = newStatus;
        }
        setSelectedItem(updatedItem);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to update status');
      throw error;
    }
  };

  const exportToPDF = () => {
    // Basic PDF export - can be enhanced with libraries like jsPDF
    window.print();
  };

  const exportToExcel = () => {
    // Basic CSV export
    const csvContent = [
      ['Date', 'Project', 'Brief', 'Status', 'Assigned To', 'Platforms'],
      ...slots.map(slot => [
        moment(slot.postingDate).format('YYYY-MM-DD'),
        slot.project?.name || '',
        slot.brief || '',
        slot.designStatus || '',
        slot.assignedTo?.name || '',
        slot.platforms?.join(', ') || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-calendar-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center calendar-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h2 className="mb-1">
                <FaCalendarAlt className="me-2 text-primary" />
                Project Calendar
              </h2>
              <p className="text-muted mb-0">Manage all tasks and deadlines across projects</p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FaFilter className="me-1" /> Filters
              </Button>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  <FaDownload className="me-1" /> Export
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={exportToPDF}>
                    <FaPrint className="me-2" /> Print/PDF
                  </Dropdown.Item>
                  <Dropdown.Item onClick={exportToExcel}>
                    <FaDownload className="me-2" /> Export CSV
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Button 
                variant="primary" 
                size="sm"
                onClick={handleOpenCreateSlot}
              >
                <FaPlus className="me-1" /> Create Task
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* HoD Department Members Section */}
      {user?.role === 'hod' && filteredEmployees.length > 0 && (
        <Card className="mb-3 border-primary">
          <Card.Header className="bg-primary bg-opacity-10">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <FaUsers className="me-2" />
                My Department Team ({filteredEmployees.length} members)
              </h6>
            </div>
          </Card.Header>
          <Card.Body className="py-2">
            <div className="d-flex flex-wrap gap-2">
              {filteredEmployees.map(employee => (
                <Badge 
                  key={employee._id} 
                  bg="light" 
                  text="dark" 
                  className="px-3 py-2"
                  style={{ fontSize: '0.85rem' }}
                >
                  {employee.name}
                  {employee.designation && (
                    <small className="text-muted ms-1">• {employee.designation}</small>
                  )}
                </Badge>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Card.Body style={{ padding: '0.75rem' }}>
            {/* First Row - Main Filters */}
            <Row className="g-2 mb-2" style={{ rowGap: '0.5rem' }}>
              {/* Department Filter - Only for HR/Manager/Admin/Superadmin */}
              {canChangeDepartment && (
                <Col xl={2} lg={2} md={3} sm={6} xs={12}>
                  <Form.Group className="mb-0">
                    <Form.Label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>Department</Form.Label>
                    <Form.Select
                      value={filters.department}
                      onChange={(e) => handleFilterChange('department', e.target.value)}
                      size="sm"
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
              
              {/* Department Display - For HoD (read-only) */}
              {!canChangeDepartment && user?.role === 'hod' && (
                <Col xl={2} lg={2} md={3} sm={6} xs={12}>
                  <Form.Group className="mb-0">
                    <Form.Label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>Department</Form.Label>
                    <Form.Control
                      type="text"
                      value={departments.find(d => d._id === filters.department)?.name || 'Your Department'}
                      disabled
                      readOnly
                      size="sm"
                    />
                    <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>
                      Locked to your dept
                    </Form.Text>
                  </Form.Group>
                </Col>
              )}
              
              <Col xl={2} lg={2} md={3} sm={6} xs={12}>
                <Form.Group className="mb-0">
                  <Form.Label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>Project</Form.Label>
                  <Form.Select
                    value={filters.project}
                    onChange={(e) => handleFilterChange('project', e.target.value)}
                    size="sm"
                  >
                    <option value="">All Projects</option>
                    {/* Show only department projects for HoD */}
                    {(user?.role === 'hod' ? filteredProjects : (filters.department ? filteredProjects : projects)).map(project => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col xl={2} lg={2} md={3} sm={6} xs={12}>
                <Form.Group className="mb-0">
                  <Form.Label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>Employee</Form.Label>
                  <Form.Select
                    value={filters.employee}
                    onChange={(e) => handleFilterChange('employee', e.target.value)}
                    size="sm"
                  >
                    <option value="">All Employees</option>
                    {/* Show only department employees for HoD */}
                    {filteredEmployees.map(employee => (
                      <option key={employee._id} value={employee._id}>
                        {employee.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col xl={2} lg={2} md={3} sm={6} xs={12}>
                <Form.Group className="mb-0">
                  <Form.Label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>Status</Form.Label>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    size="sm"
                  >
                    <option value="">All Statuses</option>
                    {Object.keys(statusColors).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col xl={2} lg={2} md={3} sm={6} xs={12}>
                <Form.Group className="mb-0">
                  <Form.Label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    size="sm"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            {/* Clear Filters Button */}
            <Row>
              <Col>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={clearFilters}
                >
                  Clear Filters
                  {Object.values(filters).filter(v => v !== '').length > 0 && 
                    ` (${Object.values(filters).filter(v => v !== '').length})`
                  }
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Legend */}
      <Card className="mb-4">
        <Card.Body className="py-3">
          <Row>
            <Col md={4}>
              <div className="calendar-legend">
                <small className="text-muted me-2">Event Types:</small>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#3B82F6' }}></div>
                  <small>▶️ Start Date</small>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#10B981' }}></div>
                  <small>⏰ Due Date</small>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#EF4444' }}></div>
                  <small>🚨 Overdue</small>
                </div>
              </div>
            </Col>
            <Col md={4}>
              <div className="calendar-legend">
                <small className="text-muted me-2">Status Colors:</small>
                {Object.entries(statusColors).slice(0, 3).map(([status, color]) => (
                  <div key={status} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: color }}></div>
                    <small>{status}</small>
                  </div>
                ))}
              </div>
            </Col>
            <Col md={4}>
              <div className="calendar-legend">
                <small className="text-muted me-2">Platform Borders:</small>
                {Object.entries(platformColors).slice(0, 3).map(([platform, color]) => (
                  <div key={platform} className="legend-item">
                    <div className="legend-color" style={{ borderColor: color, borderWidth: '3px' }}></div>
                    <small>{platform}</small>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Calendar */}
      <Card>
        <Card.Body style={{ height: '600px', position: 'relative' }}>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            onSelectEvent={handleEventClick}
            eventPropGetter={(event) => ({
              style: event.style
            })}
            views={['month', 'week', 'day']}
            defaultView="month"
            popup
            popupOffset={{ x: 0, y: 5 }}
            showMultiDayTimes
            step={60}
            timeslots={1}
            tooltipAccessor={(event) => {
              const item = event.resource;
              const type = item.eventType === 'start' ? 'Start' : 'Due';
              const title = item.title || item.brief || 'Work Item';
              const status = item.status || item.designStatus || 'Pending';
              return `${type}: ${title} - ${status}`;
            }}
            messages={{
              showMore: (count) => `+${count} more`
            }}
          />
          {calendarEvents.length === 0 && (
            <div className="calendar-empty-overlay">
              <div className="calendar-empty">
                <div className="calendar-empty-icon">
                  <FaCalendarAlt />
                </div>
                <div className="calendar-empty-text">No tasks found</div>
                <div className="calendar-empty-subtext">
                  {filters.department ? (
                    <>
                      No tasks found for{' '}
                      <strong>
                        {departments.find(d => d._id === filters.department)?.name || 'selected department'}
                      </strong>
                      <br />
                      Try adjusting your filters or create a new task
                    </>
                  ) : (
                    'Create a new task or adjust your filters'
                  )}
                </div>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Project Selection Modal */}
      <Modal 
        show={showProjectSelectModal} 
        onHide={() => setShowProjectSelectModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Select Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">Choose a project to create a slot for:</p>
          <div className="d-grid gap-2">
            {/* Show filtered projects if department filter is active */}
            {(filters.department ? filteredProjects : projects).length === 0 ? (
              <Alert variant="warning">
                {filters.department 
                  ? `No projects available in ${departments.find(d => d._id === filters.department)?.name || 'selected department'}. Please select a different department or create a project.`
                  : 'No projects available. Please create a project first.'
                }
              </Alert>
            ) : (
              (filters.department ? filteredProjects : projects).map((project) => (
                <Button
                  key={project._id}
                  variant="outline-primary"
                  onClick={() => handleProjectSelect(project._id)}
                  className="text-start"
                >
                  <div>
                    <strong>{project.name}</strong>
                    <br />
                    <small className="text-muted">
                      {project.client?.name || 'No client'} • {project.department?.name || 'No department'}
                    </small>
                  </div>
                </Button>
              ))
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProjectSelectModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create Work Assignment Modal */}
      <CreateWorkAssignmentForm
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setSelectedProject(null);
        }}
        onSubmit={handleCreateSlot}
        project={selectedProject}
        employees={filteredEmployees}
        currentUser={user}
      />

      {/* Work Item Details Modal */}
      {selectedItem && (
        <WorkItemDetails
          show={showDetailsModal}
          onHide={() => {
            setShowDetailsModal(false);
            setSelectedItem(null);
            setSelectedItemType(null);
          }}
          item={selectedItem}
          type={selectedItemType}
          onUpdate={handleUpdateItem}
          currentUser={user}
        />
      )}
    </Container>
  );
};

export default ContentCalendar;
