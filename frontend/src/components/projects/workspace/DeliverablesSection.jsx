import { useState } from "react";
import { Card, Button, Badge, Modal, Form, Table, ProgressBar, Row, Col } from "react-bootstrap";
import { FaPlus, FaEdit, FaBoxOpen } from "react-icons/fa";
import { toast } from "react-toastify";
import projectApi from "../../../api/projectApi";
import { formatDate } from "../../../utils/helpers";

const DeliverablesSection = ({ project, onRefresh, canEdit }) => {
  const deliverables = project?.deliverables || [];
  const projectId = project?._id || project?.id;

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    plannedDate: "",
    progress: 0,
    monthKey: "",
    notes: "",
  });

  const handleOpenAddModal = () => {
    setEditingDeliverable(null);
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    setFormData({
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      plannedDate: "",
      progress: 0,
      monthKey: currentMonthKey,
      notes: "",
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingDeliverable(item);
    setFormData({
      title: item.title || "",
      description: item.description || "",
      status: item.status || "pending",
      priority: item.priority || "medium",
      plannedDate: item.plannedDate ? item.plannedDate.split("T")[0] : "",
      progress: item.progress || 0,
      monthKey: item.monthKey || "",
      notes: item.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Deliverable title is required");
      return;
    }

    setSaving(true);
    try {
      if (editingDeliverable) {
        await projectApi.updateDeliverable(projectId, editingDeliverable._id, formData);
        toast.success("Deliverable updated successfully");
      } else {
        await projectApi.addDeliverable(projectId, formData);
        toast.success("Deliverable added successfully");
      }
      setShowModal(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error saving deliverable:", error);
      toast.error(error.response?.data?.message || "Failed to save deliverable");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    try {
      await projectApi.updateDeliverable(projectId, item._id, { status: newStatus });
      toast.success(`Deliverable status updated to ${newStatus.replace("_", " ")}`);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error("Failed to update deliverable status");
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

  return (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center gap-2">
          <FaBoxOpen className="text-primary" size={20} />
          <h5 className="mb-0 fw-bold">Promised Deliverables ({deliverables.length})</h5>
        </div>
        {canEdit && (
          <Button variant="success" size="sm" onClick={handleOpenAddModal}>
            <FaPlus className="me-1" /> Add Deliverable
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {deliverables.length > 0 ? (
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Title</th>
                <th>Priority</th>
                <th>Planned Month</th>
                <th>Progress %</th>
                <th>Status</th>
                <th>Planned Date</th>
                {canEdit && <th className="text-end">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {deliverables.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className="fw-bold">{item.title}</div>
                    {item.description && (
                      <small className="text-muted d-block">{item.description}</small>
                    )}
                  </td>
                  <td>{getPriorityBadge(item.priority || "medium")}</td>
                  <td>
                    {item.monthKey ? (
                      <Badge bg="light" text="dark" className="border">
                        {item.monthKey}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ minWidth: "140px" }}>
                    <div className="d-flex align-items-center gap-2">
                      <ProgressBar
                        now={item.progress || 0}
                        variant={item.progress === 100 ? "success" : "primary"}
                        style={{ height: "8px", flexGrow: 1 }}
                      />
                      <small className="fw-semibold">{item.progress || 0}%</small>
                    </div>
                  </td>
                  <td>
                    <Form.Select
                      size="sm"
                      value={item.status}
                      onChange={(e) => handleStatusChange(item, e.target.value)}
                      style={{ width: "140px", fontSize: "0.85rem" }}
                      disabled={!canEdit}
                    >
                      <option value="pending">Pending</option>
                      <option value="delivered">Delivered</option>
                      <option value="approved">Approved</option>
                      <option value="revision_needed">Revision Needed</option>
                    </Form.Select>
                  </td>
                  <td>{item.plannedDate ? formatDate(item.plannedDate) : "-"}</td>
                  {canEdit && (
                    <td className="text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleOpenEditModal(item)}
                      >
                        <FaEdit />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted">
            <FaBoxOpen size={36} className="mb-2 text-secondary" />
            <p className="mb-1 fw-semibold">No deliverables added yet</p>
            <small>Define concrete project outputs and track progress towards completion.</small>
          </div>
        )}
      </Card.Body>

      {/* Deliverable Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingDeliverable ? "Edit Deliverable" : "Add Deliverable"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="e.g., Brand Guidelines PDF & Logo Assets Bundle"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Details of what will be produced..."
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
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="delivered">Delivered</option>
                    <option value="approved">Approved</option>
                    <option value="revision_needed">Revision Needed</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Progress %</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) =>
                      setFormData({ ...formData, progress: Number(e.target.value) })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Planned Target Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.plannedDate}
                    onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Month Key (YYYY-MM)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., 2026-08"
                    value={formData.monthKey}
                    onChange={(e) => setFormData({ ...formData, monthKey: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                type="text"
                placeholder="Additional notes..."
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
              {saving ? "Saving..." : "Save Deliverable"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default DeliverablesSection;
