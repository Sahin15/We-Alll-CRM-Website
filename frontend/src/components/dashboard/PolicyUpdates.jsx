import { Card, ListGroup, Badge, Button } from 'react-bootstrap';
import { FaShieldAlt, FaCheckCircle, FaExclamationCircle, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const PolicyUpdates = ({ policies = [], onPolicyClick }) => {
  const navigate = useNavigate();

  const handlePolicyClick = (policy) => {
    if (onPolicyClick) {
      onPolicyClick(policy);
    } else {
      // Fallback: show info if no handler
      console.log('Policy clicked:', policy);
    }
  };

  const displayPolicies = Array.isArray(policies) ? policies : [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new': 
        return <Badge bg="success"><FaExclamationCircle className="me-1" />New</Badge>;
      case 'updated': 
        return <Badge bg="warning"><FaCheckCircle className="me-1" />Updated</Badge>;
      case 'active': 
        return <Badge bg="primary">Active</Badge>;
      default: 
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            <FaShieldAlt className="me-2 text-success" />
            Policy Updates
          </h5>
          <Button 
            size="sm" 
            variant="outline-primary"
            onClick={() => {
              // Policies page doesn't exist yet, show message
              console.log('Navigate to policies page');
            }}
          >
            View All
          </Button>
        </div>
        <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {displayPolicies.slice(0, 5).map((policy) => (
            <ListGroup.Item 
              key={policy.id} 
              className="px-0 py-3 border-bottom cursor-pointer"
              onClick={() => handlePolicyClick(policy)}
              style={{ transition: 'all 0.2s ease' }}
            >
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="mb-0">{policy.title}</h6>
                {getStatusBadge(policy.status)}
              </div>
              <p className="text-muted mb-2 small">{policy.description}</p>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  {policy.effectiveDate ? `Effective: ${formatDate(policy.effectiveDate)}` : 
                   policy.createdAt ? `Created: ${formatDate(policy.createdAt)}` : ''}
                </small>
                <Button size="sm" variant="link" className="p-0">
                  <FaEye className="me-1" />Read Policy
                </Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
        {displayPolicies.length === 0 && (
          <div className="text-center py-4 text-muted">
            <FaShieldAlt style={{ fontSize: '2rem', opacity: 0.3 }} />
            <p className="mt-2 mb-0">No policy updates</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default PolicyUpdates;
