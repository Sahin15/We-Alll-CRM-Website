import { useState, useEffect } from "react";
import { Card, Button, Badge, Modal, Form, Table, Spinner, Row, Col } from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaHandshake } from "react-icons/fa";
import { toast } from "react-toastify";
import commitmentApi from "../../../api/commitmentApi";
import { formatDate } from "../../../utils/helpers";

const CommitmentsSection = ({ project, canEdit }) => {
  const projectId = project?._id || project?.id;
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    owner: "",
    dueDate: "",
    status: "proposed",
    notes: "",
  });

  useEffect(() => {
    if (projectId) {
      fetchCommitments();
    }
  }, [projectId]);

  const fetchCommitments = async () => {
    try {
      setLoading(true);
      const res = await commitmentApi.getProjectCommitments(projectId);
      if (res.data && res.data.data) {
        setCommitments(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch commitments:", error);
      toast.error("Failed to load commitments");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCommitment(null);
    setFormData({
      title: "",
      description: "",
      owner: project?.projectHead?._id || project?.projectHead || "",
      dueDate: "",
      status: "proposed",
      notes: "",
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingCommitment(item);
    setFormData({
      title: item.title || "",
      description: item.description || "",
      owner: item.owner?._id || item.owner || "",
      dueDate: item.dueDate ? item.dueDate.split("T")[0] : "",
      status: item.status || "proposed",
      notes: item.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.owner) {
      toast.error("Title and owner are required");
      return;
    }

    setSaving(true);
    try {
      if (editingCommitment) {
        await commitmentApi.updateProjectCommitment(editingCommitment._id, formData);
        toast.success("Commitment updated successfully");
      } else {
        await commitmentApi.createProjectCommitment(projectId, formData);
        toast.success("Commitment created successfully");
      }
      setShowModal(false);
      fetchCommitments();
    } catch (error) {
      console.error("Error saving commitment:", error);
      toast.error(error.response?.data?.message || "Failed to save commitment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this commitment?")) return;
    try {
      await commitmentApi.deleteProjectCommitment(id);
      toast.success("Commitment deleted");
      fetchCommitments();
    } catch (error) {
      toast.error("Failed to delete commitment");
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    try {
      await commitmentApi.updateProjectCommitment(item._id, { status: newStatus });
      toast.success(`Commitment status updated to ${newStatus.replace("_", " ")}`);
      fetchCommitments();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "delivered":
        return <Badge bg="success">Delivered</Badge>;
      case "accepted":
      case "in_progress":
        return <Badge bg="primary">In Progress</Badge>;
      case "missed":
        return <Badge bg="danger">Missed</Badge>;
      case "cancelled":
        return <Badge bg="secondary">Cancelled</Badge>;
      case "proposed":
      default:
        return <Badge bg="warning" text="dark">Proposed</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" variant="primary" />
        <span className="ms-2 text-muted">Loading commitments...</span>
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center gap-2">
          <FaHandshake className="text-success" size={20} />
          <h5 className="mb-0 fw-bold">Project Commitments ({commitments.length})</h5>
        </div>
        {canEdit && (
          <Button variant="success" size="sm" onClick={handleOpenAddModal}>
            <FaPlus className="me-1" /> Add Commitment
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {commitments.length > 0 ? (
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Title</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Due Date</th>
                {canEdit && <th className="text-end">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {commitments.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className="fw-bold">{item.title}</div>
                    {item.description && (
                      <small className="text-muted d-block">{item.description}</small>
                    )}
                  </td>
                  <td>{item.owner ? item.owner.name : "-"}</td>
                  <td>
                    <Form.Select
                      size="sm"
                      value={item.status}
                      onChange={(e) => handleStatusChange(item, e.target.value)}
                      style={{ width: "130px", fontSize: "0.85rem" }}
                      disabled={!canEdit}
                    >
                      <option value="proposed">Proposed</option>
                      <option value="accepted">Accepted</option>
                      <option value="in_progress">In Progress</option>
                      <option value="delivered">Delivered</option>
                      <option value="missed">Missed</option>
                      <option value="cancelled">Cancelled</option>
                    </Form.Select>
                  </td>
                  <td>{item.dueDate ? formatDate(item.dueDate) : "-"}</td>
                  {canEdit && (
                    <td className="text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleOpenEditModal(item)}
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(item._id)}
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
          <div className="text-center py-4 text-muted">
            <FaHandshake size={36} className="mb-2 text-secondary" />
            <p className="mb-1 fw-semibold">No commitments added yet</p>
            <small>Document clear delivery commitments promised to the client.</small>
          </div>
        )}
      </Card.Body>

      {/* Modal Form */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingCommitment ? "Edit Commitment" : "Add Commitment"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="e.g., Deliver website homepage redesign prototype by Friday"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Details of what was promised..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>

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
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="proposed">Proposed</option>
                    <option value="accepted">Accepted</option>
                    <option value="in_progress">In Progress</option>
                    <option value="delivered">Delivered</option>
                    <option value="missed">Missed</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                type="text"
                placeholder="Additional notes or constraints..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Commitment"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default CommitmentsSection;
