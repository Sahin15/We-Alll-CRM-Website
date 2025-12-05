import { useState } from "react";
import { Modal, Form, Button, Row, Col, Badge, Card, ListGroup, Alert, Tab, Tabs } from "react-bootstrap";
import {
  FaSave,
  FaTimes,
  FaEdit,
  FaCheck,
  FaPlus,
  FaTrash,
  FaComment,
  FaFileUpload,
  FaExternalLinkAlt,
  FaClock,
  FaUser,
  FaCalendar,
} from "react-icons/fa";
import { postTypes, platforms, contentBuckets, designStatuses, statusColors } from "../../data/mockSlots";

const SlotDetails = ({ show, onHide, slot, onUpdate, isProjectHead = false, currentUser = null }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(slot || {});
  const [errors, setErrors] = useState({});
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Update formData when slot changes
  useState(() => {
    if (slot) {
      setFormData(slot);
    }
  }, [slot]);

  if (!slot) return null;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle platform checkbox changes
  const handlePlatformChange = (platform) => {
    setFormData((prev) => {
      const platforms = prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform];
      return { ...prev, platforms };
    });
  };

  // Handle reference link changes
  const handleReferenceLinkChange = (index, value) => {
    setFormData((prev) => {
      const referenceLinks = [...prev.referenceLinks];
      referenceLinks[index] = value;
      return { ...prev, referenceLinks };
    });
  };

  // Add new reference link
  const addReferenceLink = () => {
    setFormData((prev) => ({
      ...prev,
      referenceLinks: [...prev.referenceLinks, ""],
    }));
  };

  // Remove reference link
  const removeReferenceLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      referenceLinks: prev.referenceLinks.filter((_, i) => i !== index),
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.postType) newErrors.postType = "Post type is required";
    if (formData.platforms.length === 0) newErrors.platforms = "Select at least one platform";
    if (!formData.contentBucket) newErrors.contentBucket = "Content bucket is required";
    if (!formData.brief.trim()) newErrors.brief = "Brief is required";
    if (!formData.assignedTo) newErrors.assignedTo = "Please assign to an employee";
    if (!formData.designDeadline) newErrors.designDeadline = "Design deadline is required";
    if (!formData.postingDate) newErrors.postingDate = "Posting date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    onUpdate(formData);
    setIsEditing(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setFormData(slot);
    setErrors({});
    setIsEditing(false);
  };

  // Handle add comment
  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment = {
      user: currentUser || { name: "Current User" },
      text: newComment,
      timestamp: new Date().toISOString(),
    };

    const updatedSlot = {
      ...formData,
      comments: [...(formData.comments || []), comment],
    };

    setFormData(updatedSlot);
    onUpdate(updatedSlot);
    setNewComment("");
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setUploadingFile(true);
    try {
      // Import slotApi dynamically to avoid circular dependencies
      const slotApi = await import('../../api/slotApi');
      const response = await slotApi.uploadCreative(slot._id, selectedFile);
      
      // Update slot with new creative
      const updatedSlot = response.data;
      setFormData(updatedSlot);
      onUpdate(updatedSlot);
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('creative-file-input');
      if (fileInput) fileInput.value = '';
      
      // Show success message (assuming toast is available)
      if (window.toast) {
        window.toast.success('Creative uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      if (window.toast) {
        window.toast.error(error.message || 'Failed to upload creative');
      }
    } finally {
      setUploadingFile(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Check if overdue
  const isOverdue = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const designDeadline = new Date(slot.designDeadline);
    const postingDate = new Date(slot.postingDate);

    const designOverdue =
      designDeadline < today && slot.designStatus !== "Approved" && slot.postingStatus !== "Posted";
    const postingOverdue = postingDate < today && slot.postingStatus !== "Posted";

    return designOverdue || postingOverdue;
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? "Edit Slot" : "Slot Details"}
          {isOverdue() && (
            <Badge bg="danger" className="ms-2">
              Overdue
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
          {/* Details Tab */}
          <Tab eventKey="details" title="Details">
            {/* Project & Client Info */}
            <Alert variant="info" className="mb-3">
              <Row>
                <Col md={6}>
                  <strong>Project:</strong> {slot.project?.name || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Client:</strong> {slot.client?.name || 'N/A'}
                </Col>
              </Row>
            </Alert>

            {/* Status and Dates */}
            <Card className="mb-3">
              <Card.Body>
                <Row className="g-3">
                  <Col md={3}>
                    <div className="text-muted small">Work Type</div>
                    <Badge bg="secondary">{slot.workType || slot.postType}</Badge>
                  </Col>
                  <Col md={3}>
                    <div className="text-muted small">Status</div>
                    {isEditing && isProjectHead ? (
                      <Form.Select
                        name="status"
                        value={formData.status || formData.designStatus}
                        onChange={handleChange}
                        size="sm"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Revision">Revision</option>
                        <option value="Approved">Approved</option>
                        <option value="Completed">Completed</option>
                      </Form.Select>
                    ) : (
                      <Badge bg="light" text="dark" style={{ backgroundColor: statusColors[slot.status || slot.designStatus] }}>
                        {slot.status || slot.designStatus}
                      </Badge>
                    )}
                  </Col>
                  <Col md={3}>
                    <div className="text-muted small">Priority</div>
                    <Badge bg={
                      slot.priority === 'Urgent' ? 'danger' :
                      slot.priority === 'High' ? 'warning' :
                      slot.priority === 'Medium' ? 'info' : 'secondary'
                    }>
                      {slot.priority || 'Medium'}
                    </Badge>
                  </Col>
                  <Col md={3}>
                    <div className="text-muted small">
                      <FaCalendar className="me-1" />
                      Due Date
                    </div>
                    <div className="fw-semibold">{formatDate(slot.dueDate || slot.postingDate)}</div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Row className="g-3">
              {/* Title */}
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Title</Form.Label>
                  <div className="fw-semibold">{slot.title || slot.brief?.substring(0, 100)}</div>
                </Form.Group>
              </Col>

              {/* Description */}
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Card>
                    <Card.Body>{slot.description || slot.brief}</Card.Body>
                  </Card>
                </Form.Group>
              </Col>

              {/* Digital Marketing Fields */}
              {slot.platforms && slot.platforms.length > 0 && (
                <>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>Platforms</Form.Label>
                      <div className="d-flex flex-wrap gap-1">
                        {slot.platforms.map((platform) => (
                          <Badge key={platform} bg="info" className="text-white">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </Form.Group>
                  </Col>

                  {slot.postType && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Post Type</Form.Label>
                        <div><Badge bg="secondary">{slot.postType}</Badge></div>
                      </Form.Group>
                    </Col>
                  )}

                  {slot.occasion && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Occasion / Campaign</Form.Label>
                        <div>{slot.occasion}</div>
                      </Form.Group>
                    </Col>
                  )}

                  {slot.caption && (
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Caption</Form.Label>
                        <Card>
                          <Card.Body>{slot.caption}</Card.Body>
                        </Card>
                      </Form.Group>
                    </Col>
                  )}

                  {slot.hashtags && (
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Hashtags</Form.Label>
                        <div>{slot.hashtags}</div>
                      </Form.Group>
                    </Col>
                  )}
                </>
              )}

              {/* Development Fields */}
              {slot.metadata?.repository && (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Repository</Form.Label>
                      <div>
                        <a href={`https://${slot.metadata.repository}`} target="_blank" rel="noopener noreferrer">
                          {slot.metadata.repository}
                        </a>
                      </div>
                    </Form.Group>
                  </Col>

                  {slot.metadata.branch && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Branch</Form.Label>
                        <div><Badge bg="secondary">{slot.metadata.branch}</Badge></div>
                      </Form.Group>
                    </Col>
                  )}

                  {slot.metadata.pullRequestUrl && (
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Pull Request</Form.Label>
                        <div>
                          <a href={slot.metadata.pullRequestUrl} target="_blank" rel="noopener noreferrer">
                            {slot.metadata.pullRequestUrl}
                          </a>
                        </div>
                      </Form.Group>
                    </Col>
                  )}

                  {slot.metadata.techStack && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Tech Stack</Form.Label>
                        <div>{slot.metadata.techStack}</div>
                      </Form.Group>
                    </Col>
                  )}

                  {slot.metadata.estimatedHours && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Estimated Hours</Form.Label>
                        <div>{slot.metadata.estimatedHours} hours</div>
                      </Form.Group>
                    </Col>
                  )}
                </>
              )}

              {/* Design Fields */}
              {slot.metadata?.designType && (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Design Type</Form.Label>
                      <div><Badge bg="info">{slot.metadata.designType}</Badge></div>
                    </Form.Group>
                  </Col>

                  {slot.metadata.dimensions && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Dimensions</Form.Label>
                        <div>{slot.metadata.dimensions}</div>
                      </Form.Group>
                    </Col>
                  )}

                  {slot.metadata.fileFormat && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>File Format</Form.Label>
                        <div>{slot.metadata.fileFormat}</div>
                      </Form.Group>
                    </Col>
                  )}

                  {slot.metadata.colorScheme && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Color Scheme</Form.Label>
                        <div>{slot.metadata.colorScheme}</div>
                      </Form.Group>
                    </Col>
                  )}
                </>
              )}

              {/* Video Fields */}
              {slot.metadata?.videoType && (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Video Type</Form.Label>
                      <div><Badge bg="info">{slot.metadata.videoType}</Badge></div>
                    </Form.Group>
                  </Col>

                  {slot.metadata.duration && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Duration</Form.Label>
                        <div>{slot.metadata.duration}</div>
                      </Form.Group>
                    </Col>
                  )}

                  {slot.metadata.resolution && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Resolution</Form.Label>
                        <div>{slot.metadata.resolution}</div>
                      </Form.Group>
                    </Col>
                  )}

                  {slot.metadata.aspectRatio && (
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Aspect Ratio</Form.Label>
                        <div>{slot.metadata.aspectRatio}</div>
                      </Form.Group>
                    </Col>
                  )}
                </>
              )}

              {/* Assigned To */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <FaUser className="me-2" />
                    Assigned To
                  </Form.Label>
                  <div>
                    <strong>{slot.assignedTo?.name || 'Unassigned'}</strong>
                    {slot.assignedTo?.designation && (
                      <div className="text-muted small">{slot.assignedTo.designation}</div>
                    )}
                  </div>
                </Form.Group>
              </Col>

              {/* Created By */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Created By</Form.Label>
                  <div>
                    <strong>{slot.createdBy?.name || 'Unknown'}</strong>
                    {slot.createdAt && (
                      <div className="text-muted small">{formatTimestamp(slot.createdAt)}</div>
                    )}
                  </div>
                </Form.Group>
              </Col>
            </Row>
          </Tab>

          {/* Reference Links Tab */}
          <Tab eventKey="references" title={`References (${slot.referenceLinks?.length || 0})`}>
            <Form.Group>
              <Form.Label>Reference Links</Form.Label>
              {isEditing && isProjectHead ? (
                <div>
                  {formData.referenceLinks?.map((link, index) => (
                    <div key={index} className="d-flex gap-2 mb-2">
                      <Form.Control
                        type="url"
                        value={link}
                        onChange={(e) => handleReferenceLinkChange(index, e.target.value)}
                        placeholder="https://example.com"
                      />
                      <Button variant="outline-danger" size="sm" onClick={() => removeReferenceLink(index)}>
                        <FaTrash />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline-secondary" size="sm" onClick={addReferenceLink}>
                    <FaPlus className="me-2" />
                    Add Link
                  </Button>
                </div>
              ) : (
                <ListGroup>
                  {slot.referenceLinks && slot.referenceLinks.length > 0 ? (
                    slot.referenceLinks.map((link, index) => (
                      <ListGroup.Item key={index}>
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          <FaExternalLinkAlt className="me-2" />
                          {link}
                        </a>
                      </ListGroup.Item>
                    ))
                  ) : (
                    <em className="text-muted">No reference links</em>
                  )}
                </ListGroup>
              )}
            </Form.Group>
          </Tab>

          {/* Creatives Tab */}
          <Tab eventKey="creatives" title={`Creatives (${slot.creatives?.length || 0})`}>
            <div className="mb-3">
              <h6>Uploaded Creatives</h6>
              {slot.creatives && slot.creatives.length > 0 ? (
                <ListGroup>
                  {slot.creatives.map((creative, index) => (
                    <ListGroup.Item key={index}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <Badge bg="secondary" className="me-2">
                            {creative.type}
                          </Badge>
                          <a href={creative.url} target="_blank" rel="noopener noreferrer">
                            View {creative.type}
                          </a>
                          <div className="text-muted small">Uploaded: {formatTimestamp(creative.uploadedAt)}</div>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <Alert variant="secondary">
                  <FaFileUpload className="me-2" />
                  No creatives uploaded yet
                </Alert>
              )}
            </div>

            {/* Upload Creative Section */}
            <Card className="mt-3">
              <Card.Body>
                <h6>Upload New Creative</h6>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="file"
                    id="creative-file-input"
                    onChange={handleFileSelect}
                    accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                    disabled={uploadingFile}
                  />
                  <Form.Text className="text-muted">
                    Accepted: Images, Videos, PDF, Word, PowerPoint, Excel (Max 50MB)
                  </Form.Text>
                </Form.Group>
                {selectedFile && (
                  <Alert variant="info" className="mb-3">
                    <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </Alert>
                )}
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleFileUpload}
                  disabled={!selectedFile || uploadingFile}
                >
                  {uploadingFile ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaFileUpload className="me-2" />
                      Upload Creative
                    </>
                  )}
                </Button>
              </Card.Body>
            </Card>
          </Tab>

          {/* Comments Tab */}
          <Tab eventKey="comments" title={`Comments (${slot.comments?.length || 0})`}>
            <div className="mb-3">
              {slot.comments && slot.comments.length > 0 ? (
                <ListGroup>
                  {slot.comments.map((comment, index) => (
                    <ListGroup.Item key={index}>
                      <div className="d-flex justify-content-between">
                        <strong>{comment.user.name}</strong>
                        <small className="text-muted">{formatTimestamp(comment.timestamp)}</small>
                      </div>
                      <div className="mt-2">{comment.text}</div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <Alert variant="secondary">No comments yet</Alert>
              )}
            </div>

            {/* Add Comment */}
            <Card>
              <Card.Body>
                <Form.Group>
                  <Form.Label>Add Comment</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add feedback or comments..."
                  />
                  <Button variant="primary" size="sm" className="mt-2" onClick={handleAddComment}>
                    <FaComment className="me-2" />
                    Add Comment
                  </Button>
                </Form.Group>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <FaTimes className="me-2" />
          Close
        </Button>

        {isProjectHead && (
          <>
            {isEditing ? (
              <>
                <Button variant="outline-secondary" onClick={handleCancelEdit}>
                  Cancel Edit
                </Button>
                <Button variant="success" onClick={handleSave}>
                  <FaSave className="me-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button variant="warning" onClick={() => setIsEditing(true)}>
                <FaEdit className="me-2" />
                Edit Slot
              </Button>
            )}
          </>
        )}
      </Modal.Footer>

      <style>{`
        .modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </Modal>
  );
};

export default SlotDetails;
