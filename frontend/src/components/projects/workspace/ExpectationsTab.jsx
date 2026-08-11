import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Badge,
  Modal,
  Form,
  Table,
  Spinner,
} from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaCheck, FaBullseye } from "react-icons/fa";
import { toast } from "react-toastify";
import expectationApi from "../../../api/expectationApi";
import { formatDate } from "../../../utils/helpers";

const ExpectationsTab = ({ project, canEdit }) => {
  const projectId = project?._id || project?.id;
  const [expectations, setExpectations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingExpectation, setEditingExpectation] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    source: "other",
    status: "open",
    owner: "",
    dueDate: "",
    notes: "",
  });

  useEffect(() => {
    if (projectId) {
      fetchExpectations();
    }
  }, [projectId]);

  const fetchExpectations = async () => {
    try {
      setLoading(true);
      const res = await expectationApi.getProjectExpectations(projectId);
      if (res.data && res.data.data) {
        setExpectations(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch expectations:", error);
      toast.error("Failed to load project expectations");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingExpectation(null);
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      source: "other",
      status: "open",
      owner: "",
      dueDate: "",
      notes: "",
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (exp) => {
    setEditingExpectation(exp);
    setFormData({
      title: exp.title || "",
      description: exp.description || "",
      priority: exp.priority || "medium",
      source: exp.source || "other",
      status: exp.status || "open",
      owner: exp.owner?._id || exp.owner || "",
      dueDate: exp.dueDate ? exp.dueDate.split("T")[0] : "",
      notes: exp.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      if (editingExpectation) {
        await expectationApi.updateProjectExpectation(editingExpectation._id, formData);
        toast.success("Expectation updated successfully");
      } else {
        await expectationApi.createProjectExpectation(projectId, formData);
        toast.success("Expectation created successfully");
      }
      setShowModal(false);
      fetchExpectations();
    } catch (error) {
      console.error("Error saving expectation:", error);
      toast.error(error.response?.data?.message || "Failed to save expectation");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expectation?")) return;
    try {
      await expectationApi.deleteProjectExpectation(id);
      toast.success("Expectation deleted");
      fetchExpectations();
    } catch (error) {
      toast.error("Failed to delete expectation");
    }
  };

  const handleStatusQuickChange = async (exp, newStatus) => {
    try {
      await expectationApi.updateProjectExpectation(exp._id, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      fetchExpectations();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "urgent":
        return <Badge bg="danger">Urgent</Badge>;
      case "high":
        return <Badge bg="warning" text="dark">High</Badge>;
      case "medium":
        return <Badge bg="info">Medium</Badge>;
      case "low":
        return <Badge bg="secondary">Low</Badge>;
      default:
        return <Badge bg="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "met":
        return <Badge bg="success">Met</Badge>;
      case "partially_met":
        return <Badge bg="primary">Partially Met</Badge>;
      case "in_progress":
        return <Badge bg="info">In Progress</Badge>;
      case "dropped":
        return <Badge bg="danger">Dropped</Badge>;
      case "open":
      default:
        return <Badge bg="secondary">Open</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading expectations...</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-2">
            <FaBullseye className="text-primary" size={20} />
            <h5 className="mb-0 fw-bold">Project Expectations ({expectations.length})</h5>
          </div>
          {canEdit && (
            <Button variant="success" size="sm" onClick={handleOpenAddModal}>
              <FaPlus className="me-1" /> Add Expectation
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          {expectations.length > 0 ? (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Assigned Owner</th>
                  {canEdit && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {expectations.map((exp) => (
                  <tr key={exp._id}>
                    <td>
                      <div className="fw-bold">{exp.title}</div>
                      {exp.description && (
                        <small className="text-muted d-block">{exp.description}</small>
                      )}
                    </td>
                    <td>{getPriorityBadge(exp.priority)}</td>
                    <td>
                      <Badge bg="light" text="dark" className="border">
                        {exp.source}
                      </Badge>
                    </td>
                    <td>
                      <Form.Select
                        size="sm"
                        value={exp.status}
                        onChange={(e) => handleStatusQuickChange(exp, e.target.value)}
                        style={{ width: "130px", fontSize: "0.85rem" }}
                        disabled={!canEdit}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="met">Met</option>
                        <option value="partially_met">Partially Met</option>
                        <option value="dropped">Dropped</option>
                      </Form.Select>
                    </td>
                    <td>{exp.dueDate ? formatDate(exp.dueDate) : "-"}</td>
                    <td>{exp.owner ? exp.owner.name : "-"}</td>
                    {canEdit && (
                      <td className="text-end">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleOpenEditModal(exp)}
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(exp._id)}
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-5 text-muted">
              <FaBullseye size={40} className="mb-3 text-secondary" />
              <p className="mb-1 fw-semibold">No expectations defined yet</p>
              <small>Click "Add Expectation" to document client requirements and promised goals.</small>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Expectation Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingExpectation ? "Edit Expectation" : "Add Expectation"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="e.g., Deliver 15 high-converting social media creatives per month"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Detailed explanation of what the client expects..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Source</Form.Label>
                  <Form.Select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  >
                    <option value="kickoff">Kickoff Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="brief">Client Brief</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="met">Met</option>
                    <option value="partially_met">Partially Met</option>
                    <option value="dropped">Dropped</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Target Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Additional context or notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Expectation"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpectationsTab;
