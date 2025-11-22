import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Modal,
  Form,
  ListGroup,
  Alert,
} from "react-bootstrap";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaToggleOn,
  FaToggleOff,
  FaStar,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  DataTable,
  SearchBar,
  FilterDropdown,
  ConfirmDialog,
  StatusBadge,
  LoadingSpinner,
} from "../../components/shared";
import { planAPI, serviceAPI } from "../../services/api";
import { useCompany } from "../../context/CompanyContext";

const PlanManagement = () => {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal states
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [builderStep, setBuilderStep] = useState(1);

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    planType: "standard",
    selectedServices: [],
    customPrices: {},
    overridePrice: "",
    discount: "",
    discountType: "fixed",
    additionalFeatures: [""],
    isPopular: false,
  });

  useEffect(() => {
    fetchPlans();
    fetchServices();
  }, [selectedCompany]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await planAPI.getAll({ company: selectedCompany });
      setPlans(response.data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await serviceAPI.getAll({
        company: selectedCompany,
        isActive: true,
      });
      setServices(response.data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to fetch services");
    }
  };

  const handleShowBuilder = (plan = null) => {
    if (plan) {
      setEditMode(true);
      setCurrentPlan(plan);
      setFormData({
        name: plan.name || "",
        description: plan.description || "",
        planType: plan.planType || "standard",
        selectedServices: plan.includedServices?.map((s) => s.service._id || s.service) || [],
        customPrices:
          plan.includedServices?.reduce((acc, s) => {
            if (s.customPrice) {
              acc[s.service._id || s.service] = s.customPrice;
            }
            return acc;
          }, {}) || {},
        overridePrice: plan.overridePrice || "",
        discount: plan.discount || "",
        discountType: plan.discountType || "fixed",
        additionalFeatures:
          plan.additionalFeatures?.length > 0 ? plan.additionalFeatures : [""],
        isPopular: plan.isPopular || false,
      });
    } else {
      setEditMode(false);
      setCurrentPlan(null);
      setFormData({
        name: "",
        description: "",
        planType: "standard",
        selectedServices: [],
        customPrices: {},
        overridePrice: "",
        discount: "",
        discountType: "fixed",
        additionalFeatures: [""],
        isPopular: false,
      });
    }
    setBuilderStep(1);
    setShowBuilderModal(true);
  };

  const handleCloseBuilder = () => {
    setShowBuilderModal(false);
    setBuilderStep(1);
    setEditMode(false);
    setCurrentPlan(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleServiceToggle = (serviceId) => {
    const isSelected = formData.selectedServices.includes(serviceId);
    if (isSelected) {
      setFormData({
        ...formData,
        selectedServices: formData.selectedServices.filter((id) => id !== serviceId),
        customPrices: { ...formData.customPrices, [serviceId]: undefined },
      });
    } else {
      setFormData({
        ...formData,
        selectedServices: [...formData.selectedServices, serviceId],
      });
    }
  };

  const handleCustomPriceChange = (serviceId, price) => {
    setFormData({
      ...formData,
      customPrices: {
        ...formData.customPrices,
        [serviceId]: price ? Number(price) : undefined,
      },
    });
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.additionalFeatures];
    newFeatures[index] = value;
    setFormData({ ...formData, additionalFeatures: newFeatures });
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      additionalFeatures: [...formData.additionalFeatures, ""],
    });
  };

  const removeFeature = (index) => {
    const newFeatures = formData.additionalFeatures.filter((_, i) => i !== index);
    setFormData({ ...formData, additionalFeatures: newFeatures });
  };

  const calculateAutoPrice = () => {
    return formData.selectedServices.reduce((total, serviceId) => {
      const service = services.find((s) => s._id === serviceId);
      const customPrice = formData.customPrices[serviceId];
      return total + (customPrice || service?.basePrice || 0);
    }, 0);
  };

  const calculateFinalPrice = () => {
    if (formData.overridePrice) {
      return Number(formData.overridePrice);
    }

    let price = calculateAutoPrice();

    if (formData.discount) {
      if (formData.discountType === "percentage") {
        price = price - (price * Number(formData.discount)) / 100;
      } else {
        price = price - Number(formData.discount);
      }
    }

    return Math.max(0, price);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Plan name is required");
      return;
    }

    if (!selectedCompany) {
      toast.error("Please select a company");
      return;
    }

    if (formData.selectedServices.length === 0) {
      toast.error("Please select at least one service");
      return;
    }

    const cleanedFeatures = formData.additionalFeatures.filter((f) => f.trim() !== "");

    const planData = {
      name: formData.name,
      company: selectedCompany,
      description: formData.description,
      planType: formData.planType,
      serviceIds: formData.selectedServices,
      customPrices: formData.customPrices,
      overridePrice: formData.overridePrice ? Number(formData.overridePrice) : undefined,
      discount: formData.discount ? Number(formData.discount) : 0,
      discountType: formData.discountType,
      additionalFeatures: cleanedFeatures,
      isPopular: formData.isPopular,
    };

    console.log("Submitting plan data:", planData);

    try {
      if (editMode) {
        await planAPI.update(currentPlan._id, planData);
        toast.success("Plan updated successfully");
      } else {
        const response = await planAPI.create(planData);
        console.log("Plan created successfully:", response.data);
        toast.success("Plan created successfully");
      }
      handleCloseBuilder();
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Failed to save plan";
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (plan) => {
    setPlanToDelete(plan);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await planAPI.delete(planToDelete._id);
      toast.success("Plan deleted successfully");
      setShowDeleteDialog(false);
      fetchPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error(error.response?.data?.message || "Failed to delete plan");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      await planAPI.toggleStatus(plan._id);
      toast.success(
        `Plan ${plan.isActive ? "deactivated" : "activated"} successfully`
      );
      fetchPlans();
    } catch (error) {
      console.error("Error toggling plan status:", error);
      toast.error("Failed to toggle plan status");
    }
  };

  // Filter plans
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch = plan.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || plan.planType === typeFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" && plan.isActive) ||
      (statusFilter === "inactive" && !plan.isActive);
    return matchesSearch && matchesType && matchesStatus;
  });

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {});

  // Table columns
  const columns = [
    {
      key: "name",
      label: "Plan Name",
      render: (value, plan) => (
        <div>
          {value}
          {plan.isPopular && <FaStar className="ms-2 text-warning" />}
        </div>
      ),
    },
    {
      key: "planType",
      label: "Type",
      render: (value) => <Badge bg="info" className="text-capitalize">{value}</Badge>,
    },
    {
      key: "includedServices",
      label: "Services",
      render: (value) => `${value?.length || 0} services`,
      sortable: false,
    },
    {
      key: "finalPrice",
      label: "Price",
      render: (value) => `₹${value?.toLocaleString("en-IN")}`,
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, plan) => (
        <div className="btn-group" role="group">
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => handleShowBuilder(plan)}
            title="Edit"
          >
            <FaEdit />
          </Button>
          <Button
            size="sm"
            variant={plan.isActive ? "outline-warning" : "outline-success"}
            onClick={() => handleToggleStatus(plan)}
            title={plan.isActive ? "Deactivate" : "Activate"}
          >
            {plan.isActive ? <FaToggleOff /> : <FaToggleOn />}
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => handleDeleteClick(plan)}
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
          <h2>Plan Management</h2>
          <p className="text-muted">
            Managing plans for: <strong>{selectedCompany}</strong>
          </p>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => handleShowBuilder()}>
            <FaPlus className="me-2" />
            Create Plan
          </Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <SearchBar placeholder="Search plans..." onSearch={setSearchTerm} />
        </Col>
        <Col md={3}>
          <FilterDropdown
            label="Type"
            options={[
              { value: "basic", label: "Basic" },
              { value: "standard", label: "Standard" },
              { value: "premium", label: "Premium" },
              { value: "enterprise", label: "Enterprise" },
              { value: "custom", label: "Custom" },
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="All Types"
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
            data={filteredPlans}
            loading={loading}
            emptyMessage="No plans found. Create your first plan to get started."
            initialItemsPerPage={20}
          />
        </Card.Body>
      </Card>

      {/* Plan Builder Modal */}
      <Modal
        show={showBuilderModal}
        onHide={handleCloseBuilder}
        size="xl"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? "Edit Plan" : "Create New Plan"} - Step {builderStep} of 3
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Step 1: Basic Information */}
          {builderStep === 1 && (
            <div>
              <h5 className="mb-3">Step 1: Basic Information</h5>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Plan Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Starter Package"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Plan Type *</Form.Label>
                    <Form.Select
                      name="planType"
                      value={formData.planType}
                      onChange={handleChange}
                    >
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="custom">Custom</option>
                    </Form.Select>
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
                  placeholder="Describe the plan..."
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="isPopular"
                  label="Mark as Popular Plan"
                  checked={formData.isPopular}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>
          )}

          {/* Step 2: Select Services */}
          {builderStep === 2 && (
            <div>
              <h5 className="mb-3">Step 2: Select Services</h5>
              {services.length === 0 ? (
                <Alert variant="warning">
                  No active services found for {selectedCompany}. Please create
                  services first.
                </Alert>
              ) : (
                <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                  {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                    <Card key={category} className="mb-3">
                      <Card.Header>
                        <strong>{category}</strong>
                      </Card.Header>
                      <ListGroup variant="flush">
                        {categoryServices.map((service) => {
                          const isSelected = formData.selectedServices.includes(
                            service._id
                          );
                          return (
                            <ListGroup.Item key={service._id}>
                              <Row className="align-items-center">
                                <Col md={1}>
                                  <Form.Check
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleServiceToggle(service._id)}
                                  />
                                </Col>
                                <Col md={5}>
                                  <strong>{service.name}</strong>
                                  <br />
                                  <small className="text-muted">
                                    Base: ₹{service.basePrice?.toLocaleString("en-IN")}
                                  </small>
                                </Col>
                                <Col md={6}>
                                  {isSelected && (
                                    <Form.Group>
                                      <Form.Label className="small">
                                        Custom Price (optional)
                                      </Form.Label>
                                      <Form.Control
                                        type="number"
                                        size="sm"
                                        placeholder={`Default: ₹${service.basePrice}`}
                                        value={
                                          formData.customPrices[service._id] || ""
                                        }
                                        onChange={(e) =>
                                          handleCustomPriceChange(
                                            service._id,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </Form.Group>
                                  )}
                                </Col>
                              </Row>
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                    </Card>
                  ))}
                </div>
              )}
              <Alert variant="info" className="mt-3">
                Selected {formData.selectedServices.length} service(s)
              </Alert>
            </div>
          )}

          {/* Step 3: Pricing & Features */}
          {builderStep === 3 && (
            <div>
              <h5 className="mb-3">Step 3: Pricing & Additional Features</h5>

              <Card className="mb-3">
                <Card.Body>
                  <h6>Price Calculation</h6>
                  <div className="mb-2">
                    <strong>Auto-calculated Price:</strong> ₹
                    {calculateAutoPrice().toLocaleString("en-IN")}
                  </div>

                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Discount</Form.Label>
                        <Form.Control
                          type="number"
                          name="discount"
                          value={formData.discount}
                          onChange={handleChange}
                          placeholder="0"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Discount Type</Form.Label>
                        <Form.Select
                          name="discountType"
                          value={formData.discountType}
                          onChange={handleChange}
                        >
                          <option value="fixed">Fixed Amount</option>
                          <option value="percentage">Percentage</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Override Price (optional)</Form.Label>
                        <Form.Control
                          type="number"
                          name="overridePrice"
                          value={formData.overridePrice}
                          onChange={handleChange}
                          placeholder="Leave empty for auto"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Alert variant="success">
                    <strong>Final Price:</strong> ₹
                    {calculateFinalPrice().toLocaleString("en-IN")}
                  </Alert>
                </Card.Body>
              </Card>

              <Form.Group className="mb-3">
                <Form.Label>Additional Features</Form.Label>
                {formData.additionalFeatures.map((feature, index) => (
                  <div key={index} className="d-flex gap-2 mb-2">
                    <Form.Control
                      type="text"
                      value={feature}
                      onChange={(e) => handleFeatureChange(index, e.target.value)}
                      placeholder="Enter additional feature"
                    />
                    {formData.additionalFeatures.length > 1 && (
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
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseBuilder}>
            Cancel
          </Button>
          {builderStep > 1 && (
            <Button variant="outline-primary" onClick={() => setBuilderStep(builderStep - 1)}>
              Previous
            </Button>
          )}
          {builderStep < 3 ? (
            <Button variant="primary" onClick={() => setBuilderStep(builderStep + 1)}>
              Next
            </Button>
          ) : (
            <Button variant="success" onClick={handleSubmit}>
              {editMode ? "Update Plan" : "Create Plan"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        show={showDeleteDialog}
        onHide={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Plan"
        message={`Are you sure you want to delete "${planToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </Container>
  );
};

export default PlanManagement;
