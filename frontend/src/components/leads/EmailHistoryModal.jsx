import { useState, useEffect } from "react";
import {
  Modal,
  Table,
  Badge,
  Button,
  Spinner,
  Alert,
  Card,
  Row,
  Col
} from "react-bootstrap";
import { FaEnvelope, FaCheck, FaTimes, FaClock, FaExclamationTriangle } from "react-icons/fa";
import emailService from "../../services/emailService";
import { formatDate } from "../../utils/helpers";

const EmailHistoryModal = ({ show, onHide, lead }) => {
  const [emailHistory, setEmailHistory] = useState([]);
  const [emailStats, setEmailStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show && lead) {
      fetchEmailHistory();
    }
  }, [show, lead]);

  const fetchEmailHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await emailService.getLeadEmailHistory(lead._id);
      if (response.success) {
        setEmailHistory(response.data.campaigns);
        setEmailStats(response.data.stats);
      } else {
        setError('Failed to load email history');
      }
    } catch (error) {
      console.error('Error fetching email history:', error);
      setError('Failed to load email history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <FaCheck className="text-success" />;
      case 'failed':
        return <FaTimes className="text-danger" />;
      case 'bounced':
        return <FaExclamationTriangle className="text-warning" />;
      case 'pending':
        return <FaClock className="text-info" />;
      default:
        return <FaClock className="text-muted" />;
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'sent':
        return 'success';
      case 'failed':
        return 'danger';
      case 'bounced':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const getTemplateColor = (template) => {
    switch (template) {
      case 'vyapaar-expo':
        return 'primary';
      case 'vyapaar-expo-2':
        return 'success';
      case 'general-followup':
        return 'info';
      case 'service-inquiry':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaEnvelope className="me-2" />
          Email History - {lead?.fullName}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading email history...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">
            <FaTimes className="me-2" />
            {error}
          </Alert>
        ) : (
          <>
            {/* Email Statistics Summary */}
            {emailStats && (
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h4 className="text-primary">{emailStats.totalEmails}</h4>
                      <small className="text-muted">Total Emails</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h4 className="text-success">{emailStats.sentEmails}</h4>
                      <small className="text-muted">Successfully Sent</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h4 className="text-danger">{emailStats.failedEmails}</h4>
                      <small className="text-muted">Failed</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center h-100">
                    <Card.Body>
                      <h6 className="text-info">
                        {emailStats.lastEmailSent ? formatDate(emailStats.lastEmailSent) : 'Never'}
                      </h6>
                      <small className="text-muted">Last Email</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Email History Table */}
            {emailHistory.length > 0 ? (
              <div className="table-responsive">
                <Table hover>
                  <thead className="table-dark">
                    <tr>
                      <th>Status</th>
                      <th>Template</th>
                      <th>Subject</th>
                      <th>Sent By</th>
                      <th>Sent At</th>
                      <th>Message ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailHistory.map((campaign, index) => (
                      <tr key={campaign._id || index}>
                        <td>
                          <div className="d-flex align-items-center">
                            {getStatusIcon(campaign.status)}
                            <Badge 
                              bg={getStatusVariant(campaign.status)} 
                              className="ms-2"
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                        </td>
                        <td>
                          <Badge bg={getTemplateColor(campaign.template)}>
                            {campaign.templateName}
                          </Badge>
                        </td>
                        <td>
                          <div 
                            className="text-truncate" 
                            style={{ maxWidth: '200px' }}
                            title={campaign.subject}
                          >
                            {campaign.subject}
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="fw-bold">{campaign.sentByName}</div>
                            {campaign.sentBy?.email && (
                              <small className="text-muted">{campaign.sentBy.email}</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div>
                            <div>{formatDate(campaign.sentAt)}</div>
                            <small className="text-muted">
                              {new Date(campaign.sentAt).toLocaleTimeString()}
                            </small>
                          </div>
                        </td>
                        <td>
                          <small className="text-muted font-monospace">
                            {campaign.messageId ? (
                              <span title={campaign.messageId}>
                                {campaign.messageId.substring(0, 20)}...
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4">
                <FaEnvelope size={48} className="text-muted mb-3" />
                <h5 className="text-muted">No Email History</h5>
                <p className="text-muted">
                  No emails have been sent to this lead yet.
                </p>
              </div>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        {emailHistory.length > 0 && (
          <Button variant="primary" onClick={fetchEmailHistory}>
            Refresh
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default EmailHistoryModal;