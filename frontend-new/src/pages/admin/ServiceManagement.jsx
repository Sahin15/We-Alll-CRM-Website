import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Modal, Form } from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  DataTable,
  SearchBar,
  FilterDropdown,
  ConfirmDialog,
  StatusBadge,
} from "../../components/shared";
import { serviceAPI } from "../../services/api";
import { useCompany } from "../../context/CompanyContext";

const ServiceManagement = () => {
  const { selectedCompany } = useCompany();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  
  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    basePrice: "",
    allowedBillingCycles: ["monthly"],
    features: [""],
    specifications: {
      deliveryTime: "",
      revisions: "",
      supportType: "",
      teamSize: "",
    },
    tags: [],
    isPopular: false,
  });

  useEffect(() => {
    fetchServices();
  }, [selectedCompany]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await serviceAPI.getAll({ company: selectedCompany });
      setServices(response.data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to fetch services");
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (service = null) => {
    if (service) {
      setEditMode(true);
      setCurrentService(service);
      setFormData({
        name: service.name || "",
        category: service.category || "",
        description: service.description || "",
        basePrice: service.basePrice || "",
        allowedBillingCycles: service.allowedBillingCycles || ["monthly"],
        features: service.features?.length > 0 ? service.features : [""],
        specifications: service.specifications || {
          deliveryTime: "",
          revisions: "",
          supportType: "",
          teamSize: "",
        },
        tags: service.tags || [],
        isPopular: service.isPopular || false,
      });
    } else {
      setEditMode(false);
      setCurrentService(null);
      setFormData({
        name: "",
        category: "",
        description: "",
        basePrice: "",
        allowedBillingCycles: ["monthly"],
        features: [""],
        specifications: {
          deliveryTime: "",
          revisions: "",
          supportType: "",
          teamSize: "",
        },
        tags: [],
        isPopular: false,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentService(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSpecificationChange = (field, value) => {
    setFormData({
      ...formData,
      specifications: {
        ...formData.specifications,
        [field]: value,
      },
    });
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ""] });
  };

  const removeFeature = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const handleBillingCycleChange = (cycle) => {
    const cycles = formData.allowedBillingCycles.includes(cycle)
      ? formData.allowedBillingCycles.filter((c) => c !== cycle)
      : [...formData.allowedBillingCycles, cycle];
    setFormData({ ...formData, allowedBillingCycles: cycles });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filter out empty features
    const cleanedFeatures = formData.features.filter((f) => f.trim() !== "");
    
    const serviceData = {
      ...formData,
      features: cleanedFeatures,
      company: selectedCompany,
      basePrice: Number(formData.basePrice),
    };

    try {
      if (editMode) {
        await serviceAPI.update(currentService._id, serviceData);
        toast.success("Service updated successfully");
      } else {
        await serviceAPI.create(serviceData);
        toast.success("Service created successfully");
      }
      handleCloseModal();
      fetchServices();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error(error.response?.data?.message || "Failed to save service");
    }
  };

  const handleDeleteClick = (service) => {
    setServiceToDelete(service);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await serviceAPI.delete(serviceToDelete._id);
      toast.success("Service deleted successfully");
      setShowDeleteDialog(false);
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete service"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (service) => {
    try {
      await serviceAPI.toggleStatus(service._id);
      toast.success(
        `Service ${service.isActive ? "deactivated" : "activated"} successfully`
      );
      fetchServices();
    } catch (error) {
      console.error("Error toggling service status:", error);
      toast.error("Failed to toggle service status");
    }
  };

  // Get unique categories for filter
  const categories = [...new Set(services.map((s) => s.category))].filter(Boolean);

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || service.category === categoryFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" && service.isActive) ||
      (statusFilter === "inactive" && !service.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Table columns
  const columns = [
    { key: "name", label: "Service Name" },
    { key: "category", label: "Category" },
    {
      key: "basePrice",
      label: "Base Price",
      render: (value) => `₹${value?.toLocaleString("en-IN")}`,
    },
    {
      key: "allowedBillingCycles",
      label: "Billing Cycles",
      render: (value) => value?.join(", ") || "N/A",
      sortable: false,
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => (
        <StatusBadge status={value ? "active" : "inactive"} />
      ),
    },
    {
      key: "isPopular",
      label: "Popular",
      render: (value) => (value ? "⭐ Yes" : "No"),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, service) => (
        <div className="btn-group" role="group">
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => handleShowModal(service)}
            title="Edit"
          >
            <FaEdit />
          </Button>
          <Button
            size="sm"
            variant={service.isActive ? "outline-warning" : "outline-success"}
            onClick={() => handleToggleStatus(service)}
            title={service.isActive ? "Deactivate" : "Activate"}
          >
            {service.isActive ? <FaToggleOff /> : <FaToggleOn />}
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => handleDeleteClick(service)}
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
          <h2>Service Management</h2>
          <p className="text-muted">
            Managing services for: <strong>{selectedCompany}</strong>
          </p>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => handleShowModal()}>
            <FaPlus className="me-2" />
            Add Service
          </Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <SearchBar
            placeholder="Search services..."
            onSearch={setSearchTerm}
          />
        </Col>
        <Col md={3}>
          <FilterDropdown
            label="Category"
            options={categories.map((cat) => ({ value: cat, label: cat }))}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All Categories"
          />
        </Col>
        <Col md={3}>
          <FilterDropdown
            label="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
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
            data={filteredServices}
            loading={loading}
            emptyMessage="No services found. Create your first service to get started."
            initialItemsPerPage={20}
          />
        </Card.Body>
      </Card>

      {/* Add/Edit Service Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? "Edit Service" : "Add New Service"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Service Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., SEO Optimization"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category *</Form.Label>
                  <Form.Control
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    placeholder="e.g., SEO, Social Media, PPC"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the service..."
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Base Price (₹) *</Form.Label>
                  <Form.Control
                    type="number"
                    name="basePrice"
                    value={formData.basePrice}
                    onChange={handleChange}
                    required
                    min="0"
                    placeholder="5000"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Allowed Billing Cycles *</Form.Label>
                  <div>
                    {["monthly", "quarterly", "half-yearly", "yearly", "one-time"].map(
                      (cycle) => (
                        <Form.Check
                          key={cycle}
                          inline
                          type="checkbox"
                          label={cycle}
                          checked={formData.allowedBillingCycles.includes(cycle)}
                          onChange={() => handleBillingCycleChange(cycle)}
                        />
                      )
                    )}
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Features</Form.Label>
              {formData.features.map((feature, index) => (
                <div key={index} className="d-flex gap-2 mb-2">
                  <Form.Control
                    type="text"
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    placeholder="Enter feature"
                  />
                  {formData.features.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeFeature(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline-primary" size="sm" onClick={addFeature}>
                + Add Feature
              </Button>
            </Form.Group>

            <h6 className="mt-4 mb-3">Specifications</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Delivery Time</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.specifications.deliveryTime}
                    onChange={(e) =>
                      handleSpecificationChange("deliveryTime", e.target.value)
                    }
                    placeholder="e.g., 7-10 days"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Revisions</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.specifications.revisions}
                    onChange={(e) =>
                      handleSpecificationChange("revisions", e.target.value)
                    }
                    placeholder="e.g., 3"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Support Type</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.specifications.supportType}
                    onChange={(e) =>
                      handleSpecificationChange("supportType", e.target.value)
                    }
                    placeholder="e.g., Email & Phone"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Team Size</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.specifications.teamSize}
                    onChange={(e) =>
                      handleSpecificationChange("teamSize", e.target.value)
                    }
                    placeholder="e.g., 1 dedicated specialist"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="isPopular"
                label="Mark as Popular Service"
                checked={formData.isPopular}
                onChange={handleChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editMode ? "Update Service" : "Create Service"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        show={showDeleteDialog}
        onHide={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Service"
        message={`Are you sure you want to delete "${serviceToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </Container>
  );
};

export default ServiceManagement;
