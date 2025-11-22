import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  DataTable,
  SearchBar,
  FilterDropdown,
  ConfirmDialog,
  StatusBadge,
} from "../../components/shared";
import { subscriptionAPI, planAPI } from "../../services/api";
import { useCompany } from "../../context/CompanyContext";
import { useNavigate } from "react-router-dom";

const SubscriptionManagement = () => {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    client: "",
    plan: "",
    billingCycle: "monthly",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    autoRenew: true,
    status: "active",
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
    fetchClients();
  }, [selectedCompany]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getAll({ company: selectedCompany });
      setSubscriptions(response.data || []);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to fetch subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await planAPI.getAll({ 
        company: selectedCompany,
        isActive: true 
      });
      setPlans(response.data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to fetch plans");
    }
  };

  const fetchClients = async () => {
    try {
      // Assuming you have a clientAPI
      const response = await fetch(`/api/clients?company=${selectedCompany}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to fetch clients");
    }
  };

  const handleShowModal = (subscription = null) => {
    if (subscription) {
      setEditMode(true);
      setCurrentSubscription(subscription);
      setFormData({
        client: subscription.client?._id || subscription.client || "",
        plan: subscription.plan?._id || subscription.plan || "",
        billingCycle: subscription.billingCycle || "monthly",
        startDate: subscription.startDate
          ? new Date(subscription.startDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        endDate: subscription.endDate
          ? new Date(subscription.endDate).toISOString().split("T")[0]
          : "",
        autoRenew: subscription.autoRenew !== false,
        status: subscription.status || "active",
      });
    } else {
      setEditMode(false);
      setCurrentSubscription(null);
      setFormData({
        client: "",
        plan: "",
        billingCycle: "monthly",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        autoRenew: true,
        status: "active",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentSubscription(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client) {
      toast.error("Please select a client");
      return;
    }

    if (!formData.plan) {
      toast.error("Please select a plan");
      return;
    }

    const subscriptionData = {
      clientId: formData.client,
      planId: formData.plan,
      company: selectedCompany,
      billingCycle: formData.billingCycle,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      autoRenew: formData.autoRenew,
      status: formData.status,
    };

    console.log("Submitting subscription data:", subscriptionData);

    try {
      if (editMode) {
        await subscriptionAPI.update(currentSubscription._id, subscriptionData);
        toast.success("Subscription updated successfully");
      } else {
        await subscriptionAPI.create(subscriptionData);
        toast.success("Subscription created successfully");
      }
      handleCloseModal();
      fetchSubscriptions();
    } catch (error) {
      console.error("Error saving subscription:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to save subscription";
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (subscription) => {
    setSubscriptionToDelete(subscription);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await subscriptionAPI.delete(subscriptionToDelete._id);
      toast.success("Subscription deleted successfully");
      setShowDeleteDialog(false);
      fetchSubscriptions();
    } catch (error) {
      console.error("Error deleting subscription:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete subscription"
      );
    } finally {
      setDeleting(false);
    }
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesSearch =
      subscription.subscriptionNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      subscription.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || subscription.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Table columns
  const columns = [
    { key: "subscriptionNumber", label: "Subscription #" },
    {
      key: "client",
      label: "Client",
      render: (_, subscription) => subscription.client?.name || "N/A",
      sortable: false,
    },
    {
      key: "plan",
      label: "Plan",
      render: (_, subscription) => subscription.planSnapshot?.name || "N/A",
      sortable: false,
    },
    { key: "billingCycle", label: "Billing Cycle" },
    {
      key: "totalAmount",
      label: "Amount",
      render: (value) => `₹${value?.toLocaleString("en-IN")}`,
    },
    {
      key: "startDate",
      label: "Start Date",
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, subscription) => (
        <div className="btn-group" role="group">
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => handleShowModal(subscription)}
            title="Edit"
          >
            <FaEdit />
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => handleDeleteClick(subscription)}
            title="Delete"
          >
            <FaTrash />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Subscription Management</h2>
          <p className="text-muted">
            Managing subscriptions for: <strong>{selectedCompany}</strong>
          </p>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => handleShowModal()}>
            <FaPlus className="me-2" />
            Create Subscription
          </Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <SearchBar
            placeholder="Search subscriptions..."
            onSearch={setSearchTerm}
          />
        </Col>
        <Col md={3}>
          <FilterDropdown
            label="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "expired", label: "Expired" },
              { value: "cancelled", label: "Cancelled" },
              { value: "suspended", label: "Suspended" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
          />
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable
            columns={columns}
            data={filteredSubscriptions}
            loading={loading}
            emptyMessage="No subscriptions found. Create your first subscription to get started."
            initialItemsPerPage={20}
          />
        </Card.Body>
      </Card>

      {/* Create/Edit Subscription Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? "Edit Subscription" : "Create New Subscription"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Client *</Form.Label>
                  <Form.Select
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      {clients.length === 0
                        ? "No clients available"
                        : "Select client"}
                    </option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>
                        {client.name}
                      </option>
                    ))}
                  </Form.Select>
                  {clients.length === 0 && (
                    <Form.Text className="text-danger">
                      No clients found. Please create a client first.
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Plan *</Form.Label>
                  <Form.Select
                    name="plan"
                    value={formData.plan}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      {plans.length === 0 ? "No plans available" : "Select plan"}
                    </option>
                    {plans.map((plan) => (
                      <option key={plan._id} value={plan._id}>
                        {plan.name} - ₹{plan.finalPrice?.toLocaleString("en-IN")}
                      </option>
                    ))}
                  </Form.Select>
                  {plans.length === 0 && (
                    <Form.Text className="text-danger">
                      No plans found. Please create a plan first.
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Billing Cycle *</Form.Label>
                  <Form.Select
                    name="billingCycle"
                    value={formData.billingCycle}
                    onChange={handleChange}
                    required
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half-yearly">Half-Yearly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-Time</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                  />
                  <Form.Text className="text-muted">
                    Leave empty for ongoing subscription
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status *</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="suspended">Suspended</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="autoRenew"
                    label="Auto-renew subscription"
                    checked={formData.autoRenew}
                    onChange={handleChange}
                    className="mt-4"
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
              {editMode ? "Update Subscription" : "Create Subscription"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        show={showDeleteDialog}
        title="Delete Subscription"
        message={`Are you sure you want to delete subscription ${subscriptionToDelete?.subscriptionNumber}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </Container>
  );
};

export default SubscriptionManagement;
