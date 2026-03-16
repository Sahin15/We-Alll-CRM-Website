import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Badge, Form, Button, Dropdown, Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { attendanceApi } from "../../api/attendanceApi";
import { userApi } from "../../api/userApi";
import { useAuth } from "../../context/AuthContext";
import {
  formatDate,
  formatTime,
  formatDateTime,
  getStatusVariant,
} from "../../utils/helpers";
import { formatWorkHours } from "../../utils/attendanceHelpers";
import EmployeeAttendanceDetails from "../../components/attendance/EmployeeAttendanceDetails";
import "../../styles/pages-mobile.css";
import "../../styles/table-mobile.css";

const AttendanceTracking = () => {
  const { user } = useAuth();
  
  // Add CSS for dropdown visibility
  const dropdownStyles = `
    .attendance-dropdown-container {
      position: relative !important;
      z-index: 9999 !important;
    }
    .attendance-dropdown {
      position: absolute !important;
      top: 100% !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 9999 !important;
      background: white !important;
      border: 1px solid #dee2e6 !important;
      border-radius: 0.375rem !important;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
      max-height: 300px !important;
      overflow-y: auto !important;
      margin-top: 0.25rem !important;
    }
    .attendance-dropdown-item:hover {
      background-color: #f8f9fa !important;
    }
    
    /* Pulse animation for "On Break" badge */
    @keyframes pulse-badge {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.05);
      }
    }
    
    .pulse-badge {
      animation: pulse-badge 2s ease-in-out infinite;
    }
    
    /* Better table styling */
    .table th {
      background-color: #f8f9fa;
      font-weight: 600;
      border-bottom: 2px solid #dee2e6;
      white-space: nowrap;
    }
    
    .table td {
      vertical-align: middle;
    }
    
    .table tbody tr:hover {
      background-color: #f8f9fa;
    }
    
    /* Orange badge for half-day status */
    .badge.bg-orange {
      background-color: #fd7e14 !important;
      color: white !important;
    }
    
    /* Edited record styling */
    .edited-record {
      background-color: #fff3cd !important;
      border-left: 4px solid #ffc107 !important;
    }
    
    .edited-record:hover {
      background-color: #ffe69c !important;
    }
    
    .edit-indicator {
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
      font-size: 1.1em;
      opacity: 0.8;
    }
    
    .edit-indicator:hover {
      transform: scale(1.3);
      opacity: 1;
    }
    
    /* WFH record styling */
    .wfh-record {
      background-color: #e7f3ff !important;
      border-left: 4px solid #0d6efd !important;
    }
    
    .wfh-record:hover {
      background-color: #cfe2ff !important;
    }
    
    .wfh-indicator {
      font-size: 1.2em;
      transition: transform 0.2s;
      display: inline-block;
    }
    
    .wfh-indicator:hover {
      transform: scale(1.3);
    }
  `;
  const [attendances, setAttendances] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Get today's date
  const getTodayDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const [filters, setFilters] = useState({
    employee: "",
    status: "",
    startDate: getTodayDate(), // Default to today
    endDate: getTodayDate(),
  });
  
  const [activeFilter, setActiveFilter] = useState('today'); // Track active filter
  const [statusFilter, setStatusFilter] = useState(null); // Filter by status when card clicked
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Break details modal state
  const [showBreakDetailsModal, setShowBreakDetailsModal] = useState(false);
  const [selectedBreakDetails, setSelectedBreakDetails] = useState(null);
  
  // Edit attendance modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editForm, setEditForm] = useState({
    clockIn: '',
    clockOut: '',
    status: '',
    reason: '',
    notes: ''
  });
  
  // Edit history modal state
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);
  const [selectedEditHistory, setSelectedEditHistory] = useState(null);
  
  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchUsers();
    fetchAttendances();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await userApi.getAllUsers();
      let employeeList = response.data.filter((u) => 
        u.role === "employee" || u.role === "hod" || u.role === "hr"
      );
      
      // If user is HoD, filter to show only their department employees
      if (user.role === 'hod' && user.headOfDepartment) {
        employeeList = employeeList.filter((u) => 
          u.department === user.headOfDepartment || 
          u.department?._id === user.headOfDepartment ||
          u._id === user._id // Include the HoD themselves
        );
      }
      
      setUsers(employeeList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.employee) params.employee = filters.employee;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await attendanceApi.getAllAttendance(params);
      setAttendances(response.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error("Failed to fetch attendance records");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    // Reset active filter when manually changing dates
    if (name === 'startDate' || name === 'endDate') {
      setActiveFilter(null);
    }
    
    // Auto-fetch when employee changes
    if (name === 'employee') {
      try {
        setLoading(true);
        const params = {};
        
        if (value) {
          // Employee selected - show current month data
          params.employee = value;
          
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const startDate = firstDay.toISOString().split('T')[0];
          const endDate = lastDay.toISOString().split('T')[0];
          
          params.startDate = startDate;
          params.endDate = endDate;
          
          // Update filters to show the month dates
          newFilters.startDate = startDate;
          newFilters.endDate = endDate;
          setFilters(newFilters);
          setActiveFilter('month');
        } else {
          // No employee selected - show today's data for all
          const today = getTodayDate();
          params.startDate = today;
          params.endDate = today;
          
          newFilters.startDate = today;
          newFilters.endDate = today;
          setFilters(newFilters);
          setActiveFilter('today');
        }
        
        if (newFilters.status) params.status = newFilters.status;

        const response = await attendanceApi.getAllAttendance(params);
        setAttendances(response.data);
      } catch (error) {
        toast.error("Failed to fetch attendance records");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.employee) params.employee = filters.employee;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await attendanceApi.getAllAttendance(params);
      setAttendances(response.data);
    } catch (error) {
      toast.error("Failed to fetch attendance records");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFilter = (type) => {
    const now = new Date();
    let startDate, endDate;

    switch (type) {
      case 'today':
        startDate = endDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Sunday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Saturday
        startDate = weekStart.toISOString().split('T')[0];
        endDate = weekEnd.toISOString().split('T')[0];
        break;
      case 'month':
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = firstDay.toISOString().split('T')[0];
        endDate = lastDay.toISOString().split('T')[0];
        break;
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = lastMonthEnd.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setActiveFilter(type); // Set active filter
    const newFilters = { ...filters, startDate, endDate };
    setFilters(newFilters);
    
    // Make API call with new filters directly (avoid timing issues)
    setTimeout(async () => {
      try {
        setLoading(true);
        const params = {};
        if (newFilters.employee) params.employee = newFilters.employee;
        if (newFilters.status) params.status = newFilters.status;
        if (newFilters.startDate) params.startDate = newFilters.startDate;
        if (newFilters.endDate) params.endDate = newFilters.endDate;

        const response = await attendanceApi.getAllAttendance(params);
        setAttendances(response.data);
      } catch (error) {
        toast.error("Failed to fetch attendance records");
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  // Calculate statistics for selected employee
  const calculateStats = () => {
    if (!filters.employee) return null;

    const selectedEmployee = users.find(u => u._id === filters.employee);
    
    // If no attendance records, show as absent
    if (attendances.length === 0) {
      // Calculate expected working days in the date range
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        employeeName: selectedEmployee?.name || "Unknown",
        present: 0,
        late: 0,
        halfDay: 0,
        absent: daysDiff,
        onLeave: 0,
        totalHours: "0.00",
        totalOvertime: "0.00",
        totalBreakTime: "0",
        totalBreaks: 0,
        totalDays: 0,
        avgHoursPerDay: 0,
      };
    }

    const present = attendances.filter((a) => a.status === "present").length;
    const late = attendances.filter((a) => a.status === "late").length;
    const halfDay = attendances.filter((a) => a.status === "half-day").length;
    const absent = attendances.filter((a) => a.status === "absent").length;
    const onLeave = attendances.filter((a) => a.status === "on-leave").length;
    const totalHours = attendances.reduce((sum, a) => sum + (a.workHours || 0), 0);
    const totalOvertime = attendances.reduce((sum, a) => sum + (a.overtime || 0), 0);
    const totalBreakMinutes = attendances.reduce((sum, a) => sum + (a.totalBreakTime || 0), 0);
    const totalBreaks = attendances.reduce((sum, a) => sum + (a.breaks?.length || 0), 0);
    const totalDays = attendances.length;

    return {
      employeeName: selectedEmployee?.name || "Unknown",
      present,
      late,
      halfDay,
      absent,
      onLeave,
      totalHours: totalHours.toFixed(2),
      totalOvertime: totalOvertime.toFixed(2),
      totalBreakTime: Math.floor(totalBreakMinutes),
      totalBreaks,
      totalDays,
      avgHoursPerDay: totalDays > 0 ? (totalHours / totalDays).toFixed(2) : 0,
    };
  };

  const stats = calculateStats();

  // Calculate absent employees (not clocked in today)
  const getAbsentEmployees = () => {
    // Only show for today's date AND when no specific employee is selected
    const today = getTodayDate();
    if (filters.startDate !== today || filters.endDate !== today || filters.employee) {
      return [];
    }

    // Get list of employees who clocked in today
    const clockedInEmployeeIds = attendances.map(a => a.employee?._id || a.employee);
    
    // Find employees who haven't clocked in
    const absentEmployees = users.filter(user => !clockedInEmployeeIds.includes(user._id));
    
    return absentEmployees;
  };

  const absentEmployees = getAbsentEmployees();

  // Handle view details for employee - Opens modal
  const handleViewDetails = (employeeId) => {
    const employee = users.find(u => u._id === employeeId);
    if (employee) {
      setSelectedEmployee(employee);
      setShowDetailsModal(true);
    }
  };

  // Handle edit attendance - Opens edit modal
  const handleEditAttendance = (attendance) => {
    setEditingAttendance(attendance);
    
    // Format dates for datetime-local input - CONVERT TO IST
    const formatDateTimeLocal = (date) => {
      if (!date) return '';
      const d = new Date(date);
      
      // Convert UTC date to IST string (YYYY-MM-DDTHH:MM)
      const istDateString = d.toLocaleString('en-CA', { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      // Format: "YYYY-MM-DD HH:MM" -> "YYYY-MM-DDTHH:MM"
      return istDateString.replace(' ', 'T');
    };
    
    setEditForm({
      clockIn: formatDateTimeLocal(attendance.clockIn),
      clockOut: attendance.clockOut ? formatDateTimeLocal(attendance.clockOut) : '',
      status: attendance.status,
      reason: '',
      notes: attendance.notes || ''
    });
    
    setShowEditModal(true);
  };

  // Handle save edited attendance
  const handleSaveEdit = async () => {
    if (!editForm.reason || editForm.reason.trim() === '') {
      toast.error("Please provide a reason for editing this attendance record");
      return;
    }

    try {
      const updateData = {
        clockIn: editForm.clockIn,
        clockOut: editForm.clockOut || undefined,
        status: editForm.status,
        reason: editForm.reason,
        notes: editForm.notes
      };

      await attendanceApi.updateManualAttendance(editingAttendance._id, updateData);
      
      toast.success("Attendance record updated successfully");
      setShowEditModal(false);
      setEditingAttendance(null);
      setEditForm({
        clockIn: '',
        clockOut: '',
        status: '',
        reason: '',
        notes: ''
      });
      
      // Refresh attendance data
      fetchAttendances();
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error(error.response?.data?.message || "Failed to update attendance record");
    }
  };

  // Check if user can edit attendance (HR, Admin, SuperAdmin)
  const canEditAttendance = () => {
    return ['hr', 'admin', 'superadmin'].includes(user?.role);
  };

  // Check if user can view attendance details (HR, Admin, SuperAdmin, HOD)
  const canViewDetails = () => {
    return ['hr', 'admin', 'superadmin', 'hod'].includes(user?.role);
  };

  return (
    <>
      <style>{dropdownStyles}</style>
      <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Attendance Tracking</h2>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card style={{ overflow: 'visible' }}>
            <Card.Body style={{ overflow: 'visible' }}>
              {/* Quick Filter Buttons */}
              <Row className="mb-3">
                <Col>
                  <div className="d-flex gap-2 flex-wrap">
                    <button 
                      className={`btn btn-sm ${activeFilter === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleQuickFilter('today')}
                    >
                      Today
                    </button>
                    <button 
                      className={`btn btn-sm ${activeFilter === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleQuickFilter('week')}
                    >
                      This Week
                    </button>
                    <button 
                      className={`btn btn-sm ${activeFilter === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleQuickFilter('month')}
                    >
                      This Month
                    </button>
                    <button 
                      className={`btn btn-sm ${activeFilter === 'lastMonth' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                      onClick={() => handleQuickFilter('lastMonth')}
                    >
                      Last Month
                    </button>
                  </div>
                </Col>
              </Row>
              <hr />
              <Row className="g-3" style={{ position: 'relative', zIndex: 1 }}>
                <Col md={3} style={{ position: 'relative', zIndex: 10 }}>
                  <Form.Group style={{ position: 'relative', zIndex: 10 }}>
                    <Form.Label>Employee</Form.Label>
                    <div className="position-relative attendance-dropdown-container">
                      <Form.Control
                        type="text"
                        placeholder={
                          filters.employee 
                            ? users.find(u => u._id === filters.employee)?.name 
                            : "All Employees - Type to search..."
                        }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        autoComplete="off"
                      />
                      {showDropdown && (
                        <div className="attendance-dropdown w-100">
                          <div 
                            className="p-2 border-bottom bg-light attendance-dropdown-item"
                            style={{ 
                              cursor: 'pointer',
                              transition: 'background-color 0.2s ease'
                            }}
                            onClick={() => {
                              setFilters({ ...filters, employee: '' });
                              setSearchTerm("");
                              setShowDropdown(false);
                              handleFilterChange({ target: { name: 'employee', value: '' } });
                            }}
                          >
                            <strong>All Employees</strong>
                          </div>
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                              <div
                                key={user._id}
                                className="p-2 border-bottom attendance-dropdown-item"
                                style={{ 
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s ease'
                                }}
                                onClick={() => {
                                  setFilters({ ...filters, employee: user._id });
                                  setSearchTerm("");
                                  setShowDropdown(false);
                                  handleFilterChange({ target: { name: 'employee', value: user._id } });
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                              >
                                <div className="fw-semibold">{user.name}</div>
                                <small className="text-muted">{user.email}</small>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-muted text-center">
                              No employees found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {filters.employee && (
                      <Form.Text className="text-muted d-block mt-1">
                        Selected: <strong>{users.find(u => u._id === filters.employee)?.name}</strong>
                        {" "}
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 ms-1 text-decoration-none"
                          onClick={() => {
                            setFilters({ ...filters, employee: '' });
                            setSearchTerm("");
                            handleFilterChange({ target: { name: 'employee', value: '' } });
                          }}
                        >
                          ✕ Clear
                        </button>
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>

                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Status</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="half-day">Half Day</option>
                      <option value="on-leave">On Leave</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>

                <Col md={2}>
                  <Form.Group>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>

                <Col md={3} className="d-flex align-items-end gap-2">
                  <button
                    className="btn btn-secondary flex-fill"
                    onClick={async () => {
                      setSearchTerm("");
                      const clearedFilters = {
                        employee: "",
                        status: "",
                        startDate: getTodayDate(),
                        endDate: getTodayDate(),
                      };
                      setFilters(clearedFilters);
                      setActiveFilter('today');
                      
                      // Make API call with cleared filters directly
                      try {
                        setLoading(true);
                        const params = {};
                        if (clearedFilters.startDate) params.startDate = clearedFilters.startDate;
                        if (clearedFilters.endDate) params.endDate = clearedFilters.endDate;
                        
                        const response = await attendanceApi.getAllAttendance(params);
                        setAttendances(response.data);
                      } catch (error) {
                        toast.error("Failed to fetch attendance records");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Clear Filters
                  </button>
                  <button
                    className="btn btn-primary flex-fill"
                    onClick={handleApplyFilters}
                  >
                    Apply Filters
                  </button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Employee Statistics Summary */}
      {stats && (
        <Row className="mb-4">
          <Col>
            <Card className="border-primary">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">
                  📊 Attendance Summary: {stats.employeeName}
                </h5>
                <small>
                  Period: {formatDate(filters.startDate)} to {formatDate(filters.endDate)}
                </small>
              </Card.Header>
              <Card.Body>
                {stats.totalDays === 0 && stats.absent > 0 && (
                  <div className="alert alert-danger mb-3">
                    <strong>⚠️ No Attendance Records Found</strong>
                    <p className="mb-0">
                      {stats.employeeName} has not clocked in during this period ({stats.absent} day(s) absent).
                    </p>
                  </div>
                )}
                <Row className="text-center">
                  <Col xs={6} md={3} className="mb-3">
                    <Card 
                      className={`border-success h-100 ${statusFilter === 'present' ? 'bg-success bg-opacity-10' : ''}`}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      onClick={() => setStatusFilter(statusFilter === 'present' ? null : 'present')}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <Card.Body>
                        <h2 className="text-success mb-1">{stats.present}</h2>
                        <small className="text-muted">On Time</small>
                        <div className="mt-2">
                          <Badge bg="success">Present</Badge>
                        </div>
                        {statusFilter === 'present' && <small className="d-block mt-2 text-success">✓ Filtered</small>}
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3} className="mb-3">
                    <Card 
                      className={`border-warning h-100 ${statusFilter === 'late' ? 'bg-warning bg-opacity-10' : ''}`}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      onClick={() => setStatusFilter(statusFilter === 'late' ? null : 'late')}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <Card.Body>
                        <h2 className="text-warning mb-1">{stats.late}</h2>
                        <small className="text-muted">Late Arrivals</small>
                        <div className="mt-2">
                          <Badge bg="warning">10:31 AM - 11:59 AM</Badge>
                        </div>
                        {statusFilter === 'late' && <small className="d-block mt-2 text-warning">✓ Filtered</small>}
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3} className="mb-3">
                    <Card 
                      className={`border-info h-100 ${statusFilter === 'half-day' ? 'bg-info bg-opacity-10' : ''}`}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      onClick={() => setStatusFilter(statusFilter === 'half-day' ? null : 'half-day')}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <Card.Body>
                        <h2 className="text-info mb-1">{stats.halfDay}</h2>
                        <small className="text-muted">Half Day</small>
                        <div className="mt-2">
                          <Badge bg="info">After 12:00 PM</Badge>
                        </div>
                        {statusFilter === 'half-day' && <small className="d-block mt-2 text-info">✓ Filtered</small>}
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3} className="mb-3">
                    <Card 
                      className={`border-danger h-100 ${statusFilter === 'absent' ? 'bg-danger bg-opacity-10' : ''}`}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      onClick={() => setStatusFilter(statusFilter === 'absent' ? null : 'absent')}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <Card.Body>
                        <h2 className="text-danger mb-1">{stats.absent}</h2>
                        <small className="text-muted">Absent</small>
                        <div className="mt-2">
                          <Badge bg="danger">No Clock-in</Badge>
                        </div>
                        {statusFilter === 'absent' && <small className="d-block mt-2 text-danger">✓ Filtered</small>}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                {statusFilter && (
                  <div className="text-center mb-3">
                    <small className="text-muted">
                      Click the card again to clear filter
                    </small>
                  </div>
                )}
                <hr />
                <Row className="text-center">
                  <Col xs={6} md={2}>
                    <div className="p-2">
                      <h5 className="text-primary mb-0">{stats.totalDays}</h5>
                      <small className="text-muted">Total Days</small>
                    </div>
                  </Col>
                  <Col xs={6} md={2}>
                    <div className="p-2">
                      <h5 className="text-success mb-0">{stats.totalHours}</h5>
                      <small className="text-muted">Total Hours</small>
                    </div>
                  </Col>
                  <Col xs={6} md={2}>
                    <div className="p-2">
                      <h5 className="text-info mb-0">{stats.avgHoursPerDay}</h5>
                      <small className="text-muted">Avg Hours/Day</small>
                    </div>
                  </Col>
                  <Col xs={6} md={2}>
                    <div className="p-2">
                      <h5 className="text-warning mb-0">{formatWorkHours(parseFloat(stats.totalOvertime))}</h5>
                      <small className="text-muted">Total Overtime</small>
                    </div>
                  </Col>
                  <Col xs={6} md={2}>
                    <div className="p-2">
                      <h5 className="text-secondary mb-0">{stats.totalBreaks}</h5>
                      <small className="text-muted">Total Breaks</small>
                    </div>
                  </Col>
                  <Col xs={6} md={2}>
                    <div className="p-2">
                      <h5 className="text-secondary mb-0">{stats.totalBreakTime}</h5>
                      <small className="text-muted">Break Time (min)</small>
                    </div>
                  </Col>
                </Row>
                {stats.onLeave > 0 && (
                  <>
                    <hr />
                    <div className="text-center">
                      <Badge bg="secondary" className="px-3 py-2">
                        On Leave: {stats.onLeave} days
                      </Badge>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      {!filters.employee && <th>Employee</th>}
                      <th>Date</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Breaks</th>
                      <th>Break Time</th>
                      <th>Work Hours</th>
                      <th>Overtime</th>
                      <th>Status</th>
                      {(!filters.employee || canViewDetails()) && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.length > 0 ? (
                      attendances
                        .filter(attendance => !statusFilter || attendance.status === statusFilter)
                        .map((attendance) => {
                          // Calculate break information
                          const breaks = attendance.breaks || [];
                          const breakCount = breaks.length;
                          const totalBreakMinutes = attendance.totalBreakTime || 0;
                          const isOnBreak = breaks.length > 0 && breaks[breaks.length - 1].startTime && !breaks[breaks.length - 1].endTime;
                          
                          // Check if record was manually edited
                          const isEdited = attendance.isManuallyModified;
                          const latestEdit = attendance.modificationHistory && attendance.modificationHistory.length > 0 
                            ? attendance.modificationHistory[attendance.modificationHistory.length - 1] 
                            : null;
                          
                          // Check if WFH
                          const isWFH = attendance.isWFH;
                          const wfhReason = attendance.wfhReason;
                          
                          return (
                            <tr key={attendance._id} className={isEdited ? 'edited-record' : (isWFH ? 'wfh-record' : '')}>
                              {!filters.employee && (
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    <span>{attendance.employee?.name || "N/A"}</span>
                                    {isWFH && (
                                      <span 
                                        className="wfh-indicator"
                                        title={`Work From Home${wfhReason ? ': ' + wfhReason : ''}`}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        🏠
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <span>{formatDate(attendance.date)}</span>
                                  {isEdited && (
                                    <span 
                                      className="edit-indicator"
                                      onClick={() => {
                                        setSelectedEditHistory({
                                          employeeName: attendance.employee?.name || "Unknown",
                                          date: attendance.date,
                                          originalStatus: attendance.originalStatus,
                                          currentStatus: attendance.status,
                                          modificationHistory: attendance.modificationHistory || []
                                        });
                                        setShowEditHistoryModal(true);
                                      }}
                                      title="This record was manually edited. Click to view history."
                                      style={{ cursor: 'pointer' }}
                                    >
                                      ✏️
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>{formatTime(attendance.clockIn)}</td>
                              <td>
                                {attendance.clockOut
                                  ? formatTime(attendance.clockOut)
                                  : isOnBreak 
                                  ? <Badge bg="warning" className="pulse-badge">On Break</Badge>
                                  : <Badge bg="success">Working</Badge>}
                              </td>
                              <td>
                                {breakCount > 0 ? (
                                  <div 
                                    className="d-flex align-items-center gap-1"
                                    onClick={() => {
                                      setSelectedBreakDetails({
                                        employeeName: attendance.employee?.name || "Unknown",
                                        date: attendance.date,
                                        breaks: breaks,
                                        totalBreakTime: totalBreakMinutes
                                      });
                                      setShowBreakDetailsModal(true);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                    title="Click to view break details"
                                  >
                                    <Badge bg="secondary" className="d-flex align-items-center gap-1">
                                      <span>{breakCount}</span>
                                      <span style={{ fontSize: '0.7em' }}>break{breakCount > 1 ? 's' : ''}</span>
                                    </Badge>
                                    {isOnBreak && (
                                      <Badge bg="warning" className="pulse-badge" style={{ fontSize: '0.7em' }}>
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                {totalBreakMinutes > 0 ? (
                                  <Badge bg="info">
                                    {Math.floor(totalBreakMinutes)} min
                                  </Badge>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                <strong>{formatWorkHours(attendance.workHours || 0)}</strong>
                              </td>
                              <td>
                                {attendance.overtime > 0 ? (
                                  <Badge bg="warning">{formatWorkHours(attendance.overtime)}</Badge>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                <Badge bg={getStatusVariant(attendance.status)}>
                                  {attendance.status}
                                </Badge>
                              </td>
                              {(!filters.employee || canViewDetails()) && (
                                <td>
                                  <div className="d-flex gap-1">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => handleViewDetails(attendance.employee?._id)}
                                      title="View Details"
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.875rem',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      📊 View
                                    </Button>
                                    {canEditAttendance() && (
                                      <Button
                                        variant="outline-warning"
                                        size="sm"
                                        onClick={() => handleEditAttendance(attendance)}
                                        title="Edit Attendance"
                                        style={{
                                          padding: '0.25rem 0.5rem',
                                          fontSize: '0.875rem',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        ✏️ Edit
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td colSpan={(!filters.employee || canViewDetails()) ? (filters.employee ? "9" : "10") : (filters.employee ? "8" : "10")} className="text-center py-4">
                          No attendance records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Absent Employees (Not Clocked In Today) */}
      {absentEmployees.length > 0 && (
        <Row className="mt-4">
          <Col>
            <Card className="border-danger">
              <Card.Header className="bg-danger text-white">
                <h5 className="mb-0">
                  ⚠️ Absent Today - Not Clocked In ({absentEmployees.length})
                </h5>
                <small>Employees who haven't clocked in yet today</small>
              </Card.Header>
              <Card.Body>
                <Row>
                  {absentEmployees.map((employee) => (
                    <Col xs={12} sm={6} md={4} lg={3} key={employee._id} className="mb-3">
                      <Card className="h-100 border-danger">
                        <Card.Body className="p-3">
                          <div className="d-flex align-items-center">
                            <div className="bg-danger bg-opacity-10 rounded-circle p-2 me-2">
                              <span className="text-danger fw-bold">
                                {employee.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-grow-1">
                              <div className="fw-semibold text-truncate">{employee.name}</div>
                              <small className="text-muted text-truncate d-block">{employee.email}</small>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Badge bg="danger" className="w-100">Absent</Badge>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Employee Attendance Details Modal */}
      <EmployeeAttendanceDetails
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        employee={selectedEmployee}
      />

      {/* Edit Attendance Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            ✏️ Edit Attendance Record
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingAttendance && (
            <>
              <div className="mb-3 p-3 bg-light rounded">
                <h6 className="mb-2">Employee Information</h6>
                <p className="mb-1"><strong>Name:</strong> {editingAttendance.employee?.name || 'N/A'}</p>
                <p className="mb-1"><strong>Date:</strong> {formatDate(editingAttendance.date)}</p>
                <p className="mb-0"><strong>Current Status:</strong> 
                  <Badge bg={getStatusVariant(editingAttendance.status)} className="ms-2">
                    {editingAttendance.status}
                  </Badge>
                </p>
              </div>

              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Clock In Time *</Form.Label>
                      <Form.Control
                        type="datetime-local"
                        value={editForm.clockIn}
                        onChange={(e) => setEditForm({...editForm, clockIn: e.target.value})}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Clock Out Time</Form.Label>
                      <Form.Control
                        type="datetime-local"
                        value={editForm.clockOut}
                        onChange={(e) => setEditForm({...editForm, clockOut: e.target.value})}
                      />
                      <Form.Text className="text-muted">
                        Leave empty if employee hasn't clocked out yet
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Status *</Form.Label>
                      <Form.Select
                        value={editForm.status}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                        required
                      >
                        <option value="">Select Status</option>
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="half-day">Half Day</option>
                        <option value="absent">Absent</option>
                        <option value="on-leave">On Leave</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Reason for Edit *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={editForm.reason}
                        onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                        placeholder="Please provide a reason for editing this attendance record..."
                        required
                      />
                      <Form.Text className="text-muted">
                        This reason will be logged for audit purposes
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Additional Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    placeholder="Any additional notes about this attendance record..."
                  />
                </Form.Group>

                <div className="alert alert-info">
                  <small>
                    <strong>Note:</strong> Editing attendance records will be tracked for audit purposes. 
                    The original status was <strong>{editingAttendance.status}</strong> and any changes 
                    will be logged with your user information and timestamp.
                  </small>
                </div>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveEdit}
            disabled={!editForm.clockIn || !editForm.status || !editForm.reason.trim()}
          >
            💾 Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Break Details Modal */}
      <Modal 
        show={showBreakDetailsModal} 
        onHide={() => setShowBreakDetailsModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            ⏸️ Break Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBreakDetails && (
            <>
              <div className="mb-3 p-3 bg-light rounded">
                <h6 className="mb-2">Employee Information</h6>
                <p className="mb-1"><strong>Name:</strong> {selectedBreakDetails.employeeName}</p>
                <p className="mb-0"><strong>Date:</strong> {formatDate(selectedBreakDetails.date)}</p>
              </div>

              <div className="mb-3">
                <h6 className="mb-3">Break Periods</h6>
                {selectedBreakDetails.breaks && selectedBreakDetails.breaks.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {selectedBreakDetails.breaks.map((breakPeriod, index) => {
                      const isOngoing = breakPeriod.startTime && !breakPeriod.endTime;
                      const duration = breakPeriod.startTime && breakPeriod.endTime 
                        ? Math.round((new Date(breakPeriod.endTime) - new Date(breakPeriod.startTime)) / (1000 * 60))
                        : null;
                      
                      return (
                        <Card key={index} className={`border-${isOngoing ? 'warning' : 'secondary'}`}>
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="mb-1">
                                  Break {index + 1}
                                  {isOngoing && (
                                    <Badge bg="warning" className="ms-2 pulse-badge">
                                      Active
                                    </Badge>
                                  )}
                                </h6>
                                <div className="text-muted small">
                                  <div>
                                    <strong>Start:</strong> {formatTime(breakPeriod.startTime)}
                                  </div>
                                  <div>
                                    <strong>End:</strong> {breakPeriod.endTime ? formatTime(breakPeriod.endTime) : <span className="text-warning">Ongoing</span>}
                                  </div>
                                  {duration && (
                                    <div className="mt-1">
                                      <Badge bg="info">{duration} minutes</Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted">No breaks recorded</p>
                )}
              </div>

              <div className="p-3 bg-primary bg-opacity-10 rounded">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Total Break Time:</span>
                  <Badge bg="primary" className="fs-6">
                    {selectedBreakDetails.totalBreakTime} minutes
                  </Badge>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBreakDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit History Modal */}
      <Modal 
        show={showEditHistoryModal} 
        onHide={() => setShowEditHistoryModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-warning bg-opacity-10">
          <Modal.Title>
            ✏️ Edit History
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEditHistory && (
            <>
              <div className="mb-3 p-3 bg-light rounded">
                <h6 className="mb-2">Attendance Record Information</h6>
                <p className="mb-1"><strong>Employee:</strong> {selectedEditHistory.employeeName}</p>
                <p className="mb-1"><strong>Date:</strong> {formatDate(selectedEditHistory.date)}</p>
                <div className="d-flex align-items-center gap-2 mt-2">
                  <span><strong>Status Change:</strong></span>
                  {selectedEditHistory.originalStatus && (
                    <>
                      <Badge bg={getStatusVariant(selectedEditHistory.originalStatus)}>
                        {selectedEditHistory.originalStatus}
                      </Badge>
                      <span>→</span>
                    </>
                  )}
                  <Badge bg={getStatusVariant(selectedEditHistory.currentStatus)}>
                    {selectedEditHistory.currentStatus}
                  </Badge>
                </div>
              </div>

              <div className="mb-3">
                <h6 className="mb-3">Modification History</h6>
                {selectedEditHistory.modificationHistory && selectedEditHistory.modificationHistory.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {selectedEditHistory.modificationHistory.map((modification, index) => {
                      // For the first edit, show original status to new status
                      // For subsequent edits, show previous edit's new status to current edit's new status
                      let displayOldStatus = modification.changes?.oldStatus;
                      let displayNewStatus = modification.changes?.newStatus;
                      
                      // If this is the first modification and we have originalStatus, use it
                      if (index === 0 && selectedEditHistory.originalStatus) {
                        displayOldStatus = selectedEditHistory.originalStatus;
                      }
                      
                      return (
                        <Card key={index} className="border-warning">
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="mb-0">
                                Edit #{index + 1}
                              </h6>
                              <Badge bg="secondary">
                                {formatDateTime(modification.modifiedAt)}
                              </Badge>
                            </div>
                            
                            <div className="mb-2">
                              <small className="text-muted">
                                <strong>Modified by:</strong> {modification.modifiedBy?.name || modification.modifiedBy || 'Unknown'}
                              </small>
                            </div>

                            <div className="mb-2 p-2 bg-warning bg-opacity-10 rounded">
                              <strong>Reason:</strong>
                              <p className="mb-0 mt-1">{modification.reason}</p>
                            </div>

                            {modification.changes && (
                              <div className="mt-2">
                                <small className="text-muted"><strong>Changes Made:</strong></small>
                                <div className="mt-1 small">
                                  {displayOldStatus && displayNewStatus && displayOldStatus !== displayNewStatus && (
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                      <span>Status:</span>
                                      <Badge bg={getStatusVariant(displayOldStatus)} className="small">
                                        {displayOldStatus}
                                      </Badge>
                                      <span>→</span>
                                      <Badge bg={getStatusVariant(displayNewStatus)} className="small">
                                        {displayNewStatus}
                                      </Badge>
                                    </div>
                                  )}
                                  {modification.changes.oldClockIn && modification.changes.newClockIn && 
                                   new Date(modification.changes.oldClockIn).getTime() !== new Date(modification.changes.newClockIn).getTime() && (
                                    <div className="mb-1">
                                      <span>Clock In: </span>
                                      <span className="text-decoration-line-through text-muted">
                                        {formatTime(modification.changes.oldClockIn)}
                                      </span>
                                      <span> → </span>
                                      <span className="fw-semibold">
                                        {formatTime(modification.changes.newClockIn)}
                                      </span>
                                    </div>
                                  )}
                                  {modification.changes.oldClockOut && modification.changes.newClockOut && 
                                   new Date(modification.changes.oldClockOut).getTime() !== new Date(modification.changes.newClockOut).getTime() && (
                                    <div className="mb-1">
                                      <span>Clock Out: </span>
                                      <span className="text-decoration-line-through text-muted">
                                        {formatTime(modification.changes.oldClockOut)}
                                      </span>
                                      <span> → </span>
                                      <span className="fw-semibold">
                                        {formatTime(modification.changes.newClockOut)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted">No modification history available</p>
                )}
              </div>

              <div className="alert alert-info mb-0">
                <small>
                  <strong>Note:</strong> All modifications are tracked for audit purposes. 
                  This record has been manually edited {selectedEditHistory.modificationHistory?.length || 0} time(s).
                </small>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditHistoryModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
    </>
  );
};

export default AttendanceTracking;
