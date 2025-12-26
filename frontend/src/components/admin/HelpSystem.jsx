import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Card, 
  Accordion, 
  Badge, 
  Form,
  InputGroup,
  ListGroup,
  OverlayTrigger,
  Tooltip,
  Popover
} from 'react-bootstrap';
import { 
  FaQuestion, 
  FaBook, 
  FaVideo, 
  FaSearch, 
  FaTimes,
  FaExternalLinkAlt,
  FaLightbulb,
  FaKeyboard,
  FaMousePointer,
  FaMobileAlt,
  FaCog
} from 'react-icons/fa';
import './HelpSystem.css';

/**
 * In-App Help System Component
 * Provides contextual help, tutorials, and guidance for the enhanced admin work management system
 * Features:
 * - Interactive help modal with searchable content
 * - Contextual tooltips and popovers
 * - Step-by-step tutorials
 * - Keyboard shortcuts guide
 * - Video tutorial links
 * - Quick tips and best practices
 */

const HelpSystem = ({ show, onHide, context = 'general' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [filteredContent, setFilteredContent] = useState([]);

  // Help content organized by sections
  const helpContent = {
    overview: {
      title: 'Getting Started',
      icon: <FaBook />,
      content: [
        {
          title: 'Welcome to Enhanced Work Management',
          content: `This system provides a professional spreadsheet-like interface for managing work entries with advanced filtering, real-time analytics, and comprehensive export capabilities.`,
          tips: [
            'Start by selecting a client to focus your view',
            'Use the search bar for quick filtering across all fields',
            'Enable High Performance Mode for large datasets (1000+ entries)'
          ]
        },
        {
          title: 'Interface Overview',
          content: `The main interface consists of header controls, smart search, quick filters, and the data table. Each section is designed for efficient work management.`,
          tips: [
            'Header controls: Analytics toggle, advanced filters, refresh',
            'Quick filters: Primary client filter and common options',
            'Data table: Professional spreadsheet with sorting and editing'
          ]
        }
      ]
    },
    filtering: {
      title: 'Filtering & Search',
      icon: <FaSearch />,
      content: [
        {
          title: 'Client-Focused Filtering',
          content: `The client filter is the primary filtering mechanism. Select a specific client to view all related work entries and projects.`,
          tips: [
            'Client filter affects analytics and export data',
            'Use "All Clients" for comprehensive overview',
            'Combine with other filters for targeted views'
          ]
        },
        {
          title: 'Smart Search',
          content: `The global search bar searches across titles, descriptions, client names, and project names with real-time results.`,
          examples: [
            '"Client ABC" - Find all work for Client ABC',
            '"overdue work" - Find overdue entries',
            '"high priority" - Find high-priority work'
          ]
        },
        {
          title: 'Advanced Filters',
          content: `Access the Advanced Filter Panel for complex filtering with date ranges, custom criteria, and filter combinations.`,
          tips: [
            'Save frequently used filter combinations as presets',
            'Use AND/OR logic for complex filter criteria',
            'Filter history allows navigation through recent filters'
          ]
        }
      ]
    },
    spreadsheet: {
      title: 'Spreadsheet Features',
      icon: <FaMousePointer />,
      content: [
        {
          title: 'Column Management',
          content: `Show/hide columns, sort data, and filter individual columns using the professional spreadsheet interface.`,
          tips: [
            'Click column headers to sort (ascending/descending)',
            'Use "Columns" dropdown to show/hide columns',
            'Filter inputs in headers for column-specific searches'
          ]
        },
        {
          title: 'Inline Editing',
          content: `Click on editable cells to modify values directly in the table. Changes are saved automatically.`,
          tips: [
            'Look for the edit icon on hover',
            'Press Enter to save, Escape to cancel',
            'Only authorized users can edit specific fields'
          ]
        },
        {
          title: 'Row Selection',
          content: `Select individual rows or use "Select All" for bulk operations. Selected count is displayed in the controls.`,
          tips: [
            'Use checkboxes for individual selection',
            'Header checkbox selects all visible rows',
            'Selected rows enable bulk operations'
          ]
        }
      ]
    },
    bulkOperations: {
      title: 'Bulk Operations',
      icon: <FaCog />,
      content: [
        {
          title: 'Available Operations',
          content: `Perform bulk status updates, reassignments, date modifications, and deletions (admin only) on multiple work entries.`,
          permissions: {
            'Admin/SuperAdmin': 'All operations including delete',
            'HR': 'Update, reassign, status changes (no delete)',
            'Manager': 'Update status, limited reassignment within department',
            'Employee': 'No bulk operation access'
          }
        },
        {
          title: 'Best Practices',
          content: `Follow these guidelines for safe and efficient bulk operations.`,
          tips: [
            'Limit bulk operations to 100 entries at a time',
            'Always review selections before applying operations',
            'Consider exporting data before major bulk changes',
            'Notify affected team members of bulk changes'
          ]
        }
      ]
    },
    analytics: {
      title: 'Real-Time Analytics',
      icon: <FaLightbulb />,
      content: [
        {
          title: 'Analytics Dashboard',
          content: `View comprehensive insights including completion rates, workload distribution, and performance metrics that update in real-time.`,
          metrics: [
            'Total Work Entries: Count of all work items',
            'Completion Rate: Percentage of completed work',
            'Overdue Percentage: Percentage of overdue items',
            'Average Completion Time: Mean time from start to completion'
          ]
        },
        {
          title: 'Visual Charts',
          content: `Interactive charts show client distribution, status breakdown, priority analysis, and timeline views.`,
          tips: [
            'Charts reflect current filter settings',
            'Click chart elements for drill-down views',
            'Export charts as images for presentations'
          ]
        }
      ]
    },
    export: {
      title: 'Export & Reports',
      icon: <FaExternalLinkAlt />,
      content: [
        {
          title: 'Export Formats',
          content: `Generate exports in CSV, Excel, or PDF formats with customizable options and professional formatting.`,
          formats: {
            'CSV': 'Fast, data analysis, up to 50,000 entries',
            'Excel': 'Formatted reports, formulas, up to 25,000 entries',
            'PDF': 'Professional reports with charts, up to 5,000 entries'
          }
        },
        {
          title: 'Export Process',
          content: `Apply filters, select format, configure options, and download when ready. Large exports are processed in background.`,
          tips: [
            'Filter data before export for focused reports',
            'Include analytics for comprehensive reports',
            'Large exports are emailed when complete'
          ]
        }
      ]
    },
    mobile: {
      title: 'Mobile Usage',
      icon: <FaMobileAlt />,
      content: [
        {
          title: 'Mobile Interface',
          content: `Fully responsive design with touch-friendly controls and optimized view modes for mobile devices.`,
          viewModes: [
            'Compact Table: Condensed table with essential columns',
            'Card View: Individual cards with expandable details',
            'List View: Streamlined list format for mobile'
          ]
        },
        {
          title: 'Touch Gestures',
          content: `Use touch gestures for navigation and quick actions on mobile devices.`,
          gestures: [
            'Tap: Select items and expand details',
            'Swipe Right: Quick selection',
            'Swipe Left: Access action menu',
            'Long Press: Context menu'
          ]
        }
      ]
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      icon: <FaKeyboard />,
      content: [
        {
          title: 'Navigation Shortcuts',
          shortcuts: [
            { key: 'Ctrl + F', action: 'Focus search bar' },
            { key: 'Ctrl + A', action: 'Select all visible rows' },
            { key: 'Escape', action: 'Clear selection/close modals' },
            { key: 'F5', action: 'Refresh data' }
          ]
        },
        {
          title: 'Table Shortcuts',
          shortcuts: [
            { key: 'Enter', action: 'Save inline edit' },
            { key: 'Escape', action: 'Cancel inline edit' },
            { key: 'Tab', action: 'Navigate between editable cells' },
            { key: 'Space', action: 'Toggle row selection' }
          ]
        },
        {
          title: 'Filter Shortcuts',
          shortcuts: [
            { key: 'Ctrl + Shift + F', action: 'Open advanced filters' },
            { key: 'Ctrl + Shift + C', action: 'Clear all filters' },
            { key: 'Ctrl + S', action: 'Save current filter preset' }
          ]
        }
      ]
    },
    troubleshooting: {
      title: 'Troubleshooting',
      icon: <FaQuestion />,
      content: [
        {
          title: 'Performance Issues',
          problems: [
            {
              issue: 'Slow loading or rendering',
              solutions: [
                'Enable High Performance Mode (virtualization)',
                'Reduce date range or apply more specific filters',
                'Clear browser cache and refresh',
                'Check internet connection stability'
              ]
            },
            {
              issue: 'Export taking too long',
              solutions: [
                'Reduce dataset size with filters',
                'Choose CSV format for faster processing',
                'Use chunked export for very large datasets'
              ]
            }
          ]
        },
        {
          title: 'Filter Issues',
          problems: [
            {
              issue: 'Filters not working as expected',
              solutions: [
                'Clear all filters and reapply',
                'Check for conflicting filter combinations',
                'Verify date formats (YYYY-MM-DD)',
                'Refresh page to reset filter state'
              ]
            }
          ]
        }
      ]
    }
  };

  // Video tutorials data
  const videoTutorials = [
    {
      title: 'Getting Started with Enhanced Work Management',
      duration: '5:30',
      url: '/tutorials/getting-started',
      description: 'Overview of the interface and basic navigation'
    },
    {
      title: 'Advanced Filtering and Search',
      duration: '8:15',
      url: '/tutorials/advanced-filtering',
      description: 'Master client-focused filtering and complex search queries'
    },
    {
      title: 'Bulk Operations and Management',
      duration: '6:45',
      url: '/tutorials/bulk-operations',
      description: 'Efficiently manage multiple work entries with bulk operations'
    },
    {
      title: 'Analytics and Reporting',
      duration: '7:20',
      url: '/tutorials/analytics-reporting',
      description: 'Understanding analytics dashboard and generating reports'
    },
    {
      title: 'Mobile Usage and Touch Interface',
      duration: '4:10',
      url: '/tutorials/mobile-usage',
      description: 'Using the system effectively on mobile devices'
    }
  ];

  // Filter content based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContent([]);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const results = [];

    Object.entries(helpContent).forEach(([sectionKey, section]) => {
      section.content.forEach((item, index) => {
        const titleMatch = item.title.toLowerCase().includes(searchLower);
        const contentMatch = item.content.toLowerCase().includes(searchLower);
        const tipsMatch = item.tips?.some(tip => tip.toLowerCase().includes(searchLower));
        
        if (titleMatch || contentMatch || tipsMatch) {
          results.push({
            section: sectionKey,
            sectionTitle: section.title,
            item: item,
            index: index
          });
        }
      });
    });

    setFilteredContent(results);
  }, [searchTerm]);

  const renderContent = (content) => {
    return content.map((item, index) => (
      <Card key={index} className="mb-3">
        <Card.Header>
          <h6 className="mb-0">{item.title}</h6>
        </Card.Header>
        <Card.Body>
          <p>{item.content}</p>
          
          {item.tips && (
            <div className="mb-3">
              <strong>Tips:</strong>
              <ul className="mt-2">
                {item.tips.map((tip, tipIndex) => (
                  <li key={tipIndex}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          
          {item.examples && (
            <div className="mb-3">
              <strong>Examples:</strong>
              <ul className="mt-2">
                {item.examples.map((example, exampleIndex) => (
                  <li key={exampleIndex}><code>{example}</code></li>
                ))}
              </ul>
            </div>
          )}
          
          {item.permissions && (
            <div className="mb-3">
              <strong>Permissions:</strong>
              <div className="mt-2">
                {Object.entries(item.permissions).map(([role, permission]) => (
                  <div key={role} className="d-flex justify-content-between align-items-center mb-1">
                    <Badge bg="info">{role}</Badge>
                    <span className="small">{permission}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {item.metrics && (
            <div className="mb-3">
              <strong>Key Metrics:</strong>
              <ul className="mt-2">
                {item.metrics.map((metric, metricIndex) => (
                  <li key={metricIndex}>{metric}</li>
                ))}
              </ul>
            </div>
          )}
          
          {item.formats && (
            <div className="mb-3">
              <strong>Format Details:</strong>
              <div className="mt-2">
                {Object.entries(item.formats).map(([format, details]) => (
                  <div key={format} className="mb-2">
                    <Badge bg="success" className="me-2">{format}</Badge>
                    <span className="small">{details}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {item.shortcuts && (
            <div className="mb-3">
              <div className="row">
                {item.shortcuts.map((shortcut, shortcutIndex) => (
                  <div key={shortcutIndex} className="col-md-6 mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <kbd>{shortcut.key}</kbd>
                      <span className="small">{shortcut.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {item.problems && (
            <div className="mb-3">
              {item.problems.map((problem, problemIndex) => (
                <div key={problemIndex} className="mb-3">
                  <strong className="text-warning">Issue: {problem.issue}</strong>
                  <ul className="mt-2">
                    {problem.solutions.map((solution, solutionIndex) => (
                      <li key={solutionIndex}>{solution}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    ));
  };

  const renderSearchResults = () => {
    if (!searchTerm.trim()) return null;
    
    if (filteredContent.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-muted">No help content found for "{searchTerm}"</p>
        </div>
      );
    }

    return (
      <div>
        <h6 className="mb-3">Search Results ({filteredContent.length})</h6>
        {filteredContent.map((result, index) => (
          <Card key={index} className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">{result.item.title}</h6>
              <Badge bg="secondary">{result.sectionTitle}</Badge>
            </Card.Header>
            <Card.Body>
              <p>{result.item.content}</p>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => {
                  setActiveSection(result.section);
                  setSearchTerm('');
                }}
              >
                Go to Section
              </Button>
            </Card.Body>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" className="help-system-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaQuestion className="me-2" />
          Help & Documentation
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <div className="row">
          {/* Sidebar Navigation */}
          <div className="col-md-3">
            {/* Search */}
            <div className="mb-3">
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search help content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    <FaTimes />
                  </Button>
                )}
              </InputGroup>
            </div>

            {/* Navigation Menu */}
            {!searchTerm && (
              <ListGroup>
                {Object.entries(helpContent).map(([key, section]) => (
                  <ListGroup.Item
                    key={key}
                    action
                    active={activeSection === key}
                    onClick={() => setActiveSection(key)}
                    className="d-flex align-items-center"
                  >
                    {section.icon}
                    <span className="ms-2">{section.title}</span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}

            {/* Video Tutorials */}
            {!searchTerm && (
              <div className="mt-4">
                <h6 className="mb-3">
                  <FaVideo className="me-2" />
                  Video Tutorials
                </h6>
                <div className="video-tutorials">
                  {videoTutorials.map((video, index) => (
                    <Card key={index} className="mb-2">
                      <Card.Body className="p-3">
                        <h6 className="mb-1">{video.title}</h6>
                        <p className="small text-muted mb-2">{video.description}</p>
                        <div className="d-flex justify-content-between align-items-center">
                          <Badge bg="info">{video.duration}</Badge>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            href={video.url}
                            target="_blank"
                          >
                            <FaVideo className="me-1" />
                            Watch
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="col-md-9">
            {searchTerm ? (
              renderSearchResults()
            ) : (
              <div>
                <div className="d-flex align-items-center mb-4">
                  {helpContent[activeSection]?.icon}
                  <h4 className="ms-2 mb-0">{helpContent[activeSection]?.title}</h4>
                </div>
                {renderContent(helpContent[activeSection]?.content || [])}
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <div className="d-flex justify-content-between align-items-center w-100">
          <div className="text-muted small">
            Need more help? Contact your system administrator or check the full documentation.
          </div>
          <div>
            <Button variant="outline-primary" className="me-2" href="/docs/user-guide" target="_blank">
              <FaBook className="me-1" />
              Full Documentation
            </Button>
            <Button variant="secondary" onClick={onHide}>
              Close
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

// Contextual Help Tooltip Component
export const HelpTooltip = ({ content, placement = 'top', children }) => {
  const tooltip = (
    <Tooltip>
      {content}
    </Tooltip>
  );

  return (
    <OverlayTrigger placement={placement} overlay={tooltip}>
      {children}
    </OverlayTrigger>
  );
};

// Contextual Help Popover Component
export const HelpPopover = ({ title, content, placement = 'right', children }) => {
  const popover = (
    <Popover>
      <Popover.Header>{title}</Popover.Header>
      <Popover.Body>{content}</Popover.Body>
    </Popover>
  );

  return (
    <OverlayTrigger trigger="click" placement={placement} overlay={popover}>
      {children}
    </OverlayTrigger>
  );
};

// Help Button Component
export const HelpButton = ({ onClick, className = '' }) => {
  return (
    <Button 
      variant="outline-info" 
      size="sm" 
      onClick={onClick}
      className={`help-button ${className}`}
      title="Get Help"
    >
      <FaQuestion />
    </Button>
  );
};

export default HelpSystem;