import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Badge,
} from "react-bootstrap";
import {
  FaUsers,
  FaProjectDiagram,
  FaUserTie,
  FaChartLine,
  FaPlus,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import toast from "../../utils/toast";
import StatCard from "../../components/dashboard/StatCard";
import QuickActions from "../../components/dashboard/QuickActions";
import GreetingBanner from "../../components/common/GreetingBanner";
import { userApi } from "../../api/userApi";
import { projectApi } from "../../api/projectApi";
import { clientApi } from "../../api/clientApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import { ROLES } from "../../utils/constants";

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    projects: 0,
    clients: 0,
    revenue: 0,
  });
  const [users, setUsers] = useState([]);
  const [displayedUsers, setDisplayedUsers] = useState([]);
  const [displayCount, setDisplayCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    phone: "",
    position: "",
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Update displayed users when count changes
    setDisplayedUsers(users.slice(0, displayCount));
  }, [users, displayCount]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const usersRes = await userApi.getAllUsers();
      const projectRes = await projectApi.getAllProjects();
      const clientRes = await clientApi.getAllClients();

      setUsers(usersRes.data || []);
      setDisplayedUsers((usersRes.data || []).slice(0, displayCount));
      setStats({
        users: usersRes.data?.length || 0,
        projects: projectRes.data?.length || 0,
        clients: clientRes.data?.length || 0,
        revenue: 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (user = null) => {
    if (user) {
      setEditMode(true);
      setCurrentUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        phone: user.phone || "",
        position: user.position || "",
      });
    } else {
      setEditMode(false);
      setCurrentUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "employee",
        phone: "",
        position: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "employee",
      phone: "",
      position: "",
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        // For update, only send password if it's changed
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await userApi.updateUser(currentUser._id, updateData);
        toast.success("User updated successfully");
      } else {
        await userApi.createUser(formData);
        toast.success("User created successfully");
      }
      handleCloseModal();
      fetchDashboardData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${editMode ? "update" : "create"} user`
      );
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await userApi.deleteUser(id);
        toast.success("User deleted successfully");
        fetchDashboardData();
      } catch (error) {
        toast.error("Failed to delete user");
      }
    }
  };

  const loadMore = () => {
    setDisplayCount((prev) => prev + 10);
  };

  const quickActions = [
    {
      label: "Add User",
      icon: <FaPlus />,
      onClick: () => handleShowModal(),
      variant: "primary",
    },
    {
      label: "Manage Users",
      icon: <FaUsers />,
      path: "/users",
      variant: "info",
    },
    {
      label: "View Projects",
      icon: <FaProjectDiagram />,
      path: "/projects",
      variant: "success",
    },
    {
      label: "View Clients",
      icon: <FaUserTie />,
      path: "/clients",
      variant: "warning",
    },
  ];

  return (
    <Container fluid className="py-4">
      <GreetingBanner subtitle="Complete system overview and management" />

      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <StatCard
            title="Total Users"
            value={stats.users}
            icon={<FaUsers />}
            bgColor="primary"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Active Projects"
            value={stats.projects}
            icon={<FaProjectDiagram />}
            bgColor="success"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Total Clients"
            value={stats.clients}
            icon={<FaUserTie />}
            bgColor="info"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Revenue"
            value={`$${stats.revenue.toLocaleString()}`}
            icon={<FaChartLine />}
            bgColor="warning"
          />
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Users</h5>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleShowModal()}
              >
                <FaPlus className="me-1" /> Add User
              </Button>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : (
                <>
                  <Table responsive hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedUsers.map((user) => (
                        <tr key={user._id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            <Badge bg="primary" className="text-capitalize">
                              {user.role}
                            </Badge>
                          </td>
                          <td>
                            <Badge
                              bg={getStatusVariant(user.status || "active")}
                            >
                              {user.status || "active"}
                            </Badge>
                          </td>
                          <td>
                            <div className="btn-group" role="group">
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleShowModal(user)}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(user._id)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Load More Button */}
                  {displayedUsers.length < users.length && (
                    <div className="text-center mt-3">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={loadMore}
                      >
                        Load More ({users.length - displayedUsers.length}{" "}
                        remaining)
                      </Button>
                    </div>
                  )}

                  {/* Total Count */}
                  <div className="text-muted text-center mt-2">
                    <small>
                      Showing {displayedUsers.length} of {users.length} users
                    </small>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <QuickActions actions={quickActions} />
        </Col>
      </Row>

      {/* Add/Edit User Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? "Edit User" : "Add New User"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter full name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="user@example.com"
                    disabled={editMode}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Password {editMode && "(leave blank to keep current)"}
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!editMode}
                    placeholder="Enter password"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role *</Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    {Object.entries(ROLES).map(([key, value]) => (
                      <option key={value} value={value}>
                        {key}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Position</Form.Label>
                  <Form.Control
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="Enter position"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editMode ? "Update User" : "Create User"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default SuperAdminDashboard;
