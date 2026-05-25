import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Button,
  Form,
  Badge,
  Spinner,
  Alert,
  Card,
} from "react-bootstrap";
import {
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaCheck,
  FaArrowUp,
} from "react-icons/fa";
import { toast } from "../../utils/toast";
import { salaryStructureApi } from "../../api/salaryApi";
import SalaryStructureForm from "./SalaryStructureForm";
import SalaryIncrementModal from "./SalaryIncrementModal";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import MobileFilterSheet from "../shared/MobileFilterSheet";
import ResponsiveDataTable from "../shared/ResponsiveDataTable";
import MobileModal from "../shared/MobileModal";
import FormFieldStack from "../shared/FormFieldStack";

const SalaryStructures = () => {
  const { user } = useAuth();
  const isAdminOrSuperAdmin = ['admin', 'superadmin'].includes(user?.role);
  const [structures, setStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "active",
    employee: "",
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 20,
  });
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showIncrementModal, setShowIncrementModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [structureToDelete, setStructureToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchSalaryStructures();
    fetchEmployees();
  }, [filters, pagination.current]);

  const fetchSalaryStructures = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.current,
        limit: pagination.limit,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] === null) {
          delete params[key];
        }
      });

      const response = await salaryStructureApi.getAll(params);
      setStructures(response.data.structures || []);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error("Error fetching salary structures:", error);
      toast.error("Failed to load salary structures");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/users/employees");
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleCreateNew = () => {
    setSelectedStructure(null);
    setShowFormModal(true);
  };

  const handleEdit = (structure) => {
    setSelectedStructure(structure);
    setShowFormModal(true);
  };

  const handleViewDetails = (structure) => {
    setSelectedStructure(structure);
    setShowDetailModal(true);
  };

  const handleCreateIncrement = (structure) => {
    setSelectedStructure(structure);
    setShowIncrementModal(true);
  };

  const handleActivate = async (structureId) => {
    try {
      setActionLoading(structureId);
      await salaryStructureApi.activate(structureId);
      toast.success("Salary structure activated successfully");
      fetchSalaryStructures();
    } catch (error) {
      console.error("Error activating salary structure:", error);
      toast.error("Failed to activate salary structure");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = (structure) => {
    setStructureToDelete(structure);
    setShowDeleteModal(true);
  };

  const handleDelete = async (structureId) => {
    try {
      setActionLoading(structureId);
      await salaryStructureApi.delete(structureId);
      toast.success("Salary structure deleted successfully");
      setShowDeleteModal(false);
      setStructureToDelete(null);
      fetchSalaryStructures();
    } catch (error) {
      console.error("Error deleting salary structure:", error);
      const errorMessage = error.response?.data?.message || "Failed to delete salary structure";
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: "secondary", text: "Draft" },
      active: { bg: "success", text: "Active" },
      superseded: { bg: "warning", text: "Superseded" },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const structureColumns = [
    {
      key: "employee",
      label: "Employee",
      mobilePriority: 1,
      render: (_, row) => (
        <div>
          <strong>{row.employee.name}</strong>
          <br />
          <small className="text-muted">{row.employee.employeeId}</small>
        </div>
      ),
    },
    {
      key: "basicSalary",
      label: "Basic Salary",
      hideOnMobile: true,
      render: (_, row) => formatCurrency(row.basicSalary),
    },
    {
      key: "grossSalary",
      label: "Gross Salary",
      hideOnMobile: true,
      render: (_, row) => formatCurrency(row.grossSalary),
    },
    {
      key: "netSalary",
      label: "Net Salary",
      mobilePriority: 2,
      render: (_, row) => (
        <strong className="text-success">{formatCurrency(row.netSalary)}</strong>
      ),
    },
    {
      key: "ctc",
      label: "CTC",
      hideOnMobile: true,
      render: (_, row) => formatCurrency(row.ctc),
    },
    {
      key: "status",
      label: "Status",
      mobilePriority: 3,
      render: (_, row) => getStatusBadge(row.status),
    },
    {
      key: "effectiveFrom",
      label: "Effective From",
      hideOnMobile: true,
      render: (_, row) => new Date(row.effectiveFrom).toLocaleDateString("en-IN"),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="d-flex gap-1 flex-wrap">
          <Button
            variant="outline-primary"
            size="sm"
            className="touch-target"
            onClick={() => handleViewDetails(row)}
            title="View details"
          >
            <FaEye />
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            className="touch-target"
            onClick={() => handleEdit(row)}
            disabled={actionLoading === row._id}
            title="Edit structure"
          >
            <FaEdit />
          </Button>
          {row.status === "active" && (
            <Button
              variant="outline-success"
              size="sm"
              className="touch-target"
              onClick={() => handleCreateIncrement(row)}
              title="Create salary increment"
            >
              <FaArrowUp />
            </Button>
          )}
          {row.status === "draft" && (
            <>
              <Button
                variant="outline-success"
                size="sm"
                className="touch-target"
                onClick={() => handleActivate(row._id)}
                disabled={actionLoading === row._id}
                title="Activate structure"
              >
                <FaCheck />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                className="touch-target"
                onClick={() => confirmDelete(row)}
                disabled={actionLoading === row._id}
                title="Delete structure"
              >
                <FaTrash />
              </Button>
            </>
          )}
          {row.status !== "draft" && isAdminOrSuperAdmin && (
            <Button
              variant="outline-danger"
              size="sm"
              className="touch-target"
              onClick={() => confirmDelete(row)}
              disabled={actionLoading === row._id}
              title="Delete structure (Admin only)"
            >
              {actionLoading === row._id ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <FaTrash />
              )}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Row className="mb-3">
        <Col>
          <Button variant="primary" className="touch-target" onClick={handleCreateNew}>
            <FaPlus className="me-1" />
            Create New Structure
          </Button>
        </Col>
      </Row>

      <MobileFilterSheet
        title="Structure Filters"
        activeFilterCount={[filters.status !== "active", filters.employee].filter(Boolean).length}
        onClear={() => setFilters({ status: "active", employee: "" })}
        onApply={fetchSalaryStructures}
      >
        <FormFieldStack md={6}>
          <Form.Group>
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="superseded">Superseded</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Employee</Form.Label>
            <Form.Select
              value={filters.employee}
              onChange={(e) => handleFilterChange("employee", e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </FormFieldStack>
      </MobileFilterSheet>

      {/* Results Info */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <small className="text-muted">
          Showing {structures.length} of {pagination.total} salary structures
        </small>
        {pagination.pages > 1 && (
          <div className="d-flex gap-1">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === pagination.current ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, current: page }))}
              >
                {page}
              </Button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <div className="mt-2">Loading salary structures...</div>
        </div>
      ) : structures.length === 0 ? (
        <Alert variant="info">No salary structures found for the selected criteria.</Alert>
      ) : (
        <ResponsiveDataTable
          columns={structureColumns}
          data={structures}
          loading={false}
          emptyMessage="No salary structures found for the selected criteria."
          paginated={false}
          keyField="_id"
        />
      )}

      {/* Form Modal */}
      <SalaryStructureForm
        show={showFormModal}
        onHide={() => {
          setShowFormModal(false);
          setSelectedStructure(null);
        }}
        structure={selectedStructure}
        onSuccess={() => {
          setShowFormModal(false);
          setSelectedStructure(null);
          fetchSalaryStructures();
        }}
      />

      <MobileModal
        show={showDeleteModal}
        onHide={() => { setShowDeleteModal(false); setStructureToDelete(null); }}
        title="Delete Salary Structure"
        footer={
          <>
            <Button
              variant="secondary"
              className="touch-target"
              onClick={() => { setShowDeleteModal(false); setStructureToDelete(null); }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="touch-target"
              onClick={() => handleDelete(structureToDelete?._id)}
              disabled={actionLoading === structureToDelete?._id}
            >
              {actionLoading === structureToDelete?._id ? (
                <><Spinner animation="border" size="sm" className="me-1" /> Deleting...</>
              ) : (
                <><FaTrash className="me-1" /> Delete</>
              )}
            </Button>
          </>
        }
      >
        {structureToDelete && (
          <div className="text-center py-2">
            <FaTrash size={40} className="text-danger mb-3" />
            <h5>Are you sure?</h5>
            <p className="text-muted">
              You are about to delete the salary structure for{" "}
              <strong>{structureToDelete.employee?.name}</strong>.
            </p>
            {structureToDelete.status !== "draft" && (
              <Alert variant="warning">
                <strong>Warning:</strong> This is an <strong>{structureToDelete.status}</strong> salary structure. Deleting it may affect payroll records.
              </Alert>
            )}
            <p className="text-danger small">This action cannot be undone.</p>
          </div>
        )}
      </MobileModal>

      {selectedStructure && (
        <MobileModal
          show={showDetailModal}
          onHide={() => setShowDetailModal(false)}
          title={`Salary Structure - ${selectedStructure.employee.name}`}
          footer={
            <>
              <Button variant="secondary" className="touch-target" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
              {selectedStructure.status === "draft" && (
                <Button
                  variant="success"
                  className="touch-target"
                  onClick={() => handleActivate(selectedStructure._id)}
                  disabled={actionLoading === selectedStructure._id}
                >
                  <FaCheck className="me-1" />
                  Activate
                </Button>
              )}
            </>
          }
        >
            <Row>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header className="bg-success text-white">
                    <strong>Earnings</strong>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Basic Salary</span>
                      <strong>{formatCurrency(selectedStructure.basicSalary)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>HRA</span>
                      <strong>{formatCurrency(selectedStructure.hra)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Special Allowance</span>
                      <strong>{formatCurrency(selectedStructure.specialAllowance)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Transport Allowance</span>
                      <strong>{formatCurrency(selectedStructure.transportAllowance)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Medical Allowance</span>
                      <strong>{formatCurrency(selectedStructure.medicalAllowance)}</strong>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <strong>Gross Salary</strong>
                      <strong className="text-success">
                        {formatCurrency(selectedStructure.grossSalary)}
                      </strong>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header className="bg-danger text-white">
                    <strong>Deductions</strong>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Provident Fund</span>
                      <strong>{formatCurrency(selectedStructure.providentFund)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Professional Tax</span>
                      <strong>{formatCurrency(selectedStructure.professionalTax)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>TDS</span>
                      <strong>{formatCurrency(selectedStructure.tds)}</strong>
                    </div>
                    {selectedStructure.esi > 0 && (
                      <div className="d-flex justify-content-between mb-2">
                        <span>ESI</span>
                        <strong>{formatCurrency(selectedStructure.esi)}</strong>
                      </div>
                    )}
                    <hr />
                    <div className="d-flex justify-content-between">
                      <strong>Total Deductions</strong>
                      <strong className="text-danger">
                        {formatCurrency(selectedStructure.totalDeductions)}
                      </strong>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Card className="bg-primary text-white">
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h5 className="mb-0">Net Salary (Monthly)</h5>
                    <h3 className="mb-0">{formatCurrency(selectedStructure.netSalary)}</h3>
                  </Col>
                  <Col md={6}>
                    <h5 className="mb-0">Annual CTC</h5>
                    <h3 className="mb-0">{formatCurrency(selectedStructure.ctc)}</h3>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Row className="mt-3">
              <Col md={6}>
                <p className="mb-1">
                  <strong>Status:</strong> {getStatusBadge(selectedStructure.status)}
                </p>
                <p className="mb-1">
                  <strong>Effective From:</strong>{" "}
                  {new Date(selectedStructure.effectiveFrom).toLocaleDateString("en-IN")}
                </p>
              </Col>
              <Col md={6}>
                <p className="mb-1">
                  <strong>Created By:</strong> {selectedStructure.createdBy?.name || "N/A"}
                </p>
                <p className="mb-1">
                  <strong>Approved By:</strong> {selectedStructure.approvedBy?.name || "N/A"}
                </p>
              </Col>
            </Row>

            {selectedStructure.notes && (
              <Alert variant="info" className="mt-3">
                <strong>Notes:</strong> {selectedStructure.notes}
              </Alert>
            )}
        </MobileModal>
      )}

      {/* Salary Increment Modal */}
      <SalaryIncrementModal
        show={showIncrementModal}
        onHide={() => setShowIncrementModal(false)}
        currentStructure={selectedStructure}
        onSuccess={() => {
          setShowIncrementModal(false);
          fetchSalaryStructures();
        }}
      />
    </>
  );
};

export default SalaryStructures;