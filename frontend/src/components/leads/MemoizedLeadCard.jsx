import { memo, useCallback } from "react";
import { Card, Form, Badge } from "react-bootstrap";
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaBuilding } from "react-icons/fa";

/**
 * Memoized Lead Card Component
 * Prevents unnecessary re-renders when parent component updates
 * Only re-renders if props actually change
 */
const MemoizedLeadCard = memo(({ 
  lead, 
  showCheckbox = false, 
  isSelected = false, 
  onCheckboxChange,
  onLeadClick,
  getStatusColor,
  getSourceColor,
  getAssignedToBadge
}) => {
  // Memoize checkbox handler
  const handleCheckboxChange = useCallback((e) => {
    if (onCheckboxChange) {
      onCheckboxChange(e);
    }
  }, [onCheckboxChange]);

  // Memoize click handler
  const handleCardClick = useCallback(() => {
    if (onLeadClick) {
      onLeadClick(lead);
    }
  }, [lead, onLeadClick]);

  return (
    <Card 
      className="mb-3 lead-card shadow-sm compact-card" 
      onClick={handleCardClick}
      style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <Card.Body className="p-2">
        {/* Header with Checkbox, Name and Status */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-start flex-grow-1">
            {showCheckbox && lead.email && (
              <Form.Check
                type="checkbox"
                className="me-2 mt-1"
                checked={isSelected}
                onChange={handleCheckboxChange}
                onClick={(e) => e.stopPropagation()}
                style={{ minWidth: '16px' }}
              />
            )}
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 mb-1">
                <h6 className="lead-name mb-0 text-truncate" title={lead.fullName}>
                  {lead.fullName}
                </h6>
                {getAssignedToBadge && getAssignedToBadge(lead)}
              </div>
              <div 
                className="company-highlight-sm"
                style={{
                  backgroundColor: '#f0f0f0',
                  color: '#333',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block'
                }}
                title={lead.companyName || "Individual"}
              >
                <FaBuilding className="me-1" style={{ fontSize: '0.65rem' }} />
                {lead.companyName || "Individual"}
              </div>
            </div>
          </div>
          <div className="ms-2">
            {getStatusColor && (
              <Badge bg={getStatusColor(lead.status)} className="text-white">
                {lead.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="small text-muted mb-2">
          {lead.phone && (
            <div className="mb-1">
              <FaPhone className="me-1" style={{ fontSize: '0.7rem' }} />
              <span className="text-truncate">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="mb-1">
              <FaEnvelope className="me-1" style={{ fontSize: '0.7rem' }} />
              <span className="text-truncate">{lead.email}</span>
            </div>
          )}
        </div>

        {/* Source and Budget */}
        <div className="d-flex justify-content-between align-items-center">
          {getSourceColor && lead.source && (
            <Badge bg={getSourceColor(lead.source)} className="text-white" style={{ fontSize: '0.65rem' }}>
              {lead.source}
            </Badge>
          )}
          {lead.budget && (
            <span className="small text-success fw-bold">
              ₹{lead.budget}
            </span>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  // Return true if props are equal (don't re-render)
  // Return false if props are different (re-render)
  return (
    prevProps.lead._id === nextProps.lead._id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.showCheckbox === nextProps.showCheckbox
  );
});

MemoizedLeadCard.displayName = 'MemoizedLeadCard';

export default MemoizedLeadCard;
