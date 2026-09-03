import { useState, useEffect, useCallback } from "react";
import { Card, Row, Col, Button, Spinner, Table, Badge } from "react-bootstrap";
import { FaChartBar, FaDownload, FaUsers, FaCalendarAlt, FaClock } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../api/userApi";
import { leaveApi } from "../../api/leaveApi";
import { attendanceApi } from "../../api/attendanceApi";
import { departmentApi } from "../../api/departmentApi";
import toast from "../../utils/toast";

const EMPTY_ANALYTICS = {
  headcountByDept: [],
  genderDiversity: { male: 0, female: 0, other: 0 },
  ageDistribution: { "18-25": 0, "26-35": 0, "36-45": 0, "46+": 0 },
  leaveStats: { approved: 0, pending: 0, rejected: 0 },
  attendanceRate: 0,
};

const formatDateIST = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeArrayResponse = (response, keys = []) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }
  return [];
};

/**
 * Build report metrics from an employee list.
 * @param {Array<object>} employees
 * @param {Array<object>} leaves
 * @param {Array<object>} attendance
 * @param {{ groupBy?: 'department' | 'role', groupLabel?: string }} options
 */
const buildAnalyticsFromEmployees = (employees, leaves, attendance, options = {}) => {
  const { groupBy = "department" } = options;
  const groupCount = {};

  employees.forEach((emp) => {
    const key =
      groupBy === "role"
        ? emp.role || "Unknown"
        : emp.department?.name || "Unassigned";
    groupCount[key] = (groupCount[key] || 0) + 1;
  });

  const headcountByDept = Object.entries(groupCount).map(([name, count]) => ({
    name,
    count,
  }));

  const genderCount = { male: 0, female: 0, other: 0 };
  employees.forEach((emp) => {
    const gender = emp.gender?.toLowerCase();
    if (gender === "male") genderCount.male++;
    else if (gender === "female") genderCount.female++;
    else if (gender === "other" || gender === "prefer-not-to-say") genderCount.other++;
  });

  const ageCount = { "18-25": 0, "26-35": 0, "36-45": 0, "46+": 0 };
  employees.forEach((emp) => {
    if (!emp.dateOfBirth) return;
    const birthDate = new Date(emp.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age >= 18 && age <= 25) ageCount["18-25"]++;
    else if (age >= 26 && age <= 35) ageCount["26-35"]++;
    else if (age >= 36 && age <= 45) ageCount["36-45"]++;
    else if (age >= 46) ageCount["46+"]++;
  });

  const leaveStats = {
    approved: leaves.filter((l) => l.status === "approved").length,
    pending: leaves.filter((l) => l.status === "pending").length,
    rejected: leaves.filter((l) => l.status === "rejected").length,
  };

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendanceRate =
    attendance.length > 0 ? ((presentCount / attendance.length) * 100).toFixed(1) : 0;

  return {
    headcountByDept,
    genderDiversity: genderCount,
    ageDistribution: ageCount,
    leaveStats,
    attendanceRate,
  };
};

