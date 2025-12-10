import { useState } from 'react';
import { Modal, Button, Form, Badge, Alert, Tabs, Tab } from 'react-bootstrap';
import { FaCalendar, FaTasks, FaUser, FaClock, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';

const WorkItemDetailsModal = ({ show, onHide, workItem, onUpdate, onRefresh, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(workItem?.status || 'To Do');
  const [loading, setLoading] = useState(false);

  if (!workItem) return null;

  const canEdit = workItem.assignedTo?._id === currentUser?._id || 
                  ['admin', 'superadmin', 'hod'].includes(currentUser?.role);

  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
    };
    return colors[status] || 'secondary';
  };

  const handleStatusUpdate = async () => {
    if (status === workItem.status) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onUpdate(workItem._id, status, workItem.type);
      setIsEditing(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = workItem.dueDate && 
    new Date(workItem.dueDate) < new Date() && 
    workItem.status !== 'Done';

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
        <Modal.Title className="d-flex align-items-center w-100">
          <div className="d-flex align-items-center flex-grow-1">
            <Badge 
              bg="light" 
              text="dark" 
              className="me-3"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              {workItem.type === 'content' ? <FaCalendar className="me-1" /> : <FaTasks className="me-1" />}
              {workItem.type === 'content' ? 'Content' : 'Task'}
            </Badge>
            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>{workItem.title}</span>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: 0 }}>
        {isOverdue && (
          <Alert variant="danger" className="m-3 mb-0" style={{ borderRadius: '8px' }}>
            <FaClock className="me-2" />
            <strong>Overdue!</strong> This work item is past its due date.
          </Alert>
        )}

        <Tabs defaultActiveKey="details" className="mb-0" style={{ borderBottom: '2px solid #e9ecef' }}>
          <Tab eventKey="details" title="Details" style={{ padding: '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              {/* Status Section */}
              <div className="mb-4 p-3" style={{ background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong style={{ fontSize: '0.95rem', color: '#495057' }}>Status</strong>
                  {canEdit && !isEditing && (
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      <FaEdit className="me-1" /> Change
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <div className="d-flex gap-2">
                    <Form.Select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={loading}
                      style={{ borderRadius: '6px' }}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Done">Done</option>
                    </Form.Select>
                    <Button 
                      variant="success" 
                      size="sm" 
                      onClick={handleStatusUpdate}
                      disabled={loading}
                    >
                      <FaSave />
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => {
                        setStatus(workItem.status);
                        setIsEditing(false);
                      }}
                      disabled={loading}
                    >
                      <FaTimes />
                    </Button>
                  </div>
                ) : (
                  <Badge bg={getStatusColor(workItem.status)} style={{ fontSize: '0.95rem', padding: '6px 12px' }}>
                    {workItem.status}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {workItem.description && (
                <div className="mb-4">
                  <strong className="d-block mb-2" style={{ fontSize: '0.95rem', color: '#495057' }}>Description</strong>
                  <p className="text-muted mb-0" style={{ lineHeight: '1.6' }}>{workItem.description}</p>
                </div>
              )}

              {/* Key Information Grid */}
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <div className="d-flex align-items-center mb-2">
                      <FaUser className="me-2 text-primary" />
                      <strong style={{ fontSize: '0.85rem', color: '#6c757d' }}>ASSIGNED TO</strong>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '500' }}>{workItem.assignedTo?.name || 'Unassigned'}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <div className="d-flex align-items-center mb-2">
                      <FaClock className="me-2 text-warning" />
                      <strong style={{ fontSize: '0.85rem', color: '#6c757d' }}>DUE DATE</strong>
                    </div>
                    <div className={`${isOverdue ? 'text-danger fw-bold' : ''}`} style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                      {formatDate(workItem.dueDate)}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <div className="d-flex align-items-center mb-2">
                      <FaTasks className="me-2 text-info" />
                      <strong style={{ fontSize: '0.85rem', color: '#6c757d' }}>PROJECT</strong>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '500' }}>{workItem.project?.name || 'N/A'}</div>
                    {workItem.project?.client && (
                      <small className="text-muted">Client: {workItem.project.client.name}</small>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <div className="d-flex align-items-center mb-2">
                      <strong style={{ fontSize: '0.85rem', color: '#6c757d' }}>PRIORITY</strong>
                    </div>
                    <Badge 
                      bg={
                        workItem.priority === 'urgent' ? 'danger' :
                        workItem.priority === 'high' ? 'warning' :
                        workItem.priority === 'medium' ? 'info' : 'secondary'
                      }
                      className="text-capitalize"
                      style={{ fontSize: '0.9rem', padding: '6px 12px' }}
                    >
                      {workItem.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Content-Specific Fields */}
              {workItem.type === 'content' && (
                <div className="mb-4">
                  <strong className="d-block mb-3" style={{ fontSize: '0.95rem', color: '#495057' }}>Content Details</strong>
                  <div className="row g-2">
                    {workItem.platform && (
                      <div className="col-auto">
                        <Badge bg="info" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>{workItem.platform}</Badge>
                      </div>
                    )}
                    {workItem.postType && (
                      <div className="col-auto">
                        <Badge bg="secondary" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>{workItem.postType}</Badge>
                      </div>
                    )}
                  </div>
                  {workItem.contentBucket && (
                    <div className="mt-3">
                      <small className="text-muted d-block mb-1">Content Bucket</small>
                      <div>{workItem.contentBucket}</div>
                    </div>
                  )}
                  {workItem.caption && (
                    <div className="mt-3">
                      <small className="text-muted d-block mb-1">Caption</small>
                      <div className="text-muted" style={{ fontStyle: 'italic' }}>{workItem.caption}</div>
                    </div>
                  )}
                  {workItem.hashtags && (
                    <div className="mt-3">
                      <small className="text-muted d-block mb-1">Hashtags</small>
                      <div className="text-primary">{workItem.hashtags}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {workItem.tags && workItem.tags.length > 0 && (
                <div className="mb-4">
                  <strong className="d-block mb-2" style={{ fontSize: '0.95rem', color: '#495057' }}>Tags</strong>
                  <div className="d-flex flex-wrap gap-2">
                    {workItem.tags.map((tag, index) => (
                      <Badge key={index} bg="light" text="dark" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Created Info */}
              <div className="mt-4 pt-3" style={{ borderTop: '2px solid #e9ecef' }}>
                <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.85rem' }}>
                  <span>Created by <strong>{workItem.createdBy?.name}</strong> on {formatDate(workItem.createdAt)}</span>
                  {workItem.completedAt && (
                    <span className="text-success">✓ Completed on {formatDate(workItem.completedAt)}</span>
                  )}
                </div>
              </div>
            </div>
          </Tab>

          <Tab eventKey="comments" title={`Comments (${workItem.comments?.length || 0})`}>
            <div style={{ padding: '1.5rem' }}>
              {workItem.comments && workItem.comments.length > 0 ? (
                workItem.comments.map((comment, index) => (
                  <div key={index} className="mb-3 p-3" style={{ background: '#f8f9fa', borderRadius: '8px', borderLeft: '3px solid #667eea' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong style={{ color: '#495057' }}>{comment.user?.name || 'Unknown'}</strong>
                      <small className="text-muted">{formatDate(comment.createdAt)}</small>
                    </div>
                    <p className="mb-0" style={{ lineHeight: '1.6' }}>{comment.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-5">
                  <div className="text-muted mb-2" style={{ fontSize: '3rem', opacity: 0.3 }}>💬</div>
                  <p className="text-muted">No comments yet</p>
                </div>
              )}
            </div>
          </Tab>

          {workItem.attachments && workItem.attachments.length > 0 && (
            <Tab eventKey="attachments" title={`Attachments (${workItem.attachments.length})`}>
              <div style={{ padding: '1.5rem' }}>
                {workItem.attachments.map((attachment, index) => (
                  <div key={index} className="mb-3 p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <a 
                      href={attachment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-decoration-none d-flex align-items-center"
                      style={{ fontSize: '0.95rem', fontWeight: '500' }}
                    >
                      📎 {attachment.name}
                    </a>
                    <small className="text-muted d-block mt-2">
                      {attachment.type} • Uploaded {formatDate(attachment.uploadedAt)}
                    </small>
                  </div>
                ))}
              </div>
            </Tab>
          )}
        </Tabs>
      </Modal.Body>

      <Modal.Footer style={{ background: '#f8f9fa', borderTop: '2px solid #e9ecef' }}>
        <Button variant="secondary" onClick={onHide} style={{ borderRadius: '6px', padding: '8px 20px' }}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default WorkItemDetailsModal;
