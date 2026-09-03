import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaFileAlt, FaPaperclip } from 'react-icons/fa';
import { leaveApi } from '../../api/leaveApi';
import { LEAVE_TYPE_DETAILS, MAX_PHOTO_UPLOAD_BYTES, MAX_PHOTO_UPLOAD_MB } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { getAllowedLeaveTypes, isFullTimeEmployee } from '../../utils/leaveEligibility';
import { getLeaveRequestDays } from '../../utils/leaveDays';
import moment from 'moment';
import '../../pages/leaves/LeaveManagement.css';

const CreateLeaveModal = ({ show, onHide, onLeaveCreated }) => {
  const { user } = useAuth();
  const allowedLeaveTypes = getAllowedLeaveTypes(user);

  const [formData, setFormData] = useState({
    leaveType: isFullTimeEmployee(user) ? 'casual' : 'unpaid',
    startDate: '',
    endDate: '',
    reason: '',
    attachments: []
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const leaveTypes = Object.entries(LEAVE_TYPE_DETAILS)
    .filter(([value]) => allowedLeaveTypes.includes(value))
    .map(([value, details]) => ({
    value,
    label: details.name,
    description: details.description,
  }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (next.leaveType === 'half_day' && (name === 'startDate' || name === 'leaveType')) {
        next.endDate = name === 'startDate' ? value : prev.startDate || prev.endDate;
      }
      return next;
    });
    setError('');
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    const maxSize = MAX_PHOTO_UPLOAD_BYTES;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    files.forEach(file => {
      if (file.size > maxSize) {
        setError(`File "${file.name}" is too large. Maximum size is ${MAX_PHOTO_UPLOAD_MB}MB.`);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setError(`File "${file.name}" has an invalid format. Allowed: PDF, DOC, DOCX, JPG, PNG.`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setError('');
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const calculateDays = () =>
    getLeaveRequestDays(formData.leaveType, formData.startDate, formData.endDate);

  const validateForm = () => {
    if (!formData.leaveType) {
      setError('Please select a leave type');
      return false;
    }
    if (!formData.startDate) {
      setError('Please select a start date');
      return false;
    }
    if (!formData.endDate) {
      setError('Please select an end date');
      return false;
    }
    if (moment(formData.startDate).isAfter(moment(formData.endDate))) {
      setError('End date must be after start date');
      return false;
    }
    if (formData.leaveType === 'half_day' && formData.startDate !== formData.endDate) {
      setError('Half-day leave must be for a single date');
      return false;
    }
    if (moment(formData.startDate).isBefore(moment().startOf('day'))) {
      setError('Start date cannot be in the past');
      return false;
    }
    if (!formData.reason.trim()) {
      setError('Please provide a reason for your leave');
      return false;
    }
    if (formData.reason.trim().length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters)');
      return false;
    }
    
    // Check if leave duration is reasonable
    const days = calculateDays();
    if (days > 30) {
      setError('Leave duration cannot exceed 30 days. Please contact HR for extended leave.');
      return false;
    }
    if (formData.reason.trim().length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('leaveType', formData.leaveType);
      submitData.append('startDate', formData.startDate);
      submitData.append('endDate', formData.endDate);
      submitData.append('reason', formData.reason);
      
      // Append files
      selectedFiles.forEach((file, index) => {
        submitData.append('attachments', file);
      });

      await leaveApi.createLeaveRequest(submitData);
      onLeaveCreated();
      handleClose();
    } catch (error) {
      console.error('Error creating leave request:', error);
      setError(error.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      leaveType: '',
      startDate: '',
      endDate: '',
      reason: '',
      attachments: []
    });
    setSelectedFiles([]);
    setError('');
    onHide();
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      medical: '#EF4444',
      casual: '#06B6D4',
      half_day: '#F59E0B',
      unpaid: '#6B7280',
    };
    return colors[type] || '#6B7280';
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center gap-2">
          <FaCalendarAlt className="text-primary" />
          Request Leave
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2">
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Leave Type Selection */}
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">Leave Type</Form.Label>
            <div className="leave-type-grid">
              {leaveTypes.map(type => (
                <div
                  key={type.value}
                  className={`leave-type-option ${formData.leaveType === type.value ? 'selected' : ''}`}
                  onClick={() => handleInputChange({ target: { name: 'leaveType', value: type.value } })}
                  style={{ borderColor: formData.leaveType === type.value ? getLeaveTypeColor(type.value) : '#e5e7eb' }}
                >
                  <div className="leave-type-header">
                    <div 
                      className="leave-type-indicator"
                      style={{ backgroundColor: getLeaveTypeColor(type.value) }}
                    ></div>
                    <div className="leave-type-label">{type.label}</div>
                  </div>
                  <div className="leave-type-description">{type.description}</div>
                </div>
              ))}
            </div>
          </Form.Group>

          {/* Date Selection */}
          <Row className="mb-3">
            <Col md={formData.leaveType === 'half_day' ? 12 : 6}>
              <Form.Group>
                <Form.Label className="fw-bold">{formData.leaveType === 'half_day' ? 'Date' : 'Start Date'}</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  min={moment().format('YYYY-MM-DD')}
                  required
                />
              </Form.Group>
            </Col>
            {formData.leaveType !== 'half_day' && (
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold">End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  min={formData.startDate || moment().format('YYYY-MM-DD')}
                  required
                />
              </Form.Group>
            </Col>
            )}
          </Row>

          {/* Duration Display */}
          {formData.startDate && formData.endDate && (
            <div className="duration-display mb-3 p-3 bg-light rounded">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Duration:</span>
                <span className="fw-bold text-primary">
                  {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="small text-muted mt-1">
                From {moment(formData.startDate).format('MMM DD, YYYY')} to {moment(formData.endDate).format('MMM DD, YYYY')}
              </div>
            </div>
          )}

          {/* Reason */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">
              <FaFileAlt className="me-2" />
              Reason for Leave
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Please provide a detailed reason for your leave request..."
              required
            />
            <Form.Text className="text-muted">
              {formData.reason.length}/500 characters
            </Form.Text>
          </Form.Group>

          {/* Attachments */}
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">
              <FaPaperclip className="me-2" />
              Attachments (Optional)
            </Form.Label>
            <div className="attachment-area p-3 border border-dashed rounded text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <FaPaperclip className="text-muted mb-2" size={24} />
                <div className="text-muted">
                  Click to browse files
                </div>
                <div className="small text-muted mt-1">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 5MB each)
                </div>
              </label>
            </div>
            
            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="selected-files mt-3">
                <div className="small text-muted mb-2">Selected Files:</div>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="selected-file d-flex justify-content-between align-items-center p-2 border rounded mb-2">
                    <div className="d-flex align-items-center">
                      <FaPaperclip className="text-primary me-2" />
                      <div>
                        <div className="small fw-bold">{file.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0">
        <Button variant="outline-secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </Button>
      </Modal.Footer>


    </Modal>
  );
};

export default CreateLeaveModal;