const ReportsAnalytics = () => {
  const { user } = useAuth();
  const isHoD = user?.role === "hod";
  const departmentId = user?.department?._id || user?.department || null;

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [headcountTitle, setHeadcountTitle] = useState("Headcount by Department");
  const [headcountColumnLabel, setHeadcountColumnLabel] = useState("Department");
  const [pageTitle, setPageTitle] = useState("Reports & Analytics");

  const fetchAttendance = async () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const params = {
      startDate: formatDateIST(thirtyDaysAgo),
      endDate: formatDateIST(today),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const attendanceRes = await attendanceApi.getAllAttendance(params);
      clearTimeout(timeoutId);
      return normalizeArrayResponse(attendanceRes, ["attendance"]);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.code !== "ECONNABORTED" && !error.message?.includes("timeout")) {
        console.error("[ReportsAnalytics] Error fetching attendance:", error.message);
        toast.warning("Could not fetch attendance data");
      }
      return [];
    }
  };

  const fetchLeaves = async () => {
    try {
      const leavesRes = await leaveApi.getAllLeaves({});
      return normalizeArrayResponse(leavesRes, ["leaves"]);
    } catch (error) {
      console.error("[ReportsAnalytics] Error fetching leaves:", error.message);
      toast.warning("Could not fetch leave data");
      return [];
    }
  };

  const fetchHoDAnalytics = useCallback(async () => {
    if (!departmentId) {
      toast.error("Your profile is missing a department assignment.");
      return EMPTY_ANALYTICS;
    }

    let employees = [];
    try {
      const deptAnalytics = await departmentApi.getDepartmentAnalytics(departmentId);
      employees = Array.isArray(deptAnalytics?.employees) ? deptAnalytics.employees : [];
      setPageTitle(`Department Reports & Analytics${deptAnalytics?.department?.name ? ` — ${deptAnalytics.department.name}` : ""}`);
      setHeadcountTitle("Headcount by Role");
      setHeadcountColumnLabel("Role");
    } catch (error) {
      console.error("[ReportsAnalytics] Error fetching department analytics:", error.message);
      toast.error(error.response?.data?.message || "Could not fetch department analytics");
    }

    const [leaves, attendance] = await Promise.all([fetchLeaves(), fetchAttendance()]);
    return buildAnalyticsFromEmployees(employees, leaves, attendance, { groupBy: "role" });
  }, [departmentId]);

  const fetchCompanyAnalytics = useCallback(async () => {
    setPageTitle("Reports & Analytics");
    setHeadcountTitle("Headcount by Department");
    setHeadcountColumnLabel("Department");

    let allUsers = [];
    try {
      const usersRes = await userApi.getAllUsers({ excludePast: true, limit: 1000 });
      allUsers = normalizeArrayResponse(usersRes, ["users"]);
    } catch (error) {
      console.error("[ReportsAnalytics] Error fetching users:", error.message);
      toast.warning("Could not fetch user data");
    }

    const employees =
      allUsers.filter(
        (u) =>
          u.role === "employee" ||
          u.role === "hod" ||
          u.role === "hr" ||
          u.role === "manager"
      ) || [];

    const [leaves, attendance] = await Promise.all([fetchLeaves(), fetchAttendance()]);
    return buildAnalyticsFromEmployees(employees, leaves, attendance, { groupBy: "department" });
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const result = isHoD ? await fetchHoDAnalytics() : await fetchCompanyAnalytics();
      setAnalytics(result);
    } catch (error) {
      console.error("[ReportsAnalytics] Error fetching analytics:", error);
      toast.error(
        "Failed to fetch analytics data: " + (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  }, [isHoD, fetchHoDAnalytics, fetchCompanyAnalytics]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportToCSV = (data, filename) => {
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
            {pageTitle}
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
            {isHoD && (
              <p className="text-muted small mb-4">
                Showing analytics for your department only — attendance, leave, and headcount
                data are scoped to your team.
              </p>
            )}

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

            <Row className="g-4">
              <Col lg={6}>
                <Card className="h-100">
                  <Card.Header className="bg-light">
                    <strong>{headcountTitle}</strong>
                  </Card.Header>
                  <Card.Body>
                    {analytics.headcountByDept.length === 0 ? (
                      <div className="text-center py-4 text-muted">
                        <FaUsers size={40} className="mb-3 opacity-50" />
                        <p className="mb-0">No headcount data available</p>
                      </div>
                    ) : (
                      <Table hover size="sm" className="mb-0">
                        <thead>
                          <tr>
                            <th>{headcountColumnLabel}</th>
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
                            const percentage =
                              total > 0 ? ((dept.count / total) * 100).toFixed(1) : 0;
                            return (
                              <tr key={dept.name}>
                                <td className="text-capitalize">{dept.name}</td>
                                <td className="text-end">
                                  <Badge bg="primary">{dept.count}</Badge>
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
