import { useState } from 'react';
import { 
  Modal, 
  Form, 
  Button, 
  Row, 
  Col, 
  Alert, 
  Badge,
  Card
} from 'react-bootstrap';
import { 
  FaPaperPlane, 
  FaTimes, 
  FaUpload, 
  FaTrash,
  FaLightbulb
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { feedbackApi } from '../../api/feedbackApi';

const FeedbackForm = ({ show, onHide, onSuccess }) => {
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    priority: 'medium',
    isAnonymous: false,
    tags: ''
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = feedbackApi.getFeedbackCategories();
  const priorities = feedbackApi.getPriorityLevels();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => {
      // Validate file size (max 5MB per file)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });
    
    setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title cannot exceed 200 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const submitData = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      
      // Add files
      files.forEach(file => {
        submitData.append('attachments', file);
      });

      await feedbackApi.createFeedback(submitData);
      
      toast.success('Feedback submitted successfully! We appreciate your input.');
      
      // Reset form
      setFormData({
        category: '',
        title: '',
        description: '',
        priority: 'medium',
        isAnonymous: false,
        tags: ''
      });
      setFiles([]);
      setErrors({});
      
      if (onSuccess) {
        onSuccess();
      }
      
      onHide();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit feedback';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        category: '',
        title: '',
        description: '',
        priority: 'medium',
        isAnonymous: false,
        tags: ''
      });
      setFiles([]);
      setErrors({});
      onHide();
    }
  };

  const getCategoryInfo = (categoryValue) => {
    return categories.find(cat => cat.value === categoryValue);
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="d-flex align-items-center gap-2">
          <FaLightbulb />
          Submit Feedback
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <Alert variant="info" className="mb-4">
          <div className="d-flex align-items-start gap-2">
            <FaLightbulb className="mt-1" />
            <div>
              <strong>Your Voice Matters!</strong>
              <p className="mb-0 mt-1">
                Help us improve by sharing your feedback, reporting issues, or suggesting new features. 
                All feedback is reviewed by our team and helps make our system better for everyone.
              </p>
            </div>
          </div>
        </Alert>

        <Form onSubmit={handleSubmit}>
          {/* Category Selection */}
          <Row className="mb-4">
            <Col>
              <Form.Label className="fw-bold">
                Category <span className="text-danger">*</span>
              </Form.Label>
              <div className="category-grid">
                {categories.map(category => (
                  <Card
                    key={category.value}
                    className={`category-card ${formData.category === category.value ? 'selected' : ''}`}
                    onClick={() => handleInputChange('category', category.value)}
                    style={{ 
                      cursor: 'pointer',
                      border: formData.category === category.value 
                        ? '2px solid #007bff' 
                        : '2px solid #e9ecef',
                      backgroundColor: formData.category === category.value 
                        ? '#e3f2fd' 
                        : 'white',
                      transform: formData.category === category.value 
                        ? 'translateY(-2px)' 
                        : 'none',
                      boxShadow: formData.category === category.value 
                        ? '0 4px 8px rgba(0,123,255,0.2)' 
                        : 'none'
                    }}
                  >
                    <Card.Body className="p-3 text-center">
                      <div className="category-icon mb-2" style={{ fontSize: '1.5rem' }}>
                        {category.icon}
                      </div>
                      <div className="category-label small fw-bold">
                        {category.label}
                      </div>
                      {formData.category === category.value && (
                        <div className="mt-1">
                          <small className="text-primary fw-bold">✓ Selected</small>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                ))}
              </div>
              {errors.category && (
                <div className="text-danger small mt-1">{errors.category}</div>
              )}
            </Col>
          </Row>

          {/* Title and Priority */}
          <Row className="mb-3">
            <Col md={8}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  Title <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Brief summary of your feedback..."
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  isInvalid={!!errors.title}
                  maxLength={200}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.title}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  {formData.title.length}/200 characters
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold">Priority</Form.Label>
                <Form.Select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                >
                  {priorities.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Description */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">
              Description <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              placeholder="Please provide detailed information about your feedback, including steps to reproduce (for bugs) or specific suggestions..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              isInvalid={!!errors.description}
              maxLength={2000}
            />
            <Form.Control.Feedback type="invalid">
              {errors.description}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              {formData.description.length}/2000 characters
            </Form.Text>
          </Form.Group>

          {/* Tags */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Tags (Optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Add tags separated by commas (e.g., login, mobile, urgent)"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
            />
            <Form.Text className="text-muted">
              Help us categorize your feedback with relevant tags
            </Form.Text>
          </Form.Group>

          {/* File Attachments */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Attachments (Optional)</Form.Label>
            <div className="upload-area border rounded p-3">
              <Form.Control
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="mb-2"
              />
              <Form.Text className="text-muted">
                Upload screenshots, documents, or other relevant files (max 5 files, 5MB each)
              </Form.Text>
              
              {files.length > 0 && (
                <div className="mt-3">
                  <div className="fw-bold small mb-2">Selected Files:</div>
                  {files.map((file, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center bg-light p-2 rounded mb-1">
                      <div className="d-flex align-items-center gap-2">
                        <FaUpload className="text-primary" />
                        <span className="small">{file.name}</span>
                        <Badge bg="secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
                      </div>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Group>

          {/* Anonymous Option */}
          <Form.Group className="mb-4">
            <Form.Check
              type="checkbox"
              id="anonymous-feedback"
              label="Submit anonymously"
              checked={formData.isAnonymous}
              onChange={(e) => handleInputChange('isAnonymous', e.target.checked)}
            />
            <Form.Text className="text-muted">
              Your identity will be hidden from other users, but administrators can still see it for follow-up purposes.
            </Form.Text>
          </Form.Group>

          {/* Selected Category Info */}
          {formData.category && (
            <Alert variant="light" className="border">
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: '1.2rem' }}>
                  {getCategoryInfo(formData.category)?.icon}
                </span>
                <div>
                  <strong>{getCategoryInfo(formData.category)?.label}</strong>
                  <div className="small text-muted">
                    {formData.category === 'bug_report' && 'Please include steps to reproduce the issue and expected vs actual behavior.'}
                    {formData.category === 'feature_request' && 'Describe the feature you\'d like to see and how it would benefit users.'}
                    {formData.category === 'system_issue' && 'Include details about when the issue occurs and any error messages.'}
                    {formData.category === 'ui_ux_feedback' && 'Share your thoughts on the user interface and user experience.'}
                    {formData.category === 'performance_issue' && 'Describe what feels slow or unresponsive and when it happens.'}
                    {formData.category === 'general_complaint' && 'We value your concerns and will address them promptly.'}
                    {formData.category === 'suggestion' && 'Your suggestions help us improve - thank you for sharing!'}
                    {formData.category === 'compliment' && 'We love hearing what\'s working well - thank you!'}
                    {formData.category === 'other' && 'Please provide as much detail as possible about your feedback.'}
                  </div>
                </div>
              </div>
            </Alert>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer className="border-0 bg-light">
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          <FaTimes className="me-2" />
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={loading}
          className="d-flex align-items-center gap-2"
        >
          {loading ? (
            <>
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Submitting...
            </>
          ) : (
            <>
              <FaPaperPlane />
              Submit Feedback
            </>
          )}
        </Button>
      </Modal.Footer>

      {/* Custom Styles */}
      <style>{`
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        
        .category-card {
          border: 2px solid #e9ecef;
          transition: all 0.2s ease;
        }
        
        .category-card:hover {
          border-color: #007bff;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,123,255,0.1);
        }
        
        .category-card.selected {
          border-color: #007bff;
          background-color: #e3f2fd;
        }
        
        .category-icon {
          font-size: 1.5rem;
        }
        
        .category-label {
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .upload-area {
          background-color: #f8f9fa;
          border: 2px dashed #dee2e6;
          transition: border-color 0.2s ease;
        }
        
        .upload-area:hover {
          border-color: #007bff;
        }
      `}</style>
    </Modal>
  );
};

export default FeedbackForm;