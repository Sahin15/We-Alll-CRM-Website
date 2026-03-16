import { Card, Badge, ProgressBar } from 'react-bootstrap';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';

/**
 * SlotGroupHeader - Display slot information with progress
 */
const SlotGroupHeader = ({ slot, workItems = [], isExpanded, onToggle }) => {
  const totalCount = workItems.length;
  const completedCount = workItems.filter(item => item.status === 'Done').length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Generate color based on slot number for visual differentiation
  const getSlotColor = (slotNumber) => {
    const colors = [
      { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '#667eea', text: '#fff' },
      { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: '#f093fb', text: '#fff' },
      { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', border: '#4facfe', text: '#fff' },
      { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', border: '#43e97b', text: '#fff' },
      { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', border: '#fa709a', text: '#fff' },
      { bg: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', border: '#30cfd0', text: '#fff' },
      { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', border: '#a8edea', text: '#333' },
      { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', border: '#ff9a9e', text: '#333' },
    ];
    return colors[(slotNumber - 1) % colors.length];
  };

  const slotColor = getSlotColor(slot.slotNumber);

  return (
    <Card.Header 
      className="cursor-pointer d-flex justify-content-between align-items-center"
      onClick={onToggle}
      style={{ 
        cursor: 'pointer',
        background: slotColor.bg,
        color: slotColor.text,
        borderLeft: `4px solid ${slotColor.border}`,
        transition: 'all 0.3s ease',
        padding: '1rem 1.25rem'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="d-flex align-items-center gap-3 flex-grow-1">
        <div style={{ fontSize: '1.1rem' }}>
          {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
        </div>
        <div className="d-flex align-items-center gap-2">
          <strong style={{ fontSize: '1.1rem', fontWeight: '600' }}>
            {slot.title}
          </strong>
        </div>
        <Badge 
          bg="light" 
          text="dark"
          className="ms-2"
          style={{ 
            padding: '6px 12px',
            fontSize: '0.85rem',
            fontWeight: '500',
            background: 'rgba(255,255,255,0.3)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.4)'
          }}
        >
          {totalCount} {totalCount === 1 ? 'item' : 'items'}
        </Badge>
      </div>
      <div className="d-flex align-items-center gap-3" style={{ minWidth: '400px' }}>
        <div className="flex-grow-1">
          <ProgressBar 
            now={percentage} 
            label={`${percentage}%`}
            style={{ 
              minWidth: '140px',
              height: '24px',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            <ProgressBar
              now={percentage}
              label={`${percentage}%`}
              style={{
                background: 'linear-gradient(90deg, #28a745 0%, #20c997 100%)',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
            />
          </ProgressBar>
        </div>
        <small style={{ minWidth: '70px', fontWeight: '600', fontSize: '0.9rem' }}>
          {completedCount}/{totalCount} done
        </small>
      </div>
    </Card.Header>
  );
};

export default SlotGroupHeader;
