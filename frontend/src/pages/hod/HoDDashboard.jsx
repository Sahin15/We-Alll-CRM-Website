import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form } from 'react-bootstrap';
import { FaUsers, FaProjectDiagram, FaCheckCircle, FaClock, FaUserTie, FaPlus, FaCalendarAlt } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../api/departmentApi';
import { projectApi } from '../../api/projectApi';
import toast from '../../utils/toast';

const HoDDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [department, setDepartment] = useState(null);
  
  // Attendance tracking (HoD is also an employee)
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);
  
  // Modal states
  const [showAssignHoPModal, setShowAssignHoPModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadTodayAttendance();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadTodayAttendance = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attendance/today`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data);
        setClockedIn(data && data.clockIn && !data.clockOut);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const handleClockIn = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attendance/clock-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Clocked in successfully!');
        loadTodayAttendance();
      } else {
        toast.error(data.message || 'Failed to clock in');
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      toast.error('Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attendance/clock-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Clocked out successfully!');
        loadTodayAttendance();
      } else {
        toast.error(data.message || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      toast.error('Failed to clock out');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!user) {
        console.error('User not authenticated');
        setLoading(false);
        return;
      }

      // Get user's department
      if (!user.headOfDepartment) {
        toast.error('You are not assigned as Head of any Department');
        setLoading(false);
        return;
      }

      const departmentId = user.headOfDepartment;

      // Load all data in parallel
      const [statsRes, projectsRes, membersRes, deptRes, attendanceRes, leavesRes] = await Promise.all([
        departmentApi.getDepartmentStats(departmentId),
        departmentApi.getDepartmentProjects(departmentId),
        departmentApi.getDepartmentMembers(departmentId),
        departmentApi.getDepartmentById(departmentId),
        // Fetch today's attendance for the department
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attendance?date=${new Date().toISOString().split('T')[0]}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json()).catch(() => []),
        // Fetch leave data for department overview (view-only)
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leaves/my-leaves`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json()).catch(() => ({ data: [] }))
      ]);

      // Filter attendance for department members only
      const departmentMemberIds = (membersRes.data.members || []).map(m => m._id);
      const departmentAttendance = Array.isArray(attendanceRes) 
        ? attendanceRes.filter(att => departmentMemberIds.includes(att.employee?._id))
        : [];

      // Calculate attendance stats
      const attendanceStats = {
        present: departmentAttendance.filter(a => a.status === 'present').length,
        absent: departmentAttendance.filter(a => a.status === 'absent').length,
        late: departmentAttendance.filter(a => a.status === 'late').length,
        total: departmentAttendance.length
      };

      // Calculate leave stats for department members (view-only)
      const allLeaves = leavesRes.data || [];
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Filter leaves for current month
      const thisMonthLeaves = allLeaves.filter(leave => {
        const leaveDate = new Date(leave.createdAt);
        return leaveDate >= firstDayOfMonth;
      });

      // Calculate leave statistics
      const leaveStats = {
        pending: thisMonthLeaves.filter(l => l.status === 'pending').length,
        approved: thisMonthLeaves.filter(l => l.status === 'approved').length,
        rejected: thisMonthLeaves.filter(l => l.status === 'rejected').length,
        total: thisMonthLeaves.length,
        onLeaveToday: 0,
        todayLeaveDetails: []
      };

      // Check who's on leave today
      const todayStr = today.toISOString().split('T')[0];
      const approvedLeaves = allLeaves.filter(l => l.status === 'approved');
      
      approvedLeaves.forEach(leave => {
        const startDate = new Date(leave.startDate).toISOString().split('T')[0];
        const endDate = new Date(leave.endDate).toISOString().split('T')[0];
        
        if (todayStr >= startDate && todayStr <= endDate) {
          leaveStats.onLeaveToday++;
          leaveStats.todayLeaveDetails.push(leave);
        }
      });

      // Debug logging
      // console.log('Department Attendance Data:', {
      //   departmentMemberIds: departmentMemberIds.length,
      //   attendanceRes: Array.isArray(attendanceRes) ? attendanceRes.length : 'not array',
      //   departmentAttendance: departmentAttendance.length,
      //   attendanceStats
      // });

      setStats({
        ...statsRes.data,
        attendance: attendanceStats,
        attendanceDetails: departmentAttendance,
        attendanceFilter: '', // Initialize with no filter
        leaveStats: leaveStats,
        todayLeaveDetails: leaveStats.todayLeaveDetails
      });
      setProjects(projectsRes.data.projects || []);
      setMembers(membersRes.data.members || []);
      setDepartment(deptRes);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignHoP = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    try {
      await projectApi.assignHoP(selectedProject._id, selectedUserId);
      toast.success('Head of Project assigned successfully!');
      
      // Update only the projects list instead of reloading entire dashboard
      const updatedProjects = projects.map(p => 
        p._id === selectedProject._id 
          ? { ...p, headOfProject: selectedUserId }
          : p
      );
      setProjects(updatedProjects);
      
      setShowAssignHoPModal(false);
      setSelectedProject(null);
      setSelectedUserId('');
    } catch (error) {
      console.error('Error assigning HoP:', error);
      toast.error(error.response?.data?.message || 'Failed to assign Head of Project');
    }
  };

  const openAssignHoPModal = (project) => {
    setSelectedProject(project);
    setShowAssignHoPModal(true);
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container fluid className="py-4">
        <Card>
          <Card.Body className="text-center py-5">
            <h4>Authentication Required</h4>
            <p className="text-muted">Please log in to access the dashboard.</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (!department) {
    return (
      <Container fluid className="py-4">
        <Card>
          <Card.Body className="text-center py-5">
            <h4>No Department Assigned</h4>
            <p className="text-muted">You are not assigned as Head of any Department.</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-1">
            <FaUserTie className="me-2 text-primary" />
            {department?.name || 'Department'} Department
          </h2>
          <p className="text-muted mb-0">Head of Department Dashboard</p>
        </Col>
      </Row>

      {/* Attendance Card - HoD is also an employee */}
      <Row className="mb-4">
        <Col>
          <Card className="border-primary">
            <Card.Body>
              <Row className="align-items-center">
                <Col md={8}>
                  <h5 className="mb-2">
                    <FaClock className="me-2 text-primary" />
                    Today's Attendance
                  </h5>
                  {todayAttendance && todayAttendance.status === 'on-leave' ? (
                    <div>
                      <p className="mb-1">
                        <strong>Status:</strong> <Badge bg="secondary">On Leave</Badge>
                      </p>
                      {todayAttendance.notes && (
                        <p className="mb-1 text-muted small">{todayAttendance.notes}</p>
                      )}
                    </div>
                  ) : todayAttendance && todayAttendance.clockIn ? (
                    <div>
                      <p className="mb-1">
                        <strong>Clock In:</strong> {new Date(todayAttendance.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {todayAttendance.clockOut && (
                        <p className="mb-1">
                          <strong>Clock Out:</strong> {new Date(todayAttendance.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      <Badge bg={
                        todayAttendance.status === 'present' ? 'success' :
                        todayAttendance.status === 'late' ? 'warning' :
                        todayAttendance.status === 'half-day' ? 'info' : 'secondary'
                      }>
                        {todayAttendance.status}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-muted mb-0">You haven't clocked in today</p>
                  )}
                </Col>
                <Col md={4} className="text-end">
                  {!clockedIn ? (
                    <Button variant="success" size="lg" onClick={handleClockIn}>
                      <FaClock className="me-2" />
                      Clock In
                    </Button>
                  ) : (
                    <Button variant="danger" size="lg" onClick={handleClockOut}>
                      <FaClock className="me-2" />
                      Clock Out
                    </Button>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <FaUsers className="text-primary mb-2" size={32} />
              <h3 className="mb-1">{stats?.totalMembers || 0}</h3>
              <p className="text-muted mb-0">Team Members</p>
              <small className="text-success">{stats?.activeMembers || 0} Active</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <FaProjectDiagram className="text-info mb-2" size={32} />
              <h3 className="mb-1">{stats?.totalProjects || 0}</h3>
              <p className="text-muted mb-0">Total Projects</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <FaClock className="text-warning mb-2" size={32} />
              <h3 className="mb-1">{stats?.activeProjects || 0}</h3>
              <p className="text-muted mb-0">Active Projects</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <FaCheckCircle className="text-success mb-2" size={32} />
              <h3 className="mb-1">{stats?.completedProjects || 0}</h3>
              <p className="text-muted mb-0">Completed</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Department Leave Overview - View Only */}
      <Row className="mb-4">
        <Col>
          <Card className="border-info">
            <Card.Header className="bg-info bg-opacity-10">
              <h5 className="mb-0">
                <FaCalendarAlt className="me-2" />
                Department Leave Overview
              </h5>
              <small className="text-muted">View-only access to team leave status</small>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={3}>
                  <Card className="border-0 bg-warning bg-opacity-10">
                    <Card.Body className="text-center">
                      <h3 className="mb-0 text-warning">{stats?.leaveStats?.pending || 0}</h3>
                      <small className="text-muted">Pending Requests</small>
                      <div className="mt-1">
                        <small className="text-muted">Awaiting HR approval</small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="border-0 bg-success bg-opacity-10">
                    <Card.Body className="text-center">
                      <h3 className="mb-0 text-success">{stats?.leaveStats?.approved || 0}</h3>
                      <small className="text-muted">Approved</small>
                      <div className="mt-1">
                        <small className="text-muted">This month</small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="border-0 bg-info bg-opacity-10">
                    <Card.Body className="text-center">
                      <h3 className="mb-0 text-info">{stats?.leaveStats?.onLeaveToday || 0}</h3>
                      <small className="text-muted">On Leave Today</small>
                      <div className="mt-1">
                        <small className="text-muted">Team members</small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="border-0 bg-secondary bg-opacity-10">
                    <Card.Body className="text-center">
                      <h3 className="mb-0 text-secondary">{stats?.leaveStats?.total || 0}</h3>
                      <small className="text-muted">Total Requests</small>
                      <div className="mt-1">
                        <small className="text-muted">This month</small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Team Members on Leave Today */}
              {stats?.leaveStats?.onLeaveToday > 0 && stats?.todayLeaveDetails && (
                <div className="mt-4">
                  <h6 className="text-muted mb-3">Team Members on Leave Today</h6>
                  <div className="row g-2">
                    {stats.todayLeaveDetails.map((leave, index) => (
                      <div key={index} className="col-md-6">
                        <Card className="border-0 bg-light">
                          <Card.Body className="py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong>{leave.employee?.name || 'N/A'}</strong>
                                <div className="small text-muted">{leave.leaveType} leave</div>
                              </div>
                              <Badge bg="info" className="small">
                                {leave.startDate === leave.endDate ? '1 day' : 
                                 `${Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} days`}
                              </Badge>
                            </div>
                          </Card.Body>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note about permissions */}
              <div className="mt-3 p-2 bg-light rounded">
                <small className="text-muted">
                  <strong>Note:</strong> As Head of Department, you can view team leave status but cannot approve/reject requests. 
                  All leave approvals are handled by HR/Admin team.
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Attendance Section */}
      <Row className="mb-4">
        <Col>
          <Card className="border-info border-3">
            <Card.Header className="bg-info bg-opacity-10">
              <h5 className="mb-0">
                <FaClock className="me-2" />
                Today's Department Attendance
              </h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={3}>
                  <Card 
                    className={`border-0 bg-success bg-opacity-10 ${stats?.attendanceFilter === 'present' ? 'border border-success border-2' : ''}`}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onClick={() => {
                      setStats(prev => ({
                        ...prev,
                        attendanceFilter: prev?.attendanceFilter === 'present' ? '' : 'present'
                      }));
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Card.Body className="text-center">
                      <h3 className="mb-0 text-success">{stats?.attendance?.present || 0}</h3>
                      <small className="text-muted d-block">Present</small>
                      <small className="text-success" style={{ fontSize: '0.7rem' }}>Click to filter</small>
                      {stats?.attendanceFilter === 'present' && (
                        <div className="mt-2">
                          <Badge bg="success" className="w-100">✓ Filtered</Badge>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card 
                    className={`border-0 bg-danger bg-opacity-10 ${stats?.attendanceFilter === 'absent' ? 'border border-danger border-2' : ''}`}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onClick={() => {
                      setStats(prev => ({
                        ...prev,
                        attendanceFilter: prev?.attendanceFilter === 'absent' ? '' : 'absent'
                      }));
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Card.Body className="text-center">
                      <h3 className="mb-0 text-danger">{stats?.attendance?.absent || 0}</h3>
                      <small className="text-muted d-block">Absent</small>
                      <small className="text-danger" style={{ fontSize: '0.7rem' }}>Click to filter</small>
                      {stats?.attendanceFilter === 'absent' && (
                        <div className="mt-2">
                          <Badge bg="danger" className="w-100">✓ Filtered</Badge>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card 
                    className={`border-0 bg-warning bg-opacity-10 ${stats?.attendanceFilter === 'late' ? 'border border-warning border-2' : ''}`}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onClick={() => {
                      setStats(prev => ({
                        ...prev,
                        attendanceFilter: prev?.attendanceFilter === 'late' ? '' : 'late'
                      }));
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Card.Body className="text-center">
                      <h3 className="mb-0 text-warning">{stats?.attendance?.late || 0}</h3>
                      <small className="text-muted d-block">Late</small>
                      <small className="text-warning" style={{ fontSize: '0.7rem' }}>Click to filter</small>
                      {stats?.attendanceFilter === 'late' && (
                        <div className="mt-2">
                          <Badge bg="warning" className="w-100">✓ Filtered</Badge>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card 
                    className={`border-0 bg-info bg-opacity-10 ${stats?.attendanceFilter === '' || !stats?.attendanceFilter ? 'border border-info border-2' : ''}`}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onClick={() => {
                      setStats(prev => ({
                        ...prev,
                        attendanceFilter: ''
                      }));
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Card.Body className="text-center">
                      <h3 className="mb-0 text-info">{stats?.attendance?.total || 0}</h3>
                      <small className="text-muted d-block">Total</small>
                      <small className="text-info" style={{ fontSize: '0.7rem' }}>Click to show all</small>
                      {(stats?.attendanceFilter === '' || !stats?.attendanceFilter) && (
                        <div className="mt-2">
                          <Badge bg="info" className="w-100">✓ Showing All</Badge>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Filtered Attendance Details */}
              {stats?.attendanceFilter && stats?.attendanceDetails && stats.attendanceDetails.length > 0 && (
                <div className="mt-4">
                    <h6 className="text-muted mb-3">
                      {stats.attendanceFilter === 'present' && 'Present Employees'}
                      {stats.attendanceFilter === 'absent' && 'Absent Employees'}
                      {stats.attendanceFilter === 'late' && 'Late Employees'}
                    </h6>
                    <Table responsive hover size="sm">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Clock In</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.attendanceDetails
                          .filter(att => att.status === stats.attendanceFilter)
                          .map((att) => (
                            <tr key={att._id}>
                              <td>{att.employee?.name || 'N/A'}</td>
                              <td>
                                {att.clockIn 
                                  ? new Date(att.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                  : 'N/A'}
                              </td>
                              <td>
                                <Badge bg={
                                  att.status === 'present' ? 'success' :
                                  att.status === 'late' ? 'warning' : 'danger'
                                }>
                                  {att.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

      {/* Projects Section */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaProjectDiagram className="me-2" />
                Department Projects
              </h5>
            </Card.Header>
            <Card.Body>
              {projects.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No projects assigned to this department yet.</p>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Client</th>
                      <th>Head of Project</th>
                      <th>Status</th>
                      <th>Team Size</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project._id}>
                        <td>
                          <strong>{project.name}</strong>
                        </td>
                        <td>{project.client?.name || 'N/A'}</td>
                        <td>
                          {project.projectHead ? (
                            <div>
                              <div>{project.projectHead.name}</div>
                              <small className="text-muted">{project.projectHead.designation}</small>
                            </div>
                          ) : (
                            <Badge bg="warning">Not Assigned</Badge>
                          )}
                        </td>
                        <td>
                          <Badge
                            bg={
                              project.status === 'Completed'
                                ? 'success'
                                : project.status === 'In Progress'
                                ? 'primary'
                                : project.status === 'On Hold'
                                ? 'warning'
                                : 'secondary'
                            }
                          >
                            {project.status}
                          </Badge>
                        </td>
                        <td>{project.teamMembers?.length || 0} members</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{ width: `${project.progress || 0}%` }}
                              ></div>
                            </div>
                            <small>{project.progress || 0}%</small>
                          </div>
                        </td>
                        <td>
                          {!project.projectHead && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => openAssignHoPModal(project)}
                            >
                              <FaPlus className="me-1" />
                              Assign HoP
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Team Members Section */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <FaUsers className="me-2" />
                Team Members
              </h5>
            </Card.Header>
            <Card.Body>
              {members.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No team members in this department yet.</p>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Designation</th>
                      <th>Employee ID</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member._id}>
                        <td>
                          <strong>{member.name}</strong>
                        </td>
                        <td>{member.email}</td>
                        <td>{member.designation || 'N/A'}</td>
                        <td>{member.employeeId || 'N/A'}</td>
                        <td>
                          <Badge bg={member.status === 'active' ? 'success' : 'secondary'}>
                            {member.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Assign HoP Modal */}
      <Modal show={showAssignHoPModal} onHide={() => setShowAssignHoPModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Assign Head of Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProject && (
            <>
              <p>
                <strong>Project:</strong> {selectedProject.name}
              </p>
              <Form.Group className="mb-3">
                <Form.Label>Select Team Member</Form.Label>
                <Form.Select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Choose...</option>
                  {members
                    .filter((m) => m.status === 'active')
                    .map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name} - {member.designation || 'Employee'}
                      </option>
                    ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Select a team member from your department to lead this project
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignHoPModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAssignHoP}>
            Assign as HoP
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default HoDDashboard;
