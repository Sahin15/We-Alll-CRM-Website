import { useState, useEffect } from "react";
import { Card, Row, Col, Button, Spinner, Table, Badge } from "react-bootstrap";
import { FaChartBar, FaDownload, FaUsers, FaCalendarAlt, FaClock } from "react-icons/fa";
import { userApi } from "../../api/userApi";
import { leaveApi } from "../../api/leaveApi";
import { attendanceApi } from "../../api/attendanceApi";
import toast from "../../utils/toast";

const ReportsAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    headcountByDept: [],
    genderDiversity: { male: 0, female: 0, other: 0 },
    ageDistribution: { "18-25": 0, "26-35": 0, "36-45": 0, "46+": 0 },
    leaveStats: { approved: 0, pending: 0, rejected: 0 },
    attendanceRate: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all data with individual error handling
      let usersRes = { data: [] };
      let leavesRes = { data: [] };
      let attendanceRes = { data: [] };

      try {
        usersRes = await userApi.getAllUsers({ excludePast: true, limit: 1000 });
      } catch (error) {
        console.error('[ReportsAnalytics] Error fetching users:', error.message);
        toast.warning('Could not fetch user data');
      }

      try {
        leavesRes = await leaveApi.getAllLeaves({});
      } catch (error) {
        console.error('[ReportsAnalytics] Error fetching leaves:', error.message);
        toast.warning('Could not fetch leave data');
      }

      try {
        // Fetch attendance data for the last 30 days to avoid timeout
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const formatDateIST = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        const params = {
          startDate: formatDateIST(thirtyDaysAgo),
          endDate: formatDateIST(today)
        };
        
        // Set a timeout for the attendance request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
          attendanceRes = await attendanceApi.getAllAttendance(params);
          clearTimeout(timeoutId);
        } catch (timeoutError) {
          clearTimeout(timeoutId);
          if (timeoutError.code === 'ECONNABORTED') {
            console.warn('[ReportsAnalytics] Attendance request timeout, using empty data');
            attendanceRes = { data: [] };
          } else {
            throw timeoutError;
          }
        }
      } catch (error) {
        console.error('[ReportsAnalytics] Error fetching attendance:', error.message);
        // Don't show warning for timeout, just use empty data
        if (error.message && !error.message.includes('timeout')) {
          toast.warning('Could not fetch attendance data');
        }
        attendanceRes = { data: [] };
      }

      // Handle different response formats
      let allUsers = [];
      if (Array.isArray(usersRes.data)) {
        allUsers = usersRes.data;
      } else if (Array.isArray(usersRes)) {
        allUsers = usersRes;
      } else if (usersRes.users && Array.isArray(usersRes.users)) {
        allUsers = usersRes.users;
      }

      let allLeaves = [];
      if (Array.isArray(leavesRes.data)) {
        allLeaves = leavesRes.data;
      } else if (Array.isArray(leavesRes)) {
        allLeaves = leavesRes;
      } else if (leavesRes.leaves && Array.isArray(leavesRes.leaves)) {
        allLeaves = leavesRes.leaves;
      }

      let allAttendance = [];
      if (Array.isArray(attendanceRes.data)) {
        allAttendance = attendanceRes.data;
      } else if (Array.isArray(attendanceRes)) {
        allAttendance = attendanceRes;
      } else if (attendanceRes.attendance && Array.isArray(attendanceRes.attendance)) {
        allAttendance = attendanceRes.attendance;
      }

      const employees = allUsers.filter((u) => u.role === "employee" || u.role === "hod" || u.role === "hr" || u.role === "manager") || [];
      const leaves = allLeaves || [];
      const attendance = allAttendance || [];

      // Headcount by Department
      const deptCount = {};
      employees.forEach((emp) => {
        const dept = emp.department?.name || "Unassigned";
        deptCount[dept] = (deptCount[dept] || 0) + 1;
      });
      const headcountByDept = Object.entries(deptCount).map(([name, count]) => ({
        name,
        count,
      }));

      // Gender Diversity
      const genderCount = { male: 0, female: 0, other: 0 };
      
      employees.forEach((emp) => {
        const gender = emp.gender?.toLowerCase();
        
        if (gender === "male") {
          genderCount.male++;
        } else if (gender === "female") {
          genderCount.female++;
        } else if (gender === "other" || gender === "prefer-not-to-say") {
          genderCount.other++;
        }
      });

      // Age Distribution
      const ageCount = { "18-25": 0, "26-35": 0, "36-45": 0, "46+": 0 };
      employees.forEach((emp) => {
        if (emp.dateOfBirth) {
          const birthDate = new Date(emp.dateOfBirth);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          
          // Adjust age if birthday hasn't occurred this year yet
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          // Only count valid ages (18+)
          if (age >= 18 && age <= 25) ageCount["18-25"]++;
          else if (age >= 26 && age <= 35) ageCount["26-35"]++;
          else if (age >= 36 && age <= 45) ageCount["36-45"]++;
          else if (age >= 46) ageCount["46+"]++;
        }
      });

      // Leave Stats
      const leaveStats = {
        approved: leaves.filter((l) => l.status === "approved").length,
        pending: leaves.filter((l) => l.status === "pending").length,
        rejected: leaves.filter((l) => l.status === "rejected").length,
      };

      // Attendance Rate
      const presentCount = attendance.filter((a) => a.status === "present").length;
      const attendanceRate = attendance.length > 0
        ? ((presentCount / attendance.length) * 100).toFixed(1)
        : 0;

      setAnalytics({
        headcountByDept,
        genderDiversity: genderCount,
        ageDistribution: ageCount,
        leaveStats,
        attendanceRate,
      });
    } catch (error) {
      console.error("[ReportsAnalytics] ❌ Error fetching analytics:", error);
      console.error("[ReportsAnalytics] Error message:", error.message);
      console.error("[ReportsAnalytics] Error response:", error.response?.data);
      toast.error("Failed to fetch analytics data: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data, filename) => {
    // Simple CSV export
    const csv = data.map((row) => Object.values(row).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    toast.success("Report exported successfully");
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaChartBar className="me-2 text-primary" />
            Reports & Analytics
          </h5>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => exportToCSV(analytics.headcountByDept, "headcount-report")}
          >
            <FaDownload className="me-1" />
            Export
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <Row className="g-3 mb-4">
              <Col md={4}>
                <Card className="border-start border-primary border-4 bg-light">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-muted">Attendance Rate</small>
                        <h3 className="mb-0">{analytics.attendanceRate}%</h3>
                      </div>
                      <FaClock size={30} className="text-primary opacity-50" />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="border-start border-success border-4 bg-light">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-muted">Approved Leaves</small>
                        <h3 className="mb-0">{analytics.leaveStats.approved}</h3>
                      </div>
                      <FaCalendarAlt size={30} className="text-success opacity-50" />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="border-start border-warning border-4 bg-light">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-muted">Pending Leaves</small>
                        <h3 className="mb-0">{analytics.leaveStats.pending}</h3>
                      </div>
                      <FaCalendarAlt size={30} className="text-warning opacity-50" />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Detailed Reports */}
            <Row className="g-4">
              {/* Headcount by Department */}
              <Col lg={6}>
                <Card className="h-100">
                  <Card.Header className="bg-light">
                    <strong>Headcount by Department</strong>
                  </Card.Header>
                  <Card.Body>
                    <Table hover size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Department</th>
                          <th className="text-end">Employees</th>
                          <th className="text-end">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.headcountByDept.map((dept) => {
                          const total = analytics.headcountByDept.reduce(
                            (sum, d) => sum + d.count,
                            0
                          );
                          const percentage = ((dept.count / total) * 100).toFixed(1);
                          return (
                            <tr key={dept.name}>
                              <td>{dept.name}</td>
                              <td className="text-end">
                                <Badge bg="primary">{dept.count}</Badge>
                              </td>
                              <td className="text-end">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>

              {/* Gender Diversity */}
              <Col lg={6}>
                <Card className="h-100">
                  <Card.Header className="bg-light">
                    <strong>Gender Diversity</strong>
                  </Card.Header>
                  <Card.Body>
                    {Object.values(analytics.genderDiversity).reduce((sum, c) => sum + c, 0) === 0 ? (
                      <div className="text-center py-4 text-muted">
                        <FaUsers size={40} className="mb-3 opacity-50" />
                        <p className="mb-0">No gender data available</p>
                        <small>Please update employee profiles to include gender information</small>
                      </div>
                    ) : (
                      <Table hover size="sm" className="mb-0">
                        <thead>
                          <tr>
                            <th>Gender</th>
                            <th className="text-end">Count</th>
                            <th className="text-end">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(analytics.genderDiversity).map(([gender, count]) => {
                            const total = Object.values(analytics.genderDiversity).reduce(
                              (sum, c) => sum + c,
                              0
                            );
                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                            return (
                              <tr key={gender}>
                                <td className="text-capitalize">{gender}</td>
                                <td className="text-end">
                                  <Badge bg="info">{count}</Badge>
                                </td>
                                <td className="text-end">{percentage}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Age Distribution */}
              <Col lg={6}>
                <Card className="h-100">
                  <Card.Header className="bg-light">
                    <strong>Age Distribution</strong>
                  </Card.Header>
                  <Card.Body>
                    <Table hover size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Age Group</th>
                          <th className="text-end">Count</th>
                          <th className="text-end">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(analytics.ageDistribution).map(([age, count]) => {
                          const total = Object.values(analytics.ageDistribution).reduce(
                            (sum, c) => sum + c,
                            0
                          );
                          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                          return (
                            <tr key={age}>
                              <td>{age}</td>
                              <td className="text-end">
                                <Badge bg="success">{count}</Badge>
                              </td>
                              <td className="text-end">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>

              {/* Leave Statistics */}
              <Col lg={6}>
                <Card className="h-100">
                  <Card.Header className="bg-light">
                    <strong>Leave Statistics</strong>
                  </Card.Header>
                  <Card.Body>
                    <Table hover size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th className="text-end">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Approved</td>
                          <td className="text-end">
                            <Badge bg="success">{analytics.leaveStats.approved}</Badge>
                          </td>
                        </tr>
                        <tr>
                          <td>Pending</td>
                          <td className="text-end">
                            <Badge bg="warning">{analytics.leaveStats.pending}</Badge>
                          </td>
                        </tr>
                        <tr>
                          <td>Rejected</td>
                          <td className="text-end">
                            <Badge bg="danger">{analytics.leaveStats.rejected}</Badge>
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default ReportsAnalytics;
