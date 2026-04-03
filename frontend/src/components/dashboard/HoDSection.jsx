import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Table, Badge, Modal, Form } from 'react-bootstrap';
import { FaUsers, FaProjectDiagram, FaUserTie, FaPlus, FaChevronDown, FaChevronUp, FaClock } from 'react-icons/fa';
import { departmentApi } from '../../api/departmentApi';
import { projectApi } from '../../api/projectApi';
import toast from '../../utils/toast';

const HoDSection = ({ user }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [department, setDepartment] = useState(null);
  const [attendanceDetails, setAttendanceDetails] = useState([]);
  const [attendanceFilter, setAttendanceFilter] = useState('');
  
  // Modal states
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  useEffect(() => {
    if (user.headOfDepartment) {
      loadHoDData();
    }
  }, [user]);

  const loadHoDData = async () => {
    try {
      setLoading(true);
      // Extract department ID - it might be an object or a string
      const departmentId = typeof user.headOfDepartment === 'object' 
        ? user.headOfDepartment?._id 
        : user.headOfDepartment;

      if (!departmentId) {
        throw new Error('No department ID found. Please log out and log back in.');
      }

      const [statsRes, projectsRes, membersRes, deptRes, attendanceRes] = await Promise.all([
        departmentApi.getDepartmentStats(departmentId),
        departmentApi.getDepartmentProjects(departmentId),
        departmentApi.getDepartmentMembers(departmentId),
        departmentApi.getDepartmentById(departmentId),
        // Fetch today's attendance for the department
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attendance?date=${new Date().toISOString().split('T')[0]}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json()).catch(() => [])
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

      setStats({
        ...statsRes,
        attendance: attendanceStats
      });
      setAttendanceDetails(departmentAttendance);
      setProjects(projectsRes.data.projects || []);
      setMembers(membersRes.members || []);
      setDepartment(deptRes);
    } catch (error) {
      console.error('Error loading HoD data:', error);
      toast.error('Failed to load department data');
    } finally {
      setLoading(false);
    }
  };



  if (!user.headOfDepartment) {
    return null;
  }

  return (
    <>
      {/* HoD Section Header */}
      <Card className="mb-4 border-0 shadow-sm" style={{ borderLeft: '4px solid #667eea' }}>
        <Card.Header 
          className="bg-gradient d-flex justify-content-between align-items-center cursor-pointer"
          onClick={() => setExpanded(!expanded)}
          style={{ 
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            cursor: 'pointer'
          }}
        >
          <div>
            <h5 className="mb-0">
              <FaUserTie className="me-2 text-primary" />
              Head of Department - {department?.name || 'Loading...'}
            </h5>
            <small className="text-muted">Manage your department and assign project leads</small>
          </div>
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </Card.Header>

        {expanded && (
          <Card.Body>
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Quick Stats */}
                <Row className="mb-3">
                  <Col md={3} sm={6} className="mb-3">
                    <Card 
                      className="border-0 bg-light text-center" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowMembersModal(true)}
                    >
                      <Card.Body>
                        <FaUsers className="text-primary mb-2" size={24} />
                        <h4 className="mb-0">{stats?.totalMembers || 0}</h4>
                        <small className="text-muted">Team Members</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3} sm={6} className="mb-3">
                    <Card 
                      className="border-0 bg-light text-center" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate('/projects')}
                    >
                      <Card.Body>
                        <FaProjectDiagram className="text-info mb-2" size={24} />
                        <h4 className="mb-0">{stats?.totalProjects || 0}</h4>
                        <small className="text-muted">Total Projects</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3} sm={6} className="mb-3">
                    <Card className="border-0 bg-light text-center">
                      <Card.Body>
                        <div className="text-warning mb-2">⏳</div>
                        <h4 className="mb-0">{stats?.activeProjects || 0}</h4>
                        <small className="text-muted">Active</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3} sm={6} className="mb-3">
                    <Card className="border-0 bg-light text-center">
                      <Card.Body>
                        <div className="text-success mb-2">✓</div>
                        <h4 className="mb-0">{stats?.completedProjects || 0}</h4>
                        <small className="text-muted">Completed</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Department Attendance Summary */}
                <Card className="border-info border-2 mb-3 mt-0">
                  <Card.Header className="bg-info bg-opacity-10">
                    <h6 className="mb-0">
                      📊 Today's Department Attendance
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row className="g-3">
                      <Col md={3} xs={6}>
                        <Card 
                          className={`border-0 bg-success bg-opacity-10 text-center ${attendanceFilter === 'present' ? 'border border-success border-2' : ''}`}
                          style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                          onClick={() => {
                            setAttendanceFilter(attendanceFilter === 'present' ? '' : 'present');
                            setShowAttendanceModal(true);
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
                          <Card.Body>
                            <h3 className="mb-0 text-success">{stats?.attendance?.present || 0}</h3>
                            <small className="text-muted d-block">Present</small>
                            <small className="text-success" style={{ fontSize: '0.7rem' }}>Click to view</small>
                            {attendanceFilter === 'present' && (
                              <div className="mt-2">
                                <Badge bg="success" className="w-100">✓ Filtered</Badge>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3} xs={6}>
                        <Card 
                          className={`border-0 bg-danger bg-opacity-10 text-center ${attendanceFilter === 'absent' ? 'border border-danger border-2' : ''}`}
                          style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                          onClick={() => {
                            setAttendanceFilter(attendanceFilter === 'absent' ? '' : 'absent');
                            setShowAttendanceModal(true);
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
                          <Card.Body>
                            <h3 className="mb-0 text-danger">{stats?.attendance?.absent || 0}</h3>
                            <small className="text-muted d-block">Absent</small>
                            <small className="text-danger" style={{ fontSize: '0.7rem' }}>Click to view</small>
                            {attendanceFilter === 'absent' && (
                              <div className="mt-2">
                                <Badge bg="danger" className="w-100">✓ Filtered</Badge>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3} xs={6}>
                        <Card 
                          className={`border-0 bg-warning bg-opacity-10 text-center ${attendanceFilter === 'late' ? 'border border-warning border-2' : ''}`}
                          style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                          onClick={() => {
                            setAttendanceFilter(attendanceFilter === 'late' ? '' : 'late');
                            setShowAttendanceModal(true);
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
                          <Card.Body>
                            <h3 className="mb-0 text-warning">{stats?.attendance?.late || 0}</h3>
                            <small className="text-muted d-block">Late</small>
                            <small className="text-warning" style={{ fontSize: '0.7rem' }}>Click to view</small>
                            {attendanceFilter === 'late' && (
                              <div className="mt-2">
                                <Badge bg="warning" className="w-100">✓ Filtered</Badge>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3} xs={6}>
                        <Card 
                          className={`border-0 bg-info bg-opacity-10 text-center ${attendanceFilter === '' ? 'border border-info border-2' : ''}`}
                          style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                          onClick={() => {
                            setAttendanceFilter('');
                            setShowAttendanceModal(true);
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
                          <Card.Body>
                            <h3 className="mb-0 text-info">{stats?.attendance?.total || 0}</h3>
                            <small className="text-muted d-block">Total</small>
                            <small className="text-info" style={{ fontSize: '0.7rem' }}>All records</small>
                            {attendanceFilter === '' && (
                              <div className="mt-2">
                                <Badge bg="info" className="w-100">✓ Showing All</Badge>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

              </>
            )}
          </Card.Body>
        )}
      </Card>

      {/* Team Members Modal */}
      <Modal show={showMembersModal} onHide={() => setShowMembersModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUsers className="me-2" />
            Department Team Members
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {members.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FaUsers size={48} className="mb-3 opacity-50" />
              <p>No team members in this department yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
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
                      <td><strong>{member.name}</strong></td>
                      <td>{member.email}</td>
                      <td>{member.designation || 'N/A'}</td>
                      <td>{member.employeeId || 'N/A'}</td>
                      <td>
                        <Badge bg={member.status === 'active' ? 'success' : 'secondary'}>
                          {member.status || 'active'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          <div className="mt-3 text-muted">
            <small>Total Members: {members.length}</small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMembersModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Attendance Details Modal */}
      <Modal 
        show={showAttendanceModal} 
        onHide={() => setShowAttendanceModal(false)} 
        size="lg"
        centered
        style={{ zIndex: 1060 }}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            📊 Department Attendance Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <h6 className="text-muted">
              {attendanceFilter === 'present' && 'Present Employees'}
              {attendanceFilter === 'absent' && 'Absent Employees'}
              {attendanceFilter === 'late' && 'Late Employees'}
              {attendanceFilter === '' && 'All Attendance Records'}
            </h6>
          </div>

          {attendanceDetails.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FaClock size={48} className="mb-3 opacity-50" />
              <p>No attendance records found for today.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceDetails
                    .filter(att => attendanceFilter === '' || att.status === attendanceFilter)
                    .map((att) => (
                      <tr key={att._id}>
                        <td>
                          <strong>{att.employee?.name || 'N/A'}</strong>
                          <br />
                          <small className="text-muted">{att.employee?.designation || ''}</small>
                        </td>
                        <td>
                          {att.clockIn 
                            ? new Date(att.clockIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
                            : 'N/A'}
                        </td>
                        <td>
                          {att.clockOut 
                            ? new Date(att.clockOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
                            : '-'}
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

          <div className="mt-3 text-muted">
            <small>
              Showing {attendanceDetails.filter(att => attendanceFilter === '' || att.status === attendanceFilter).length} of {attendanceDetails.length} records
            </small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAttendanceModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default HoDSection;
