import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Button,
} from "react-bootstrap";
import {
  FaUsers,
  FaCalendarAlt,
  FaClock,
  FaBuilding,
  FaEye,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/dashboard/StatCard";
import RecentActivity from "../../components/dashboard/RecentActivity";
import QuickActions from "../../components/dashboard/QuickActions";
import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../api/userApi";
import { leaveApi } from "../../api/leaveApi";
import { attendanceApi } from "../../api/attendanceApi";
import { departmentApi } from "../../api/departmentApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import { toast } from "react-toastify";

const HRDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    employees: 0,
    pendingLeaves: 0,
    presentToday: 0,
    departments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch users data
      const usersRes = await userApi.getAllUsers();
      // Fetch leave data
      const leaveRes = await leaveApi.getAllLeaves("pending");
      // Fetch attendance data
      const attendanceRes = await attendanceApi.getAllAttendance();
      // Fetch department data
      const departmentRes = await departmentApi.getAllDepartments();

      setStats({
        employees:
          usersRes.data?.filter((u) => u.role === "employee").length || 0,
        pendingLeaves: leaveRes.data?.length || 0,
        presentToday:
          attendanceRes.data?.filter((a) => a.status === "present").length || 0,
        departments: departmentRes.data?.length || 0,
      });

      // Set pending leaves for table
      setPendingLeaves(leaveRes.data?.slice(0, 5) || []);

      // Set recent activities
      const activities = [];
      if (leaveRes.data?.length > 0) {
        activities.push({
          description: `New leave request from ${
            leaveRes.data[0].employee?.name || "Employee"
          }`,
          date: leaveRes.data[0].createdAt || new Date(),
          type: "warning",
          status: "Pending",
        });
      }
      if (attendanceRes.data?.length > 0) {
        const presentCount = attendanceRes.data.filter(
          (a) => a.status === "present"
        ).length;
        activities.push({
          description: `${presentCount} employees clocked in today`,
          date: new Date(),
          type: "success",
          status: "Present",
        });
      }
      setRecentActivities(activities);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      label: "Approve Leaves",
      icon: <FaCalendarAlt />,
      path: "/leaves/requests",
      variant: "primary",
    },
    {
      label: "View Attendance",
      icon: <FaClock />,
      path: "/attendance/tracking",
      variant: "success",
    },
    {
      label: "Manage Employees",
      icon: <FaUsers />,
      path: "/users",
      variant: "info",
    },
    {
      label: "Manage Departments",
      icon: <FaBuilding />,
      path: "/departments",
      variant: "warning",
    },
  ];

  const handleApproveLeave = async (id) => {
    try {
      await leaveApi.approveLeave(id);
      toast.success("Leave approved successfully");
      fetchDashboardData();
    } catch (error) {
      toast.error("Failed to approve leave");
    }
  };

  return (
    <Container fluid>
      <div className="mb-4">
        <h2>HR Dashboard</h2>
        <p className="text-muted">Manage your workforce efficiently.</p>
      </div>

      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <StatCard
            title="Total Employees"
            value={stats.employees}
            icon={<FaUsers />}
            bgColor="primary"
            trend={5}
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Pending Leave Requests"
            value={stats.pendingLeaves}
            icon={<FaCalendarAlt />}
            bgColor="warning"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Present Today"
            value={stats.presentToday}
            icon={<FaClock />}
            bgColor="success"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Departments"
            value={stats.departments}
            icon={<FaBuilding />}
            bgColor="info"
          />
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={6}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Pending Leave Requests</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : (
                <Table responsive hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLeaves.length > 0 ? (
                      pendingLeaves.map((leave) => (
                        <tr key={leave._id}>
                          <td>{leave.employee?.name || "N/A"}</td>
                          <td className="text-capitalize">{leave.leaveType}</td>
                          <td>{formatDate(leave.startDate)}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => handleApproveLeave(leave._id)}
                            >
                              <FaEye className="me-1" /> View
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-3 text-muted">
                          No pending leave requests
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Row className="g-4">
            <Col lg={12}>
              <RecentActivity activities={recentActivities} />
            </Col>
            <Col lg={12}>
              <QuickActions actions={quickActions} />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default HRDashboard;
