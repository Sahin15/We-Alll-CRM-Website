import React from 'react';

/**
 * Skip to main content link for keyboard navigation
 * Allows keyboard users to skip navigation and go directly to main content
 */
const SkipToMain = () => {
  return (
    <a 
      href="#main-content" 
      className="skip-to-main"
      style={{
        position: 'absolute',
        top: '-40px',
        left: 0,
        background: '#000',
        color: '#fff',
        padding: '8px 16px',
        textDecoration: 'none',
        zIndex: 10000,
        borderRadius: '0 0 4px 0',
        transition: 'top 0.2s',
      }}
      onFocus={(e) => {
        e.target.style.top = '0';
      }}
      onBlur={(e) => {
        e.target.style.top = '-40px';
      }}
    >
      Skip to main content
    </a>
  );
};

export default SkipToMain;
