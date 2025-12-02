import { useState, useEffect } from "react";
import { Modal, Form, Button, Row, Col, Badge, Alert } from "react-bootstrap";
import { FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";

// Work types by category
const workTypesByCategory = {
  "Digital Marketing": ["Social Media Post", "Campaign", "Ad Creative", "Content Writing"],
  "Development": ["Feature Development", "Bug Fix", "Code Review", "Testing", "Deployment"],
  "Design": ["Logo Design", "Banner Design", "Brochure Design", "UI/UX Design", "Illustration"],
  "Video": ["Video Editing", "Animation", "Motion Graphics", "Filming", "Post Production"],
  "General": ["Research", "Documentation", "Meeting", "Training", "Other"]
};

// Flatten all work types
const allWorkTypes = Object.values(workTypesByCategory).flat();

// Priority levels
const priorities = ["Low", "Medium", "High", "Urgent"];

// Digital Marketing specific fields (shown conditionally)
const postTypes = ["SMP", "Reel", "Story", "Carousel", "Video Post", "Text Post", "Poll"];
const platforms = ["Facebook", "Instagram", "LinkedIn", "Twitter", "YouTube", "Pinterest", "TikTok"];
const contentBuckets = [
  "Brand Promotion",
  "Festival Post",
  "Service Highlight",
  "Customer Testimonial",
  "Educational Content",
  "Behind the Scenes",
  "Engagement Post",
  "Promotional Offer",
];

const CreateWorkAssignmentForm = ({ show, onHide, onSubmit, project, employees = [] }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    workType: "Social Media Post",
    priority: "Medium",
    assignedTo: "",
    startDate: "",
    dueDate: "",
    
    // Digital Marketing specific (optional)
    postType: "",
    platforms: [],
    contentBucket: "",
    occasion: "",
    caption: "",
    hashtags: "",
    postingDate: "",
    
    referenceLinks: [""],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMarketingFields, setShowMarketingFields] = useState(true);

  // Check if work type is digital marketing related
  useEffect(() => {
    const isMarketing = workTypesByCategory["Digital Marketing"].includes(formData.workType);
    setShowMarketingFields(isMarketing);
    
    // Auto-fill title for marketing posts
    if (isMarketing && formData.postType && formData.platforms.length > 0) {
      const platformText = formData.platforms.join(", ");
      const occasionText = formData.occasion ? ` - ${formData.occasion}` : "";
      setFormData(prev => ({
        ...prev,
        title: `${formData.postType} for ${platformText}${occasionText}`.substring(0, 100)
      }));
    }
  }, [formData.workType, formData.postType, formData.platforms, formData.occasion]);

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

    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.workType) newErrors.workType = "Work type is required";
    if (!formData.assignedTo) newErrors.assignedTo = "Please assign to an employee";
    if (!formData.dueDate) newErrors.dueDate = "Due date is required";

    // Validate dates
    if (formData.startDate && formData.dueDate) {
      const startDate = new Date(formData.startDate);
      const dueDate = new Date(formData.dueDate);
      if (startDate >= dueDate) {
        newErrors.startDate = "Start date must be before due date";
      }
    }

    // Digital Marketing specific validation
    if (showMarketingFields) {
      if (!formData.postType) newErrors.postType = "Post type is required for social media posts";
      if (formData.platforms.length === 0) newErrors.platforms = "Select at least one platform";
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

    // Prepare data
    const cleanedData = {
      title: formData.title,
      description: formData.description,
      workType: formData.workType,
      priority: formData.priority,
      assignedTo: formData.assignedTo,
      startDate: formData.startDate || undefined,
      dueDate: formData.dueDate,
      referenceLinks: formData.referenceLinks.filter((link) => link.trim() !== ""),
    };

    // Add digital marketing fields if applicable
    if (showMarketingFields) {
      cleanedData.postType = formData.postType;
      cleanedData.platforms = formData.platforms;
      cleanedData.contentBucket = formData.contentBucket;
      cleanedData.occasion = formData.occasion;
      cleanedData.caption = formData.caption;
      cleanedData.hashtags = formData.hashtags;
      cleanedData.postingDate = formData.postingDate;
      cleanedData.brief = formData.description; // For backward compatibility
      cleanedData.designDeadline = formData.dueDate; // For backward compatibility
    }

    try {
      await onSubmit(cleanedData);
      handleClose();
    } catch (error) {
      console.error("Error creating work assignment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form and close
  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      workType: "Social Media Post",
      priority: "Medium",
      assignedTo: "",
      startDate: "",
      dueDate: "",
      postType: "",
      platforms: [],
      contentBucket: "",
      occasion: "",
      caption: "",
      hashtags: "",
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
        <Modal.Title>Create Work Assignment</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {project && (
            <Alert variant="info" className="mb-3">
              <strong>Project:</strong> {project.name}
              <br />
              <strong>Client:</strong> {project.client?.name || "N/A"}
            </Alert>
          )}

          <Row className="g-3">
            {/* Title */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>
                  Title <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Design Homepage Banner, Fix Login Bug, Create Instagram Reel"
                  isInvalid={!!errors.title}
                />
                <Form.Control.Feedback type="invalid">{errors.title}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Work Type */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Work Type <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select 
                  name="workType" 
                  value={formData.workType} 
                  onChange={handleChange} 
                  isInvalid={!!errors.workType}
                >
                  {Object.entries(workTypesByCategory).map(([category, types]) => (
                    <optgroup key={category} label={category}>
                      {types.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.workType}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Priority */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>Priority</Form.Label>
                <Form.Select name="priority" value={formData.priority} onChange={handleChange}>
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Description */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>
                  Description <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the work in detail. Include requirements, specifications, and any important notes..."
                  isInvalid={!!errors.description}
                />
                <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Digital Marketing Specific Fields */}
            {showMarketingFields && (
              <>
                <Col md={12}>
                  <hr />
                  <h6 className="text-muted">Social Media Details</h6>
                </Col>

                {/* Post Type */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>
                      Post Type <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select 
                      name="postType" 
                      value={formData.postType} 
                      onChange={handleChange} 
                      isInvalid={!!errors.postType}
                    >
                      <option value="">Select post type...</option>
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
                    <Form.Label>Content Bucket</Form.Label>
                    <Form.Select name="contentBucket" value={formData.contentBucket} onChange={handleChange}>
                      <option value="">Select content bucket...</option>
                      {contentBuckets.map((bucket) => (
                        <option key={bucket} value={bucket}>
                          {bucket}
                        </option>
                      ))}
                    </Form.Select>
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
                          <Badge key={platform} bg="info" className="me-1">
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
                    <Form.Label>Occasion / Campaign</Form.Label>
                    <Form.Control
                      type="text"
                      name="occasion"
                      value={formData.occasion}
                      onChange={handleChange}
                      placeholder="e.g., Diwali 2025, New Product Launch"
                    />
                  </Form.Group>
                </Col>

                {/* Caption */}
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Caption</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="caption"
                      value={formData.caption}
                      onChange={handleChange}
                      placeholder="Post caption (optional)"
                    />
                  </Form.Group>
                </Col>

                {/* Hashtags */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Hashtags</Form.Label>
                    <Form.Control
                      type="text"
                      name="hashtags"
                      value={formData.hashtags}
                      onChange={handleChange}
                      placeholder="#Example #Hashtags"
                    />
                  </Form.Group>
                </Col>

                {/* Posting Date */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Posting Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="postingDate"
                      value={formData.postingDate}
                      onChange={handleChange}
                      min={getTodayDate()}
                    />
                    <Form.Text className="text-muted">When will this be posted?</Form.Text>
                  </Form.Group>
                </Col>
              </>
            )}

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
                      placeholder="https://example.com/reference"
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
                  Add Reference
                </Button>
              </Form.Group>
            </Col>

            <Col md={12}>
              <hr />
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
                      {employee.name} {employee.designation ? `- ${employee.designation}` : ""}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.assignedTo}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Start Date */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={getTodayDate()}
                  isInvalid={!!errors.startDate}
                />
                <Form.Control.Feedback type="invalid">{errors.startDate}</Form.Control.Feedback>
              </Form.Group>
            </Col>

            {/* Due Date */}
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Due Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  min={formData.startDate || getTodayDate()}
                  isInvalid={!!errors.dueDate}
                />
                <Form.Control.Feedback type="invalid">{errors.dueDate}</Form.Control.Feedback>
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
            {isSubmitting ? "Creating..." : "Create Assignment"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateWorkAssignmentForm;
