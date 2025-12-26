/**
 * Accessibility utilities for the application
 */

/**
 * Generate accessible label for work item status
 * @param {string} status - Work item status
 * @returns {string} Accessible label
 */
export const getStatusAriaLabel = (status) => {
  const labels = {
    'To Do': 'Status: To Do - Not started',
    'In Progress': 'Status: In Progress - Currently being worked on',
    'Review': 'Status: Review - Awaiting review',
    'Done': 'Status: Done - Completed',
  };
  return labels[status] || `Status: ${status}`;
};

/**
 * Generate accessible label for work item type
 * @param {string} type - Work item type
 * @returns {string} Accessible label
 */
export const getTypeAriaLabel = (type) => {
  const labels = {
    'task': 'Type: Task',
    'content': 'Type: Content',
  };
  return labels[type] || `Type: ${type}`;
};

/**
 * Generate accessible label for priority
 * @param {string} priority - Priority level
 * @returns {string} Accessible label
 */
export const getPriorityAriaLabel = (priority) => {
  const labels = {
    'low': 'Priority: Low',
    'medium': 'Priority: Medium',
    'high': 'Priority: High',
    'urgent': 'Priority: Urgent - Requires immediate attention',
  };
  return labels[priority] || `Priority: ${priority}`;
};

/**
 * Generate accessible label for due date
 * @param {string} dueDate - Due date
 * @param {boolean} isOverdue - Whether the item is overdue
 * @param {boolean} isDueToday - Whether the item is due today
 * @returns {string} Accessible label
 */
export const getDueDateAriaLabel = (dueDate, isOverdue, isDueToday) => {
  if (!dueDate) return 'No due date set';
  
  const date = new Date(dueDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    year: 'numeric',
    month: 'long',
  });
  
  if (isOverdue) {
    return `Due date: ${date} - Overdue`;
  }
  if (isDueToday) {
    return `Due date: ${date} - Due today`;
  }
  return `Due date: ${date}`;
};

/**
 * Generate accessible announcement for screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - Priority level (polite, assertive)
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Keyboard navigation helper
 * @param {KeyboardEvent} event - Keyboard event
 * @param {Function} onEnter - Callback for Enter key
 * @param {Function} onSpace - Callback for Space key
 */
export const handleKeyboardNavigation = (event, onEnter, onSpace) => {
  if (event.key === 'Enter' && onEnter) {
    event.preventDefault();
    onEnter();
  } else if (event.key === ' ' && onSpace) {
    event.preventDefault();
    onSpace();
  }
};

/**
 * Focus management helper
 * @param {string} elementId - ID of element to focus
 */
export const focusElement = (elementId) => {
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  }, 100);
};

/**
 * Trap focus within a modal or dialog
 * @param {HTMLElement} container - Container element
 */
export const trapFocus = (container) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleTabKey);
  
  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};
