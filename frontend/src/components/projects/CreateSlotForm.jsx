import { useState } from "react";
import { Modal, Form, Button, Row, Col, Badge, Alert } from "react-bootstrap";
import { FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";
import { postTypes, platforms, contentBuckets, designStatuses } from "../../data/mockSlots";

const CreateSlotForm = ({ show, onHide, onSubmit, project, employees = [] }) => {
  const [formData, setFormData] = useState({
    postType: "SMP",
    platforms: [],
    contentBucket: "Brand Promotion",
    occasion: "",
    brief: "",
    caption: "",
    hashtags: "",
    assignedTo: "",
    designDeadline: "",
    postingDate: "",
    referenceLinks: [""],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
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
    if (errors.platforms) {
      setErrors((prev) => ({ ...prev, platforms: "" }));
    }
  };

  // Handle reference link changes
  const handleReferenceLinkChange = (index, value) => {
    setFormData((prev) => {
      const referenceLinks = [...prev.referenceLinks];
      referenceLinks[index] = value;
      return { ...prev, referenceLinks };
    });
  };

  // Add new reference link field
  const addReferenceLink = () => {
    setFormData((prev) => ({
      ...prev,
      referenceLinks: [...prev.referenceLinks, ""],
    }));
  };

  // Remove reference link field
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

    // Validate dates
    if (formData.designDeadline && formData.postingDate) {
      const designDate = new Date(formData.designDeadline);
      const postingDate = new Date(formData.postingDate);
      if (designDate >= postingDate) {
        newErrors.designDeadline = "Design deadline must be before posting date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Filter out empty reference links
    const cleanedData = {
      ...formData,
      referenceLinks: formData.referenceLinks.filter((link) => link.trim() !== ""),
    };

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      onSubmit(cleanedData);
      handleClose();
    } catch (error) {
      console.error("Error creating slot:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form and close
  const handleClose = () => {
    setFormData({
      postType: "SMP",
      platforms: [],
      contentBucket: "Brand Promotion",
      occasion: "",
      brief: "",
      caption: "",
      hashtags: "",
      assignedTo: "",
      designDeadline: "",
      postingDate: "",
      referenceLinks: [""],
    });
    setErrors({});
    setIsSubmitting(false);
    onHide();
  };

  // Get today's date in YYYY-MM-DD format for min date
  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Create New Content Slot</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {project && (
            <Alert variant="info" className="mb-3">
              <strong>Project:</strong> {project.name}
              <br />
              <strong>Client:</strong> {project.client.name}
            </Alert>
          )}

          <Row className="g-3">
            {/* Post Type */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Post Type <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select name="postType" value={formData.postType} onChange={handleChange} isInvalid={!!errors.postType}>
                  {postTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.postType}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Content Bucket */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Content Bucket <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="contentBucket"
                  value={formData.contentBucket}
                  onChange={handleChange}
                  isInvalid={!!errors.contentBucket}
                >
                  {contentBuckets.map((bucket) => (
                    <option key={bucket} value={bucket}>
                      {bucket}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.contentBucket}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Platforms */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>
                  Platforms <span className="text-danger">*</span>
                </Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {platforms.map((platform) => (
                    <Form.Check
                      key={platform}
                      type="checkbox"
                      id={`platform-${platform}`}
                      label={platform}
                      checked={formData.platforms.includes(platform)}
                      onChange={() => handlePlatformChange(platform)}
                      className="me-3"
                    />
                  ))}
                </div>
                {errors.platforms && <div className="text-danger small mt-1">{errors.platforms}</div>}
                {formData.platforms.length > 0 && (
                  <div className="mt-2">
                    {formData.platforms.map((platform) => (
                      <Badge key={platform} bg="info" className="me-1 text-white">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                )}
              </Form.Group>
            </Col>

            {/* Occasion */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>Occasion / Campaign Name</Form.Label>
                <Form.Control
                  type="text"
                  name="occasion"
                  value={formData.occasion}
                  onChange={handleChange}
                  placeholder="e.g., Diwali 2025, New Menu Launch, Weekend Special"
                />
                <Form.Text className="text-muted">Optional: Specify if this is for a special event or campaign</Form.Text>
              </Form.Group>
            </Col>

            {/* Brief */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>
                  Brief / Creative Idea <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="brief"
                  value={formData.brief}
                  onChange={handleChange}
                  placeholder="Describe what needs to be created. Include details about visuals, style, mood, colors, etc."
                  isInvalid={!!errors.brief}
                />
                <Form.Control.Feedback type="invalid">{errors.brief}</Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Be specific! This helps the designer/creator understand exactly what you need.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Caption */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>Caption</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="caption"
                  value={formData.caption}
                  onChange={handleChange}
                  placeholder="Write the post caption here, or leave blank for the content writer to fill..."
                />
                <Form.Text className="text-muted">Optional: You can draft the caption or let the team write it</Form.Text>
              </Form.Group>
            </Col>

            {/* Hashtags */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>Hashtags</Form.Label>
                <Form.Control
                  type="text"
                  name="hashtags"
                  value={formData.hashtags}
                  onChange={handleChange}
                  placeholder="#Example #Hashtags #GoHere"
                />
                <Form.Text className="text-muted">Optional: Add relevant hashtags for the post</Form.Text>
              </Form.Group>
            </Col>

            {/* Reference Links */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>Reference Links</Form.Label>
                {formData.referenceLinks.map((link, index) => (
                  <div key={index} className="d-flex gap-2 mb-2">
                    <Form.Control
                      type="url"
                      value={link}
                      onChange={(e) => handleReferenceLinkChange(index, e.target.value)}
                      placeholder="https://example.com/inspiration"
                    />
                    {formData.referenceLinks.length > 1 && (
                      <Button variant="outline-danger" size="sm" onClick={() => removeReferenceLink(index)}>
                        <FaTrash />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline-secondary" size="sm" onClick={addReferenceLink}>
                  <FaPlus className="me-2" />
                  Add Reference Link
                </Button>
                <Form.Text className="text-muted d-block mt-1">
                  Optional: Add links to inspiration, examples, or reference materials
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Assign To */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>
                  Assign To <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  isInvalid={!!errors.assignedTo}
                >
                  <option value="">Select an employee...</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} - {employee.designation}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.assignedTo}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Design Deadline */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Design Deadline <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  name="designDeadline"
                  value={formData.designDeadline}
                  onChange={handleChange}
                  min={getTodayDate()}
                  isInvalid={!!errors.designDeadline}
                />
                <Form.Control.Feedback type="invalid">{errors.designDeadline}</Form.Control.Feedback>
                <Form.Text className="text-muted">When should the design be ready for review?</Form.Text>
              </Form.Group>
            </Col>

            {/* Posting Date */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Posting Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  name="postingDate"
                  value={formData.postingDate}
                  onChange={handleChange}
                  min={formData.designDeadline || getTodayDate()}
                  isInvalid={!!errors.postingDate}
                />
                <Form.Control.Feedback type="invalid">{errors.postingDate}</Form.Control.Feedback>
                <Form.Text className="text-muted">When will this be posted on social media?</Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            <FaTimes className="me-2" />
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            <FaSave className="me-2" />
            {isSubmitting ? "Creating..." : "Create Slot"}
          </Button>
        </Modal.Footer>
      </Form>

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

export default CreateSlotForm;
