import { useState, useEffect } from "react";
import { Modal, Form, Button, Row, Col, Badge, Alert, Spinner } from "react-bootstrap";
import { FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";
import { WorkloadCard, WorkloadWarning } from "../workload";
import { getBatchWorkload } from "../../api/workloadApi";

// Work types by category - mapped to department names
const defaultWorkTypesByCategory = {
  "Digital Marketing": ["Social Media Post", "Campaign", "Ad Creative", "Content Writing"],
  "Development": ["Feature Development", "Bug Fix", "Code Review", "Testing", "Deployment"],
  "Design": ["Logo Design", "Banner Design", "Brochure Design", "UI/UX Design", "Illustration"],
  "Video": ["Video Editing", "Animation", "Motion Graphics", "Filming", "Post Production"],
  "Video Production": ["Video Editing", "Animation", "Motion Graphics", "Filming", "Post Production"],
  "General": ["Research", "Documentation", "Meeting", "Training", "Other"]
};

// Department name mapping (handles variations)
const departmentMapping = {
  "digital marketing": "Digital Marketing",
  "development": "Development",
  "design": "Design",
  "video": "Video",
  "video production": "Video Production",
  "general": "General"
};

// Department-specific fields configuration
const departmentFieldsConfig = {
  "Digital Marketing": {
    showSocialMediaFields: true,
    customFields: ["postType", "platforms", "contentBucket", "occasion", "caption", "hashtags", "postingDate"]
  },
  "Development": {
    showSocialMediaFields: false,
    customFields: ["repository", "branch", "pullRequestUrl", "estimatedHours", "techStack"]
  },
  "Design": {
    showSocialMediaFields: false,
    customFields: ["designType", "dimensions", "fileFormat", "colorScheme", "revisions"]
  },
  "Video": {
    showSocialMediaFields: false,
    customFields: ["videoType", "duration", "resolution", "aspectRatio", "deliveryFormat"]
  },
  "Video Production": {
    showSocialMediaFields: false,
    customFields: ["videoType", "duration", "resolution", "aspectRatio", "deliveryFormat"]
  },
  "General": {
    showSocialMediaFields: false,
    customFields: []
  }
};

// Flatten all work types
const allWorkTypes = Object.values(defaultWorkTypesByCategory).flat();

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

const CreateWorkAssignmentForm = ({ show, onHide, onSubmit, project, employees = [], currentUser = null }) => {
  // State for custom work types
  const [customWorkTypes, setCustomWorkTypes] = useState({});
  const [showAddWorkTypeModal, setShowAddWorkTypeModal] = useState(false);
  const [newWorkTypeName, setNewWorkTypeName] = useState("");

  // Get department-specific work types (including custom ones)
  const getDepartmentWorkTypes = () => {
    if (!project?.department?.name) {
      return { ...defaultWorkTypesByCategory, ...customWorkTypes }; // Show all if no department
    }
    
    const deptName = project.department.name.toLowerCase();
    const mappedDept = departmentMapping[deptName];
    
    if (mappedDept && defaultWorkTypesByCategory[mappedDept]) {
      // Return only department-specific work types + General + custom types for this department
      const deptCustomTypes = customWorkTypes[mappedDept] || [];
      return {
        [mappedDept]: [...defaultWorkTypesByCategory[mappedDept], ...deptCustomTypes],
        "General": defaultWorkTypesByCategory["General"]
      };
    }
    
    // Fallback to General if department not found
    return {
      "General": defaultWorkTypesByCategory["General"]
    };
  };

  const departmentWorkTypes = getDepartmentWorkTypes();
  const firstWorkType = Object.values(departmentWorkTypes)[0]?.[0] || "Other";
  
  // Get department-specific fields configuration
  const getDepartmentFieldsConfig = () => {
    if (!project?.department?.name) {
      return departmentFieldsConfig["General"];
    }
    
    const deptName = project.department.name.toLowerCase();
    const mappedDept = departmentMapping[deptName];
    
    return departmentFieldsConfig[mappedDept] || departmentFieldsConfig["General"];
  };

  const deptFieldsConfig = getDepartmentFieldsConfig();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    workType: firstWorkType,
    priority: "Medium",
    assignedTo: "",
    startDate: "",
    dueDate: "",
    
    // Digital Marketing specific
    postType: "",
    platforms: [],
    contentBucket: "",
    occasion: "",
    caption: "",
    hashtags: "",
    postingDate: "",
    
    // Development specific
    repository: "",
    branch: "",
    pullRequestUrl: "",
    estimatedHours: "",
    techStack: "",
    
    // Design specific
    designType: "",
    dimensions: "",
    fileFormat: "",
    colorScheme: "",
    revisions: "",
    
    // Video specific
    videoType: "",
    duration: "",
    resolution: "",
    aspectRatio: "",
    deliveryFormat: "",
    
    referenceLinks: [""],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Workload state
  const [workloads, setWorkloads] = useState([]);
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const [showWorkloadSection, setShowWorkloadSection] = useState(true);
  
  // Filter employees by department
  const departmentEmployees = employees.filter(emp => {
    if (!project?.department?._id) return true; // Show all if no department
    return emp.department?._id === project.department._id || 
           emp.department === project.department._id;
  });

  // Auto-assign to current user if they're an employee (not manager)
  useEffect(() => {
    if (currentUser && !['admin', 'superadmin', 'hod'].includes(currentUser.role)) {
      // Check if user is project head
      const isProjectHead = project?.projectHead?._id === currentUser._id;
      
      // If not project head, auto-assign to themselves
      if (!isProjectHead && !formData.assignedTo) {
        setFormData(prev => ({
          ...prev,
          assignedTo: currentUser._id
        }));
      }
    }
  }, [currentUser, project, formData.assignedTo]);

  // Auto-fill title for marketing posts
  useEffect(() => {
    if (deptFieldsConfig.showSocialMediaFields && formData.postType && formData.platforms.length > 0) {
      const platformText = formData.platforms.join(", ");
      const occasionText = formData.occasion ? ` - ${formData.occasion}` : "";
      setFormData(prev => ({
        ...prev,
        title: `${formData.postType} for ${platformText}${occasionText}`.substring(0, 100)
      }));
    }
  }, [formData.postType, formData.platforms, formData.occasion, deptFieldsConfig.showSocialMediaFields]);

  // Load workload data for department employees only
  useEffect(() => {
    const loadWorkloads = async () => {
      if (!show || departmentEmployees.length === 0) return;
      
      setLoadingWorkload(true);
      try {
        const employeeIds = departmentEmployees.map(emp => emp._id);
        const response = await getBatchWorkload(employeeIds);
        setWorkloads(response.workloads || []);
      } catch (error) {
        console.error('Error loading workloads:', error);
        // Fail silently - workload is optional feature
      } finally {
        setLoadingWorkload(false);
      }
    };

    loadWorkloads();
  }, [show, departmentEmployees.length]);

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

    // Digital Marketing specific validation (optional - only if user fills them)
    // No required validation for marketing fields - they're all optional

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
      metadata: {} // Store department-specific data
    };

    // Add digital marketing fields if applicable
    if (deptFieldsConfig.showSocialMediaFields) {
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
    
    // Add development fields if applicable
    if (project?.department?.name?.toLowerCase() === 'development') {
      cleanedData.metadata.repository = formData.repository;
      cleanedData.metadata.branch = formData.branch;
      cleanedData.metadata.pullRequestUrl = formData.pullRequestUrl;
      cleanedData.metadata.estimatedHours = formData.estimatedHours;
      cleanedData.metadata.techStack = formData.techStack;
    }
    
    // Add design fields if applicable
    if (project?.department?.name?.toLowerCase() === 'design') {
      cleanedData.metadata.designType = formData.designType;
      cleanedData.metadata.dimensions = formData.dimensions;
      cleanedData.metadata.fileFormat = formData.fileFormat;
      cleanedData.metadata.colorScheme = formData.colorScheme;
      cleanedData.metadata.revisions = formData.revisions;
    }
    
    // Add video fields if applicable
    if (project?.department?.name?.toLowerCase() === 'video' || 
        project?.department?.name?.toLowerCase() === 'video production') {
      cleanedData.metadata.videoType = formData.videoType;
      cleanedData.metadata.duration = formData.duration;
      cleanedData.metadata.resolution = formData.resolution;
      cleanedData.metadata.aspectRatio = formData.aspectRatio;
      cleanedData.metadata.deliveryFormat = formData.deliveryFormat;
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
      workType: firstWorkType,
      priority: "Medium",
      assignedTo: "",
      startDate: "",
      dueDate: "",
      
      // Digital Marketing specific
      postType: "",
      platforms: [],
      contentBucket: "",
      occasion: "",
      caption: "",
      hashtags: "",
      postingDate: "",
      
      // Development specific
      repository: "",
      branch: "",
      pullRequestUrl: "",
      estimatedHours: "",
      techStack: "",
      
      // Design specific
      designType: "",
      dimensions: "",
      fileFormat: "",
      colorScheme: "",
      revisions: "",
      
      // Video specific
      videoType: "",
      duration: "",
      resolution: "",
      aspectRatio: "",
      deliveryFormat: "",
      
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
                <div className="d-flex gap-2">
                  <Form.Select 
                    name="workType" 
                    value={formData.workType} 
                    onChange={handleChange} 
                    isInvalid={!!errors.workType}
                    className="flex-grow-1"
                  >
                    {Object.entries(departmentWorkTypes).map(([category, types]) => (
                      <optgroup key={category} label={category}>
                        {types.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Form.Select>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => setShowAddWorkTypeModal(true)}
                    title="Add custom work type"
                  >
                    <FaPlus />
                  </Button>
                </div>
                <Form.Control.Feedback type="invalid">{errors.workType}</Form.Control.Feedback>
                {project?.department?.name && (
                  <Form.Text className="text-muted">
                    Showing work types for {project.department.name} department
                  </Form.Text>
                )}
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

            {/* Department-Specific Fields */}
            
            {/* Digital Marketing Specific Fields */}
            {deptFieldsConfig.showSocialMediaFields && (
              <>
                <Col md={12}>
                  <hr />
                  <h6 className="text-muted">Social Media Details</h6>
                </Col>

                {/* Post Type */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Post Type</Form.Label>
                    <Form.Select 
                      name="postType" 
                      value={formData.postType} 
                      onChange={handleChange}
                    >
                      <option value="">Select post type...</option>
                      {postTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Form.Select>
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
                    <Form.Label>Platforms</Form.Label>
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

            {/* Development Specific Fields */}
            {project?.department?.name?.toLowerCase() === 'development' && (
              <>
                <Col md={12}>
                  <hr />
                  <h6 className="text-muted">Development Details</h6>
                </Col>

                {/* Repository */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Repository</Form.Label>
                    <Form.Control
                      type="text"
                      name="repository"
                      value={formData.repository}
                      onChange={handleChange}
                      placeholder="e.g., github.com/company/project"
                    />
                  </Form.Group>
                </Col>

                {/* Branch */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Branch</Form.Label>
                    <Form.Control
                      type="text"
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      placeholder="e.g., feature/new-feature, bugfix/issue-123"
                    />
                  </Form.Group>
                </Col>

                {/* Pull Request URL */}
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Pull Request URL</Form.Label>
                    <Form.Control
                      type="url"
                      name="pullRequestUrl"
                      value={formData.pullRequestUrl}
                      onChange={handleChange}
                      placeholder="https://github.com/company/project/pull/123"
                    />
                  </Form.Group>
                </Col>

                {/* Estimated Hours */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Estimated Hours</Form.Label>
                    <Form.Control
                      type="number"
                      name="estimatedHours"
                      value={formData.estimatedHours}
                      onChange={handleChange}
                      placeholder="e.g., 8"
                      min="0"
                      step="0.5"
                    />
                    <Form.Text className="text-muted">
                      Estimated time to complete this task
                    </Form.Text>
                  </Form.Group>
                </Col>

                {/* Tech Stack */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Tech Stack</Form.Label>
                    <Form.Control
                      type="text"
                      name="techStack"
                      value={formData.techStack}
                      onChange={handleChange}
                      placeholder="e.g., React, Node.js, MongoDB"
                    />
                    <Form.Text className="text-muted">
                      Technologies used (comma-separated)
                    </Form.Text>
                  </Form.Group>
                </Col>
              </>
            )}

            {/* Design Specific Fields */}
            {project?.department?.name?.toLowerCase() === 'design' && (
              <>
                <Col md={12}>
                  <hr />
                  <h6 className="text-muted">Design Details</h6>
                </Col>

                {/* Design Type */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Design Type</Form.Label>
                    <Form.Select
                      name="designType"
                      value={formData.designType}
                      onChange={handleChange}
                    >
                      <option value="">Select type...</option>
                      <option value="Print">Print</option>
                      <option value="Digital">Digital</option>
                      <option value="Web">Web</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Branding">Branding</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* Dimensions */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Dimensions</Form.Label>
                    <Form.Control
                      type="text"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleChange}
                      placeholder="e.g., 1920x1080, A4, 1080x1080"
                    />
                  </Form.Group>
                </Col>

                {/* File Format */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>File Format</Form.Label>
                    <Form.Control
                      type="text"
                      name="fileFormat"
                      value={formData.fileFormat}
                      onChange={handleChange}
                      placeholder="e.g., PSD, AI, PNG, SVG"
                    />
                  </Form.Group>
                </Col>

                {/* Color Scheme */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Color Scheme</Form.Label>
                    <Form.Control
                      type="text"
                      name="colorScheme"
                      value={formData.colorScheme}
                      onChange={handleChange}
                      placeholder="e.g., Brand colors, Monochrome, Vibrant"
                    />
                  </Form.Group>
                </Col>

                {/* Revisions */}
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Number of Revisions</Form.Label>
                    <Form.Control
                      type="number"
                      name="revisions"
                      value={formData.revisions}
                      onChange={handleChange}
                      placeholder="e.g., 2"
                      min="0"
                    />
                    <Form.Text className="text-muted">
                      How many revision rounds are included?
                    </Form.Text>
                  </Form.Group>
                </Col>
              </>
            )}

            {/* Video Specific Fields */}
            {(project?.department?.name?.toLowerCase() === 'video' || 
              project?.department?.name?.toLowerCase() === 'video production') && (
              <>
                <Col md={12}>
                  <hr />
                  <h6 className="text-muted">Video Details</h6>
                </Col>

                {/* Video Type */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Video Type</Form.Label>
                    <Form.Select
                      name="videoType"
                      value={formData.videoType}
                      onChange={handleChange}
                    >
                      <option value="">Select type...</option>
                      <option value="Promotional">Promotional</option>
                      <option value="Explainer">Explainer</option>
                      <option value="Tutorial">Tutorial</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Documentary">Documentary</option>
                      <option value="Animation">Animation</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* Duration */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Duration</Form.Label>
                    <Form.Control
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="e.g., 30 seconds, 2 minutes"
                    />
                  </Form.Group>
                </Col>

                {/* Resolution */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Resolution</Form.Label>
                    <Form.Select
                      name="resolution"
                      value={formData.resolution}
                      onChange={handleChange}
                    >
                      <option value="">Select resolution...</option>
                      <option value="720p">720p (HD)</option>
                      <option value="1080p">1080p (Full HD)</option>
                      <option value="1440p">1440p (2K)</option>
                      <option value="2160p">2160p (4K)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* Aspect Ratio */}
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Aspect Ratio</Form.Label>
                    <Form.Select
                      name="aspectRatio"
                      value={formData.aspectRatio}
                      onChange={handleChange}
                    >
                      <option value="">Select aspect ratio...</option>
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="4:5">4:5 (Instagram)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                {/* Delivery Format */}
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Delivery Format</Form.Label>
                    <Form.Control
                      type="text"
                      name="deliveryFormat"
                      value={formData.deliveryFormat}
                      onChange={handleChange}
                      placeholder="e.g., MP4, MOV, AVI"
                    />
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

            {/* Team Workload Section */}
            {currentUser && ['admin', 'superadmin', 'hod'].includes(currentUser.role) || 
             project?.projectHead?._id === currentUser._id ? (
              <Col md={12}>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Team Workload</h6>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => setShowWorkloadSection(!showWorkloadSection)}
                    >
                      {showWorkloadSection ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  
                  {showWorkloadSection && (
                    <>
                      {loadingWorkload ? (
                        <div className="text-center py-3">
                          <Spinner animation="border" size="sm" className="me-2" />
                          <span className="text-muted">Loading workload data...</span>
                        </div>
                      ) : workloads.length > 0 ? (
                        <Row className="g-3">
                          {workloads.map((workload) => (
                            <Col key={workload.employee._id} md={6} lg={4} className="d-flex">
                              <WorkloadCard
                                employee={workload.employee}
                                workload={{
                                  totalActive: workload.totalActive,
                                  dueThisWeek: workload.dueThisWeek,
                                  overdue: workload.overdue,
                                  capacity: workload.capacity
                                }}
                                isSelected={formData.assignedTo === workload.employee._id}
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    assignedTo: workload.employee._id
                                  }));
                                }}
                              />
                            </Col>
                          ))}
                        </Row>
                      ) : (
                        <Alert variant="info">
                          No workload data available. Workload will be shown once employees have tasks.
                        </Alert>
                      )}
                    </>
                  )}
                </div>
                <hr />
              </Col>
            ) : null}

            {/* Assign To */}
            <Col md={12}>
              <Form.Group>
                <Form.Label>
                  Assign To <span className="text-danger">*</span>
                </Form.Label>
                {currentUser && !['admin', 'superadmin', 'hod'].includes(currentUser.role) && 
                 project?.projectHead?._id !== currentUser._id ? (
                  // Employee creating work for themselves - show read-only
                  <>
                    <Form.Control
                      type="text"
                      value={currentUser.name}
                      disabled
                    />
                    <Form.Text className="text-muted">
                      Team members can only create work for themselves
                    </Form.Text>
                  </>
                ) : (
                  // Manager/HoP - can assign to anyone
                  <>
                    <Form.Select
                      name="assignedTo"
                      value={formData.assignedTo}
                      onChange={handleChange}
                      isInvalid={!!errors.assignedTo}
                    >
                      <option value="">Select an employee...</option>
                      {departmentEmployees.map((employee) => (
                        <option key={employee._id} value={employee._id}>
                          {employee.name} {employee.designation ? `- ${employee.designation}` : ""}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{errors.assignedTo}</Form.Control.Feedback>
                    {project?.department?.name && (
                      <Form.Text className="text-muted">
                        Showing employees from {project.department.name} department
                      </Form.Text>
                    )}
                  </>
                )}
              </Form.Group>
              
              {/* Workload Warning */}
              {formData.assignedTo && workloads.length > 0 && (() => {
                const selectedWorkload = workloads.find(w => w.employee._id === formData.assignedTo);
                if (!selectedWorkload) return null;
                
                const { capacity, totalActive, dueThisWeek, overdue } = selectedWorkload;
                
                // Show warning for busy or overloaded employees
                if (capacity === 'busy' || capacity === 'overloaded') {
                  return (
                    <div className="mt-3">
                      <WorkloadWarning
                        employee={selectedWorkload.employee}
                        workload={{ totalActive, dueThisWeek, overdue, capacity }}
                        severity={capacity === 'overloaded' ? 'error' : capacity === 'busy' ? 'warning' : 'info'}
                      />
                    </div>
                  );
                }
                return null;
              })()}
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

      {/* Add Custom Work Type Modal */}
      <Modal show={showAddWorkTypeModal} onHide={() => setShowAddWorkTypeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Custom Work Type</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Work Type Name</Form.Label>
            <Form.Control
              type="text"
              value={newWorkTypeName}
              onChange={(e) => setNewWorkTypeName(e.target.value)}
              placeholder="e.g., API Integration, Database Migration"
              autoFocus
            />
            <Form.Text className="text-muted">
              This will be added to {project?.department?.name || 'your'} department's work types
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowAddWorkTypeModal(false);
            setNewWorkTypeName("");
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              if (newWorkTypeName.trim()) {
                const deptName = project?.department?.name;
                const mappedDept = departmentMapping[deptName?.toLowerCase()] || deptName;
                
                setCustomWorkTypes(prev => ({
                  ...prev,
                  [mappedDept]: [...(prev[mappedDept] || []), newWorkTypeName.trim()]
                }));
                
                setFormData(prev => ({
                  ...prev,
                  workType: newWorkTypeName.trim()
                }));
                
                setShowAddWorkTypeModal(false);
                setNewWorkTypeName("");
              }
            }}
            disabled={!newWorkTypeName.trim()}
          >
            Add Work Type
          </Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
};

export default CreateWorkAssignmentForm;
