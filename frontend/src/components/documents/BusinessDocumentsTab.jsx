import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Badge,
  Modal,
  Form,
  Table,
  Spinner,
  Row,
  Col,
} from "react-bootstrap";
import { FaPlus, FaFolderOpen, FaDownload, FaTrash, FaFileAlt, FaHistory } from "react-icons/fa";
import { toast } from "react-toastify";
import businessDocumentApi from "../../api/businessDocumentApi";
import { formatDate } from "../../utils/helpers";

const BusinessDocumentsTab = ({ clientId, projectId, canEdit }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "contract",
    path: "",
    description: "",
    replaces: "",
  });

  useEffect(() => {
    if (clientId || projectId) {
      fetchDocuments();
    }
  }, [clientId, projectId, categoryFilter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (projectId) params.project = projectId;
      if (clientId) params.client = clientId;
      if (categoryFilter !== "all") params.category = categoryFilter;

      const res = await businessDocumentApi.getBusinessDocuments(params);
      if (res.data && res.data.data) {
        setDocuments(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch business documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = (replacesDoc = null) => {
    setFormData({
      title: replacesDoc ? replacesDoc.title : "",
      category: replacesDoc ? replacesDoc.category : "contract",
      path: "",
      description: replacesDoc ? `Version update for ${replacesDoc.title}` : "",
      replaces: replacesDoc ? replacesDoc._id : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.path.trim()) {
      toast.error("Title and Document URL/Path are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        client: clientId || null,
        project: projectId || null,
      };

      await businessDocumentApi.createBusinessDocument(payload);
      toast.success(
        formData.replaces
          ? "Document version updated successfully"
          : "Business document recorded successfully"
      );
      setShowModal(false);
      fetchDocuments();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error(error.response?.data?.message || "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this document?")) return;
    try {
      await businessDocumentApi.deleteBusinessDocument(id);
      toast.success("Document removed");
      fetchDocuments();
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "contract":
        return <Badge bg="primary">Contract</Badge>;
      case "proposal":
        return <Badge bg="info">Proposal</Badge>;
      case "client_brief":
        return <Badge bg="warning" text="dark">Client Brief</Badge>;
      case "design":
        return <Badge bg="purple" style={{ backgroundColor: "#6f42c1", color: "#fff" }}>Design</Badge>;
      case "technical":
        return <Badge bg="dark">Technical</Badge>;
      default:
        return <Badge bg="secondary">{cat.replace("_", " ")}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading documents library...</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-3">
            <FaFolderOpen className="text-primary" size={20} />
            <h5 className="mb-0 fw-bold">Document Library ({documents.length})</h5>
            <Form.Select
              size="sm"
              style={{ width: "160px" }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="contract">Contracts</option>
              <option value="proposal">Proposals</option>
              <option value="client_brief">Client Briefs</option>
              <option value="design">Design Files</option>
              <option value="technical">Technical Docs</option>
              <option value="approval">Approvals</option>
              <option value="other">Other</option>
            </Form.Select>
          </div>
          {canEdit && (
            <Button variant="primary" size="sm" onClick={() => handleOpenAddModal()}>
              <FaPlus className="me-1" /> Add Document
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          {documents.length > 0 ? (
            <Table responsive hover className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc._id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <FaFileAlt className="text-secondary" />
                        <div>
                          <a
                            href={doc.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="fw-bold text-decoration-none"
                          >
                            {doc.title}
                          </a>
                          {doc.description && (
                            <small className="text-muted d-block">{doc.description}</small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{getCategoryBadge(doc.category)}</td>
                    <td>
                      <Badge bg="light" text="dark" className="border">
                        v{doc.version || 1}
                      </Badge>
                    </td>
                    <td>{doc.uploadedBy ? doc.uploadedBy.name : "-"}</td>
                    <td>{formatDate(doc.uploadedAt || doc.createdAt)}</td>
                    <td className="text-end">
                      <a
                        href={doc.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-primary btn-sm me-2"
                        title="Download / View"
                      >
                        <FaDownload />
                      </a>
                      {canEdit && (
                        <>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="me-2"
                            title="Upload New Version"
                            onClick={() => handleOpenAddModal(doc)}
                          >
                            <FaHistory />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            title="Delete"
                            onClick={() => handleDelete(doc._id)}
                          >
                            <FaTrash />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-5 text-muted">
              <FaFolderOpen size={40} className="mb-3 text-secondary" />
              <p className="mb-1 fw-semibold">No documents uploaded yet</p>
              <small>Upload contracts, client briefs, proposals, and design assets.</small>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Document Upload Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {formData.replaces ? "Upload New Version" : "Add Business Document"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Document Title *</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="e.g., Master Services Agreement 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Category *</Form.Label>
                  <Form.Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="contract">Contract</option>
                    <option value="proposal">Proposal</option>
                    <option value="client_brief">Client Brief</option>
                    <option value="design">Design Asset</option>
                    <option value="technical">Technical Spec</option>
                    <option value="approval">Approval Document</option>
                    <option value="report">Report</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Document URL / File Path *</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    placeholder="https://s3.amazonaws.com/... or upload URL"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description / Revision Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Brief summary of document contents or version changes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Document"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default BusinessDocumentsTab;
