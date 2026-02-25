/**
 * Mobile Debug Helper
 * Shows errors on screen for mobile debugging
 */

let errorContainer = null;

export const initMobileDebug = () => {
  // Only in production to help debug mobile issues
  if (import.meta.env.PROD) {
    // Create error container
    errorContainer = document.createElement('div');
    errorContainer.id = 'mobile-debug';
    errorContainer.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 200px;
      overflow-y: auto;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      font-size: 12px;
      padding: 10px;
      z-index: 999999;
      font-family: monospace;
      display: none;
    `;
    document.body.appendChild(errorContainer);

    // Capture console errors
    const originalError = console.error;
    console.error = function(...args) {
      originalError.apply(console, args);
      showError('ERROR: ' + args.join(' '));
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      showError(`ERROR: ${event.message} at ${event.filename}:${event.lineno}`);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      showError(`PROMISE REJECTION: ${event.reason}`);
    });

    // Show API URL on load
    const apiUrl = import.meta.env.VITE_API_URL || 'NOT SET';
    showError(`API URL: ${apiUrl}`, false);
  }
};

const showError = (message, isError = true) => {
  if (errorContainer) {
    errorContainer.style.display = 'block';
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      padding: 5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.3);
      ${isError ? 'background: rgba(255, 0, 0, 0.2);' : 'background: rgba(0, 255, 0, 0.2);'}
    `;
    errorDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    errorContainer.insertBefore(errorDiv, errorContainer.firstChild);
    
    // Keep only last 10 errors
    while (errorContainer.children.length > 10) {
      errorContainer.removeChild(errorContainer.lastChild);
    }
  }
};

export const logDebug = (message) => {
  showError(`DEBUG: ${message}`, false);
};
