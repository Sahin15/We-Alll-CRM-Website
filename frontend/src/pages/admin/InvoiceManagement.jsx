import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Form,
  Badge,
  Table,
} from "react-bootstrap";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaFilePdf,
  FaPaperPlane,
  FaDownload,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  DataTable,
  SearchBar,
  FilterDropdown,
  ConfirmDialog,
  StatusBadge,
  LoadingSpinner,
} from "../../components/shared";
import { invoiceAPI, subscriptionAPI } from "../../services/api";
import { useCompany } from "../../context/CompanyContext";

const InvoiceManagement = () => {
  const { selectedCompany } = useCompany();
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [availableAddOns, setAvailableAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    subscription: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    referenceNumber: "",
    otherReferences: "",
    planDetails: {
      name: "",
      description: "",
      amount: 0,
      hsnSac: "9983",
    },
    addOns: [],
    customItems: [],
    discount: "",
    cgstRate: 9,
    sgstRate: 9,
    notes: "",
    termsAndConditions: "",
  });

  // Selected subscription details
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  useEffect(() => {
    fetchInvoices();
    fetchSubscriptions();
  }, [selectedCompany]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getAll({ company: selectedCompany });
      setInvoices(response.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await subscriptionAPI.getAll({
        company: selectedCompany,
        status: "active",
      });
      setSubscriptions(response.data || []);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to fetch subscriptions");
    }
  };

  const handleShowModal = (invoice = null) => {
    if (invoice) {
      setEditMode(true);
      setCurrentInvoice(invoice);
      setFormData({
        subscription: invoice.subscription?._id || invoice.subscription || "",
        issueDate: invoice.issueDate
          ? new Date(invoice.issueDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        dueDate: invoice.dueDate
          ? new Date(invoice.dueDate).toISOString().split("T")[0]
          : "",
        referenceNumber: invoice.referenceNumber || "",
        otherReferences: invoice.otherReferences || "",
        planDetails: invoice.planDetails || {
          name: "",
          description: "",
          amount: 0,
          hsnSac: "9983",
        },
        addOns: invoice.addOns || [],
        customItems: invoice.customItems || [],
        discount: invoice.discount || "",
        cgstRate: invoice.cgstRate || 9,
        sgstRate: invoice.sgstRate || 9,
        notes: invoice.notes || "",
        termsAndConditions: invoice.termsAndConditions || "",
      });
      const sub = subscriptions.find(
        (s) => s._id === (invoice.subscription?._id || invoice.subscription)
      );
      setSelectedSubscription(sub || null);
    } else {
      setEditMode(false);
      setCurrentInvoice(null);
      setSelectedSubscription(null);
      setFormData({
        subscription: "",
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        referenceNumber: "",
        otherReferences: "",
        planDetails: {
          name: "",
          description: "",
          amount: 0,
          hsnSac: "9983",
        },
        addOns: [],
        customItems: [],
        discount: "",
        cgstRate: 9,
        sgstRate: 9,
        notes: "",
        termsAndConditions: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentInvoice(null);
    setSelectedSubscription(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "subscription") {
      const sub = subscriptions.find((s) => s._id === value);
      setSelectedSubscription(sub || null);
      
      // Populate plan details from subscription
      if (sub) {
        setFormData(prev => ({
          ...prev,
          planDetails: {
            name: sub.planSnapshot?.name || "",
            description: sub.planSnapshot?.description || "",
            amount: sub.totalAmount || 0,
            hsnSac: "9983",
          },
        }));
      }
    }
  };

  const handleCustomItemChange = (index, field, value) => {
    const newItems = [...formData.customItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, customItems: newItems });
  };

  const addCustomItem = () => {
    setFormData({
      ...formData,
      customItems: [
        ...formData.customItems,
        { description: "", quantity: 1, unitPrice: 0, total: 0 },
      ],
    });
  };

  const removeCustomItem = (index) => {
    const newItems = formData.customItems.filter((_, i) => i !== index);
    setFormData({ ...formData, customItems: newItems });
  };

  const calculateCustomItemTotal = (item) => {
    return (item.quantity || 0) * (item.unitPrice || 0);
  };

  // Add-on handling functions
  const handleAddOnChange = (index, field, value) => {
    const newAddOns = [...formData.addOns];
    newAddOns[index] = { ...newAddOns[index], [field]: value };
    
    // Recalculate amount if quantity or unitPrice changes
    if (field === "quantity" || field === "unitPrice") {
      newAddOns[index].amount = (newAddOns[index].quantity || 0) * (newAddOns[index].unitPrice || 0);
    }
    
    setFormData({ ...formData, addOns: newAddOns });
  };

  const addAddOn = () => {
    setFormData({
      ...formData,
      addOns: [
        ...formData.addOns,
        { name: "", description: "", quantity: 1, unitPrice: 0, amount: 0, hsnSac: "9983" },
      ],
    });
  };

  const removeAddOn = (index) => {
    const newAddOns = formData.addOns.filter((_, i) => i !== index);
    setFormData({ ...formData, addOns: newAddOns });
  };

  const calculateSubtotal = () => {
    let subtotal = 0;

    // Add plan amount
    if (formData.planDetails.amount) {
      subtotal += Number(formData.planDetails.amount);
    }

    // Add add-ons
    formData.addOns.forEach((addOn) => {
      subtotal += addOn.amount || 0;
    });

    // Add custom items
    formData.customItems.forEach((item) => {
      subtotal += calculateCustomItemTotal(item);
    });

    return subtotal;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = Number(formData.discount) || 0;
    const cgstRate = Number(formData.cgstRate) || 0;
    const sgstRate = Number(formData.sgstRate) || 0;

    const afterDiscount = subtotal - discount;
    const cgstAmount = (afterDiscount * cgstRate) / 100;
    const sgstAmount = (afterDiscount * sgstRate) / 100;
    const totalTax = cgstAmount + sgstAmount;
    const total = afterDiscount + totalTax;

    return {
      subtotal,
      discount,
      cgstAmount,
      sgstAmount,
      totalTax,
      total: Math.max(0, total),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.subscription) {
      toast.error("Please select a subscription");
      return;
    }

    if (!formData.dueDate) {
      toast.error("Please set a due date");
      return;
    }

    const totals = calculateTotal();

    const invoiceData = {
      subscription: formData.subscription,
      company: selectedCompany,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      referenceNumber: formData.referenceNumber,
      otherReferences: formData.otherReferences,
      planDetails: formData.planDetails,
      addOns: formData.addOns,
      customItems: formData.customItems.filter(
        (item) => item.description.trim() !== ""
      ),
      subtotal: totals.subtotal,
      discount: totals.discount,
      cgstRate: Number(formData.cgstRate),
      cgstAmount: totals.cgstAmount,
      sgstRate: Number(formData.sgstRate),
      sgstAmount: totals.sgstAmount,
      totalTax: totals.totalTax,
      totalAmount: totals.total,
      notes: formData.notes,
      termsAndConditions: formData.termsAndConditions,
      status: "draft",
    };

    try {
      if (editMode) {
        const response = await invoiceAPI.update(currentInvoice._id, invoiceData);
        toast.success("Invoice updated successfully");
      } else {
        const response = await invoiceAPI.create(invoiceData);
        toast.success("Invoice created successfully");
      }
      handleCloseModal();
      fetchInvoices();
    } catch (error) {
      console.error("Error saving invoice:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Failed to save invoice";
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await invoiceAPI.delete(invoiceToDelete._id);
      toast.success("Invoice deleted successfully");
      setShowDeleteDialog(false);
      fetchInvoices();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error(error.response?.data?.message || "Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  };

  const handleSendInvoice = async (invoice) => {
    try {
      await invoiceAPI.send(invoice._id);
      toast.success("Invoice sent successfully");
      fetchInvoices();
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice");
    }
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      const response = await invoiceAPI.generatePDF(invoice._id);
      
      // Check if response is JSON (error) or PDF
      if (response.headers['content-type']?.includes('application/json')) {
        toast.warning("PDF generation feature is not yet implemented. This feature will be added in a future update.");
        return;
      }
      
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      if (error.response?.status === 501) {
        toast.warning("PDF generation feature is not yet implemented. This feature will be added in a future update.");
      } else {
        toast.error(error.response?.data?.message || "Failed to download PDF");
      }
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { key: "invoiceNumber", label: "Invoice #" },
    {
      key: "client",
      label: "Client",
      render: (_, invoice) => invoice.clientDetails?.name || "N/A",
      sortable: false,
    },
    {
      key: "totalAmount",
      label: "Amount",
      render: (value) => `₹${value?.toLocaleString("en-IN")}`,
    },
    {
      key: "issueDate",
      label: "Issue Date",
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "dueDate",
      label: "Due Date",
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
      render: (_, invoice) => (
        <div className="btn-group" role="group">
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => handleShowModal(invoice)}
            title="Edit"
          >
            <FaEdit />
          </Button>
          {invoice.status === "draft" && (
            <Button
              size="sm"
              variant="outline-success"
              onClick={() => handleSendInvoice(invoice)}
              title="Send Invoice"
            >
              <FaPaperPlane />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline-info"
            onClick={() => handleDownloadPDF(invoice)}
            title="Download PDF"
          >
            <FaFilePdf />
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => handleDeleteClick(invoice)}
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
          <h2>Invoice Management</h2>
          <p className="text-muted">
            Managing invoices for: <strong>{selectedCompany}</strong>
          </p>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => handleShowModal()}>
            <FaPlus className="me-2" />
            Create Invoice
          </Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <SearchBar
            placeholder="Search invoices..."
            onSearch={setSearchTerm}
          />
        </Col>
        <Col md={3}>
          <FilterDropdown
            label="Status"
            options={[
              { value: "draft", label: "Draft" },
              { value: "sent", label: "Sent" },
              { value: "paid", label: "Paid" },
              { value: "overdue", label: "Overdue" },
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
            data={filteredInvoices}
            loading={loading}
            emptyMessage="No invoices found. Create your first invoice to get started."
            initialItemsPerPage={20}
          />
        </Card.Body>
      </Card>

      {/* Create/Edit Invoice Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? "Edit Invoice" : "Create New Invoice"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Subscription *</Form.Label>
                  <Form.Select
                    name="subscription"
                    value={formData.subscription}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      {subscriptions.length === 0
                        ? "No active subscriptions available"
                        : "Select subscription"}
                    </option>
                    {subscriptions.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.subscriptionNumber} - {sub.client?.name} (₹
                        {sub.totalAmount?.toLocaleString("en-IN")})
                      </option>
                    ))}
                  </Form.Select>
                  {subscriptions.length === 0 && (
                    <Form.Text className="text-danger">
                      No active subscriptions found. Please create a subscription first.
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Issue Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="issueDate"
                    value={formData.issueDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Due Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Reference Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleChange}
                    placeholder="Enter reference number"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Other References</Form.Label>
                  <Form.Control
                    type="text"
                    name="otherReferences"
                    value={formData.otherReferences}
                    onChange={handleChange}
                    placeholder="Enter other references"
                  />
                </Form.Group>
              </Col>
            </Row>

            {selectedSubscription && (
              <Card className="mb-3">
                <Card.Header>
                  <strong>Client & Subscription Details</strong>
                </Card.Header>
                <Card.Body>
                  <Row className="mb-3">
                    <Col md={6}>
                      <strong>Client:</strong> {selectedSubscription.client?.name}
                      <br />
                      <strong>Billing Cycle:</strong> {selectedSubscription.billingCycle}
                    </Col>
                    <Col md={6}>
                      <strong>Status:</strong>{" "}
                      <StatusBadge status={selectedSubscription.status} />
                    </Col>
                  </Row>
                  
                  <h6 className="mt-3 mb-2">Plan Details</h6>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Plan Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.planDetails.name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              planDetails: {
                                ...formData.planDetails,
                                name: e.target.value,
                              },
                            })
                          }
                          placeholder="Plan name"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-2">
                        <Form.Label>Amount (₹)</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.planDetails.amount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              planDetails: {
                                ...formData.planDetails,
                                amount: Number(e.target.value),
                              },
                            })
                          }
                          min="0"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-2">
                        <Form.Label>HSN/SAC</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.planDetails.hsnSac}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              planDetails: {
                                ...formData.planDetails,
                                hsnSac: e.target.value,
                              },
                            })
                          }
                          placeholder="9983"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-2">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={formData.planDetails.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          planDetails: {
                            ...formData.planDetails,
                            description: e.target.value,
                          },
                        })
                      }
                      placeholder="Plan description"
                    />
                  </Form.Group>
                </Card.Body>
              </Card>
            )}

            <h6 className="mt-4 mb-3">Add-Ons</h6>
            {formData.addOns.length > 0 && (
              <Table size="sm" className="mb-3">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                    <th>HSN/SAC</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.addOns.map((addOn, index) => (
                    <tr key={index}>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={addOn.name}
                          onChange={(e) =>
                            handleAddOnChange(index, "name", e.target.value)
                          }
                          placeholder="Add-on name"
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={addOn.description}
                          onChange={(e) =>
                            handleAddOnChange(index, "description", e.target.value)
                          }
                          placeholder="Description"
                        />
                      </td>
                      <td style={{ width: "80px" }}>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={addOn.quantity}
                          onChange={(e) =>
                            handleAddOnChange(index, "quantity", Number(e.target.value))
                          }
                          min="1"
                        />
                      </td>
                      <td style={{ width: "100px" }}>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={addOn.unitPrice}
                          onChange={(e) =>
                            handleAddOnChange(index, "unitPrice", Number(e.target.value))
                          }
                          min="0"
                        />
                      </td>
                      <td style={{ width: "100px" }}>
                        ₹{addOn.amount?.toLocaleString("en-IN") || 0}
                      </td>
                      <td style={{ width: "80px" }}>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={addOn.hsnSac}
                          onChange={(e) =>
                            handleAddOnChange(index, "hsnSac", e.target.value)
                          }
                          placeholder="9983"
                        />
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => removeAddOn(index)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <Button variant="outline-success" size="sm" onClick={addAddOn} className="mb-4">
              + Add Add-On
            </Button>

            <h6 className="mt-4 mb-3">Custom Items</h6>
            {formData.customItems.length > 0 && (
              <Table size="sm" className="mb-3">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.customItems.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            handleCustomItemChange(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Item description"
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleCustomItemChange(
                              index,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          min="1"
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleCustomItemChange(
                              index,
                              "unitPrice",
                              Number(e.target.value)
                            )
                          }
                          min="0"
                        />
                      </td>
                      <td>₹{calculateCustomItemTotal(item).toLocaleString("en-IN")}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => removeCustomItem(index)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <Button variant="outline-primary" size="sm" onClick={addCustomItem}>
              + Add Custom Item
            </Button>

            <Row className="mt-4">
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Discount (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleChange}
                    min="0"
                    placeholder="0"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>CGST Rate (%)</Form.Label>
                  <Form.Control
                    type="number"
                    name="cgstRate"
                    value={formData.cgstRate}
                    onChange={handleChange}
                    min="0"
                    max="50"
                    step="0.01"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>SGST Rate (%)</Form.Label>
                  <Form.Control
                    type="number"
                    name="sgstRate"
                    value={formData.sgstRate}
                    onChange={handleChange}
                    min="0"
                    max="50"
                    step="0.01"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Card className="mb-3">
              <Card.Body>
                <h6>Invoice Summary</h6>
                {(() => {
                  const totals = calculateTotal();
                  return (
                    <div>
                      <div className="d-flex justify-content-between">
                        <span>Subtotal:</span>
                        <span>₹{totals.subtotal.toLocaleString("en-IN")}</span>
                      </div>
                      {totals.discount > 0 && (
                        <div className="d-flex justify-content-between">
                          <span>Discount:</span>
                          <span>-₹{totals.discount.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between">
                        <span>CGST ({formData.cgstRate}%):</span>
                        <span>₹{totals.cgstAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>SGST ({formData.sgstRate}%):</span>
                        <span>₹{totals.sgstAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Total Tax:</span>
                        <span>₹{totals.totalTax.toLocaleString("en-IN")}</span>
                      </div>
                      <hr />
                      <div className="d-flex justify-content-between">
                        <strong>Total:</strong>
                        <strong>₹{totals.total.toLocaleString("en-IN")}</strong>
                      </div>
                    </div>
                  );
                })()}
              </Card.Body>
            </Card>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any notes for the client..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Terms and Conditions</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="termsAndConditions"
                value={formData.termsAndConditions}
                onChange={handleChange}
                placeholder="Add terms and conditions..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editMode ? "Update Invoice" : "Create Invoice"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        show={showDeleteDialog}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${invoiceToDelete?.invoiceNumber}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </Container>
  );
};

export default InvoiceManagement;
