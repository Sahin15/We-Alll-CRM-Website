import { useState, useEffect } from "react";
import {
  Container,
  Card,
  Badge,
  Button,
  Form,
} from "react-bootstrap";
import { FaEye, FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { userApi } from "../../api/userApi";
import { getStatusVariant } from "../../utils/helpers";
import { ROLES } from "../../utils/constants";
import PageHeader from "../../components/shared/PageHeader";
import ResponsiveDataTable from "../../components/shared/ResponsiveDataTable";
import MobileModal from "../../components/shared/MobileModal";
import FormFieldStack from "../../components/shared/FormFieldStack";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [displayedUsers, setDisplayedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [displayCount, setDisplayCount] = useState(10);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    phone: "",
    position: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Update displayed users when count changes
    setDisplayedUsers(users.slice(0, displayCount));
  }, [users, displayCount]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getAllUsers();
      setUsers(response.data);
      setDisplayedUsers(response.data.slice(0, displayCount));
    } catch (error) {
      toast.error("Failed to fetch users");
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
      fetchUsers();
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
        fetchUsers();
      } catch (error) {
        toast.error("Failed to delete user");
      }
    }
  };

  const loadMore = () => {
    setDisplayCount((prev) => prev + 10);
  };

  const userColumns = [
    { key: "name", label: "Name", mobilePriority: 1 },
    { key: "email", label: "Email", mobilePriority: 2 },
    {
      key: "role",
      label: "Role",
      mobilePriority: 3,
      render: (_, row) => (
        <Badge bg="primary" className="text-capitalize">
          {row.role}
        </Badge>
      ),
    },
    {
      key: "department",
      label: "Department",
      hideOnMobile: true,
      render: (_, row) => row.department?.name || "N/A",
    },
    {
      key: "position",
      label: "Position",
      hideOnMobile: true,
      render: (_, row) => row.position || "N/A",
    },
    {
      key: "status",
      label: "Status",
      mobilePriority: 4,
      render: (_, row) => (
        <Badge bg={getStatusVariant(row.status || "active")}>
          {row.status || "active"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="d-flex gap-1 flex-wrap">
          <Button
            size="sm"
            variant="outline-primary"
            className="touch-target"
            onClick={() => navigate(`/users/${row._id}`)}
          >
            <FaEye />
          </Button>
          <Button
            size="sm"
            variant="outline-success"
            className="touch-target"
            onClick={() => handleShowModal(row)}
          >
            <FaEdit />
          </Button>
          {row.role !== "superadmin" && (
            <Button
              size="sm"
              variant="outline-danger"
              className="touch-target"
              onClick={() => handleDelete(row._id)}
            >
              <FaTrash />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Container fluid>
      <PageHeader
        title="User Management"
        subtitle="Manage all system users"
        actions={
          <Button variant="primary" className="touch-target" onClick={() => handleShowModal()}>
            <FaPlus className="me-2" />
            Add User
          </Button>
        }
      />

      <Card>
        <Card.Body>
          <ResponsiveDataTable
            columns={userColumns}
            data={displayedUsers}
            loading={loading}
            emptyMessage="No users found"
            paginated={false}
            keyField="_id"
          />

          {!loading && displayedUsers.length < users.length && (
            <div className="text-center mt-3">
              <Button variant="outline-primary" className="touch-target" onClick={loadMore}>
                Load More ({users.length - displayedUsers.length} remaining)
              </Button>
            </div>
          )}

          {!loading && (
            <div className="text-muted text-center mt-3">
              Showing {displayedUsers.length} of {users.length} users
            </div>
          )}
        </Card.Body>
      </Card>

      <MobileModal
        show={showModal}
        onHide={handleCloseModal}
        title={editMode ? "Edit User" : "Add New User"}
        footer={
          <>
            <Button variant="secondary" className="touch-target" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" className="touch-target" type="submit" form="user-form">
              {editMode ? "Update User" : "Create User"}
            </Button>
          </>
        }
      >
        <Form id="user-form" onSubmit={handleSubmit}>
          <FormFieldStack md={6}>
            <Form.Group>
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
            <Form.Group>
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
            <Form.Group>
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
            <Form.Group>
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
            <Form.Group>
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Position</Form.Label>
              <Form.Control
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="Enter position"
              />
            </Form.Group>
          </FormFieldStack>
        </Form>
      </MobileModal>
    </Container>
  );
};

export default UserList;
