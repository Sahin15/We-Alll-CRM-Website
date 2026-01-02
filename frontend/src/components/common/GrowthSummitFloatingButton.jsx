import React from 'react';
import { Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { FaRocket } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import './GrowthSummitFloatingButton.css';

const GrowthSummitFloatingButton = () => {
  const location = useLocation();

  // Hide on Growth Summit page itself
  if (location.pathname === '/growth-summit-2026') {
    return null;
  }

  const handleClick = () => {
    // Open in new tab to keep the dashboard open
    window.open('/growth-summit-2026', '_blank');
  };

  const tooltip = (
    <Tooltip id="growth-summit-tooltip">
      <strong>Growth Summit 2026</strong><br />
      3rd January 2026 - Register Now!
    </Tooltip>
  );

  return (
    <div 
      className="growth-summit-floating-container"
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <OverlayTrigger
        placement="left"
        delay={{ show: 250, hide: 400 }}
        overlay={tooltip}
      >
        <Button
          className="growth-summit-floating-btn"
          onClick={handleClick}
          variant="none"
          style={{
            background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            boxShadow: '0 8px 25px rgba(255, 107, 53, 0.4)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'white',
            textDecoration: 'none',
            minWidth: '180px',
            animation: 'pulse 2s infinite',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)';
            e.target.style.boxShadow = '0 12px 35px rgba(255, 107, 53, 0.6)';
            e.target.style.animation = 'none';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0px)';
            e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)';
            e.target.style.animation = 'pulse 2s infinite';
          }}
        >
          <FaRocket style={{ 
            fontSize: '1.5rem',
            color: '#FFD700',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }} />
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            lineHeight: '1.2'
          }}>
            <span style={{ 
              fontSize: '0.9rem',
              fontWeight: '700',
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>Growth Summit</span>
            <span style={{ 
              fontSize: '1.1rem',
              fontWeight: '900',
              color: '#FFD700',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>2026</span>
          </div>
        </Button>
      </OverlayTrigger>
    </div>
  );
};

export default GrowthSummitFloatingButton;