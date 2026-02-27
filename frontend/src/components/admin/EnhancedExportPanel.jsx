import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  Form,
  Row,
  Col,
  Card,
  Badge,
  ProgressBar,
  Alert,
  ListGroup,
  Spinner,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import {
  FaDownload,
  FaFileExcel,
  FaFilePdf,
  FaFileCsv,
  FaCog,
  FaCheck,
  FaTimes,
  FaClock,
  FaEye,
  FaTrash
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext';
import workItemApi from '../../api/workItemApi';
import workCalendarApi from '../../api/workCalendarApi';
import './EnhancedExportPanel.css';

/**
 * Enhanced Export Panel Component
 * Provides comprehensive export functionality with background processing
 * 
 * Features:
 * - Multi-format export (CSV, Excel, PDF)
 * - Background job processing for large datasets
 * - Export status tracking and monitoring
 * - Job queue management
 * - Download management
 * - Export history
 */
const EnhancedExportPanel = ({
  show,
  onHide,
  filters,
  workData,
  columns,
  title = "Export Work Data",
  // Slot-related props
  slotAnalytics = null,
  showSlotColumns = false
}) => {
  const { user } = useAuth();
  
  // Check if user has permission to view export jobs
  const canViewExportJobs = ['admin', 'superadmin', 'hr', 'manager'].includes(user?.role);
  // Export configuration state
  const [exportConfig, setExportConfig] = useState({
    format: 'csv',
    includeAnalytics: true,
    includeSlotAnalytics: showSlotColumns && slotAnalytics !== null,
    backgroundProcessing: true,
    columns: []
  });

  // Job management state
  const [exportJobs, setExportJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);

  // UI state
  const [showJobMonitor, setShowJobMonitor] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState(new Set());

  // Available columns for export - ONLY columns visible in the table
  const availableColumns = [
    { key: 'title', label: 'Work Title', default: true },
    { key: 'client.name', label: 'Client', default: true },
    { key: 'project.name', label: 'Project', default: true },
    { key: 'slotAssignment.slotNumber', label: 'Slot #', default: true, category: 'slot' },
    { key: 'assignedTo.name', label: 'Assigned To', default: true },
    { key: 'createdBy.name', label: 'Assigned By', default: true },
    { key: 'departmentName', label: 'Department', default: true },
    { key: 'status', label: 'Status', default: true },
    { key: 'priority', label: 'Priority', default: true },
    { key: 'dueDate', label: 'Due Date', default: true }
  ];

  // Initialize selected columns
  useEffect(() => {
    const defaultColumns = availableColumns
      .filter(col => col.default)
      .map(col => col.key);
    setSelectedColumns(new Set(defaultColumns));
  }, []);

  // Load export jobs on mount
  useEffect(() => {
    if (show && canViewExportJobs) {
      loadExportJobs();
    }
  }, [show, canViewExportJobs]);

  // Poll active jobs for status updates
  useEffect(() => {
    if (activeJobs.size > 0) {
      const interval = setInterval(() => {
        pollActiveJobs();
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [activeJobs]);

  // Load export jobs
  const loadExportJobs = async () => {
    // Only load export jobs if user has permission
    if (!canViewExportJobs) {
      console.log('User does not have permission to view export jobs');
      return;
    }
    
    try {
      setJobsLoading(true);
      const response = await workCalendarApi.getAllExportJobs();
      
      if (response.success) {
        setExportJobs(response.data.jobs || []);
        
        // Track active jobs
        const active = new Map();
        response.data.jobs.forEach(job => {
          if (['queued', 'processing'].includes(job.status)) {
            active.set(job.id, job);
          }
        });
        setActiveJobs(active);
      }
    } catch (error) {
      console.error('Failed to load export jobs:', error);
      toast.error('Failed to load export jobs');
    } finally {
      setJobsLoading(false);
    }
  };

  // Poll active jobs for updates
  const pollActiveJobs = async () => {
    const jobIds = Array.from(activeJobs.keys());
    
    for (const jobId of jobIds) {
      try {
        const response = await workCalendarApi.getExportStatus(jobId);
        
        if (response.success) {
          const job = response.data;
          
          if (['completed', 'failed', 'cancelled'].includes(job.status)) {
            // Job finished, remove from active jobs
            setActiveJobs(prev => {
              const newActive = new Map(prev);
              newActive.delete(jobId);
              return newActive;
            });
            
            // Show notification
            if (job.status === 'completed') {
              toast.success(`Export completed: ${job.result?.filename}`);
            } else if (job.status === 'failed') {
              toast.error(`Export failed: ${job.error}`);
            }
            
            // Reload jobs list
            loadExportJobs();
          } else {
            // Update job progress
            setActiveJobs(prev => {
              const newActive = new Map(prev);
              newActive.set(jobId, job);
              return newActive;
            });
          }
        }
      } catch (error) {
        console.error(`Failed to poll job ${jobId}:`, error);
      }
    }
  };

  // Handle export 
  const handleExport = async () => {
    try {
      setLoading(true);

      // Handle print view separately
      if (exportConfig.format === 'print') {
        handlePrintView();
        return;
      }

      const exportData = {
        filters,
        format: exportConfig.format,
        columns: Array.from(selectedColumns),
        includeAnalytics: exportConfig.includeAnalytics,
        includeSlotAnalytics: exportConfig.includeSlotAnalytics,
        slotAnalytics: exportConfig.includeSlotAnalytics ? slotAnalytics : null,
        backgroundProcessing: exportConfig.backgroundProcessing && workData.length > 100,
        entryCount: workData.length
      };

      const response = await workCalendarApi.exportWorkData(exportData);

      if (exportData.backgroundProcessing && workData.length > 100) {
        // Background job created
        if (response.success) {
          toast.success('Export job created successfully');
          
          // Add to active jobs
          setActiveJobs(prev => {
            const newActive = new Map(prev);
            newActive.set(response.data.jobId, {
              id: response.data.jobId,
              status: response.data.status,
              progress: 0
            });
            return newActive;
          });
          
          setShowJobMonitor(true);
          loadExportJobs();
        }
      } else {
        // Direct download - response is already a blob from the API
        let blob;
        
        if (response instanceof Blob) {
          // Response is already a blob (from responseType: 'blob')
          blob = response;
        } else {
          // Fallback: create blob from response data
          blob = new Blob([response], { 
            type: getContentType(exportConfig.format)
          });
        }
        
        // Verify blob is valid for PDF
        if (exportConfig.format === 'pdf' && blob.size < 1024) {
          throw new Error('PDF file appears to be corrupted or empty');
        }
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `work-export-${moment().format('DD-MM-YYYY-HHmm')}.${getFileExtension(exportConfig.format)}`;
        
        // Ensure the link is added to DOM for Firefox compatibility
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        toast.success('Export downloaded successfully');
        onHide();
      }

    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle print view
  const handlePrintView = () => {
    // Create a new window with the print view
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    
    if (!printWindow) {
      toast.error('Please allow popups to use the print view feature');
      setLoading(false);
      return;
    }

    // Get analytics data
    const analytics = {
      overall: {
        totalWork: workData.length,
        completedWork: workData.filter(w => w.status === 'completed').length,
        inProgressWork: workData.filter(w => w.status === 'in-progress').length,
        overdueWork: workData.filter(w => w.isOverdue).length,
        totalEstimatedHours: workData.reduce((sum, w) => sum + (w.timeTracking?.estimatedHours || 0), 0),
        totalActualHours: workData.reduce((sum, w) => sum + (w.timeTracking?.actualHours || 0), 0)
      },
      slots: slotAnalytics && exportConfig.includeSlotAnalytics ? {
        totalSlots: (slotAnalytics.availableSlots || 0) + (slotAnalytics.assignedSlots || 0) + 
                   (slotAnalytics.inProgressSlots || 0) + (slotAnalytics.completedSlots || 0) + 
                   (slotAnalytics.blockedSlots || 0),
        availableSlots: slotAnalytics.availableSlots || 0,
        assignedSlots: slotAnalytics.assignedSlots || 0,
        inProgressSlots: slotAnalytics.inProgressSlots || 0,
        completedSlots: slotAnalytics.completedSlots || 0,
        blockedSlots: slotAnalytics.blockedSlots || 0,
        slotCompletionRate: slotAnalytics.completedSlots && slotAnalytics.completedSlots > 0 ? 
          Math.round((slotAnalytics.completedSlots / 
            ((slotAnalytics.availableSlots || 0) + (slotAnalytics.assignedSlots || 0) + 
             (slotAnalytics.inProgressSlots || 0) + (slotAnalytics.completedSlots || 0) + 
             (slotAnalytics.blockedSlots || 0))) * 100) : 0
      } : null
    };

    // Create the print view HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Work Management Report</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .print-header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
            .stat-box { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef; }
            .stat-label { font-size: 0.85rem; color: #6c757d; font-weight: 600; text-transform: uppercase; }
            .stat-value { font-size: 1.5rem; font-weight: 700; color: #2c3e50; }
            .work-title { font-weight: 500; max-width: 200px; word-wrap: break-word; }
            .no-print { margin: 20px 0; text-align: center; }
            table { font-size: 0.85rem; }
            th { background-color: #f8f9fa !important; font-weight: 600; white-space: nowrap; }
            td { vertical-align: middle; }
            .badge { padding: 4px 8px; font-size: 0.75rem; }
            @media print {
              .no-print { display: none !important; }
              @page { margin: 0.5in; size: landscape; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
            }
          </style>
        </head>
        <body>
          <div class="container-fluid">
            <div class="no-print">
              <button onclick="window.print()" class="btn btn-primary me-2">
                Print / Save as PDF
              </button>
              <button onclick="window.close()" class="btn btn-secondary">
                Close
              </button>
            </div>

            <div class="print-header text-center">
              <h1>Work Management Report</h1>
              <p class="text-muted">Generated on: ${moment().format('MMMM DD, YYYY [at] HH:mm')}</p>
              ${Object.keys(filters).length > 0 ? `
                <p class="text-muted small">
                  Filters: ${Object.entries(filters)
                    .filter(([key, value]) => value && value !== 'all')
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ')}
                </p>
              ` : ''}
            </div>

            <div class="row mb-4">
              <div class="col-md-3 col-sm-6 mb-3">
                <div class="stat-box">
                  <div class="stat-label">Total Work</div>
                  <div class="stat-value">${analytics.overall.totalWork}</div>
                </div>
              </div>
              <div class="col-md-3 col-sm-6 mb-3">
                <div class="stat-box">
                  <div class="stat-label">Completed</div>
                  <div class="stat-value text-success">
                    ${analytics.overall.completedWork}
                    <small>(${analytics.overall.totalWork > 0 ? Math.round((analytics.overall.completedWork / analytics.overall.totalWork) * 100) : 0}%)</small>
                  </div>
                </div>
              </div>
              <div class="col-md-3 col-sm-6 mb-3">
                <div class="stat-box">
                  <div class="stat-label">In Progress</div>
                  <div class="stat-value text-primary">${analytics.overall.inProgressWork}</div>
                </div>
              </div>
              <div class="col-md-3 col-sm-6 mb-3">
                <div class="stat-box">
                  <div class="stat-label">Overdue</div>
                  <div class="stat-value text-danger">${analytics.overall.overdueWork}</div>
                </div>
              </div>
            </div>

            ${analytics.slots ? `
            <div class="row mb-4">
              <div class="col-12 mb-2">
                <h5 class="text-muted">Slot Analytics</h5>
              </div>
              <div class="col-md-2 col-sm-4 mb-3">
                <div class="stat-box">
                  <div class="stat-label">Total Slots</div>
                  <div class="stat-value">${analytics.slots.totalSlots}</div>
                </div>
              </div>
              <div class="col-md-2 col-sm-4 mb-3">
                <div class="stat-box">
                  <div class="stat-label">Available</div>
                  <div class="stat-value text-success">${analytics.slots.availableSlots}</div>
                </div>
              </div>
              <div class="col-md-2 col-sm-4 mb-3">
                <div class="stat-box">
                  <div class="stat-label">Assigned</div>
                  <div class="stat-value text-info">${analytics.slots.assignedSlots}</div>
                </div>
              </div>
              <div class="col-md-2 col-sm-4 mb-3">
                <div class="stat-box">
                  <div class="stat-label">In Progress</div>
                  <div class="stat-value text-warning">${analytics.slots.inProgressSlots}</div>
                </div>
              </div>
              <div class="col-md-2 col-sm-4 mb-3">
                <div class="stat-box">
                  <div class="stat-label">Completed</div>
                  <div class="stat-value text-success">${analytics.slots.completedSlots}</div>
                </div>
              </div>
              <div class="col-md-2 col-sm-4 mb-3">
                <div class="stat-box">
                  <div class="stat-label">Blocked</div>
                  <div class="stat-value text-danger">${analytics.slots.blockedSlots}</div>
                </div>
              </div>
            </div>
            ` : ''}

            <div class="card">
              <div class="card-header bg-secondary text-white">
                <h5 class="mb-0">Work Entries (${workData.length})</h5>
              </div>
              <div class="card-body p-0">
                <table class="table table-striped table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Client</th>
                      <th>Project</th>
                      <th>Slot #</th>
                      <th>Assigned To</th>
                      <th>Assigned By</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${workData.length > 0 ? workData.map((work, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td class="work-title">${work.title || 'N/A'}</td>
                        <td>${work.client?.name || 'Internal'}</td>
                        <td>${work.project?.name || 'N/A'}</td>
                        <td>${work.slotAssignment?.slotNumber || work.slot?.slotNumber || 'N/A'}</td>
                        <td>${work.assignedTo?.name || 'Unassigned'}</td>
                        <td>${work.createdBy?.name || 'Unknown'}</td>
                        <td>${work.departmentName || work.department?.name || 'N/A'}</td>
                        <td><span class="badge bg-${getStatusBadgeClass(work.status)}">${work.status || 'Unknown'}</span></td>
                        <td><span class="badge bg-${getPriorityBadgeClass(work.priority)}">${work.priority || 'Medium'}</span></td>
                        <td>${work.dueDate ? moment(work.dueDate).format('MM/DD/YYYY') : 'N/A'}</td>
                      </tr>
                    `).join('') : `
                      <tr>
                        <td colspan="11" class="text-center text-muted">No work entries found</td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="text-center mt-4">
              <p class="text-muted small">
                This report was generated by the Work Management System<br>
                © ${moment().format('YYYY')} - All Rights Reserved
              </p>
            </div>
          </div>

          <script>
            function getStatusBadgeClass(status) {
              switch (status) {
                case 'completed': return 'success';
                case 'in-progress': return 'primary';
                case 'overdue': return 'danger';
                case 'scheduled': return 'secondary';
                case 'cancelled': return 'dark';
                default: return 'secondary';
              }
            }

            function getPriorityBadgeClass(priority) {
              switch (priority) {
                case 'urgent': return 'danger';
                case 'high': return 'warning';
                case 'medium': return 'info';
                case 'low': return 'secondary';
                default: return 'secondary';
              }
            }

          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    toast.success("Print view opened! Use Print to save as PDF.");
    setLoading(false);
    onHide();
  };

  // Handle download completed export
  const handleDownload = async (job) => {
    try {
      if (!job.result?.filename) {
        toast.error('Download URL not available');
        return;
      }

      const response = await workCalendarApi.downloadExportFile(job.result.filename);
      
      let blob;
      if (response instanceof Blob) {
        // Response is already a blob
        blob = response;
      } else {
        // Create blob from response data
        blob = new Blob([response], { 
          type: job.result.contentType || 'application/octet-stream'
        });
      }
      
      // Verify blob for PDF files
      if (job.result.filename.endsWith('.pdf') && blob.size < 1024) {
        throw new Error('PDF file appears to be corrupted or empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = job.result.filename;
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      toast.success('File downloaded successfully');

    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle cancel job
  const handleCancelJob = async (jobId) => {
    try {
      await workCalendarApi.cancelExportJob(jobId);
      toast.success('Export job cancelled');
      
      setActiveJobs(prev => {
        const newActive = new Map(prev);
        newActive.delete(jobId);
        return newActive;
      });
      
      loadExportJobs();
    } catch (error) {
      console.error('Cancel failed:', error);
      toast.error('Failed to cancel job');
    }
  };

  // Toggle column selection
  const toggleColumn = (columnKey) => {
    setSelectedColumns(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(columnKey)) {
        newSelected.delete(columnKey);
      } else {
        newSelected.add(columnKey);
      }
      return newSelected;
    });
  };

  // Select all/none columns
  const selectAllColumns = (selectAll) => {
    if (selectAll) {
      setSelectedColumns(new Set(availableColumns.map(col => col.key)));
    } else {
      setSelectedColumns(new Set());
    }
  };

  // Get content type for format
  const getContentType = (format) => {
    switch (format) {
      case 'csv': return 'text/csv';
      case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf': return 'application/pdf';
      case 'print': return 'text/html';
      default: return 'application/octet-stream';
    }
  };

  // Get file extension for format
  const getFileExtension = (format) => {
    switch (format) {
      case 'csv': return 'csv';
      case 'excel': return 'xlsx';
      case 'pdf': return 'pdf';
      case 'print': return 'html';
      default: return 'txt';
    }
  };

  // Helper functions for badge classes
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'primary';
      case 'overdue': return 'danger';
      case 'scheduled': return 'secondary';
      case 'cancelled': return 'dark';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  // Get format icon
  const getFormatIcon = (format) => {
    switch (format) {
      case 'csv': return <FaFileCsv className="text-success" />;
      case 'excel': return <FaFileExcel className="text-success" />;
      case 'pdf': return <FaFilePdf className="text-danger" />;
      default: return <FaDownload />;
    }
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'primary';
      case 'queued': return 'warning';
      case 'failed': return 'danger';
      case 'cancelled': return 'secondary';
      default: return 'light';
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" className="enhanced-export-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaDownload className="me-2" />
          {title}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Row>
          {/* Export Configuration */}
          <Col lg={showJobMonitor ? 6 : 12}>
            <Card className="mb-3">
              <Card.Header>
                <h6 className="mb-0">Export Configuration</h6>
              </Card.Header>
              <Card.Body>
                {/* Format Selection */}
                <Form.Group className="mb-3">
                  <Form.Label>Export Format</Form.Label>
                  <div className="d-flex gap-2 flex-wrap">
                    {[
                      { value: 'csv', label: 'CSV', icon: <FaFileCsv /> },
                      { value: 'excel', label: 'Excel', icon: <FaFileExcel /> },
                      { value: 'pdf', label: 'PDF', icon: <FaFilePdf /> },
                      { value: 'print', label: 'Print View', icon: <FaEye /> }
                    ].map(format => (
                      <Button
                        key={format.value}
                        variant={exportConfig.format === format.value ? 'primary' : 'outline-primary'}
                        size="sm"
                        onClick={() => setExportConfig(prev => ({ ...prev, format: format.value }))}
                        className="d-flex align-items-center gap-1"
                      >
                        {format.icon}
                        {format.label}
                      </Button>
                    ))}
                  </div>
                </Form.Group>

                {/* Options */}
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Include Analytics Summary"
                    checked={exportConfig.includeAnalytics}
                    onChange={(e) => setExportConfig(prev => ({ 
                      ...prev, 
                      includeAnalytics: e.target.checked 
                    }))}
                  />
                  {showSlotColumns && slotAnalytics && (
                    <Form.Check
                      type="checkbox"
                      label="Include Slot Analytics Summary"
                      checked={exportConfig.includeSlotAnalytics}
                      onChange={(e) => setExportConfig(prev => ({ 
                        ...prev, 
                        includeSlotAnalytics: e.target.checked 
                      }))}
                    />
                  )}
                  <Form.Check
                    type="checkbox"
                    label={`Use Background Processing (for ${workData.length} entries)`}
                    checked={exportConfig.backgroundProcessing}
                    onChange={(e) => setExportConfig(prev => ({ 
                      ...prev, 
                      backgroundProcessing: e.target.checked 
                    }))}
                    disabled={workData.length <= 100}
                  />
                </Form.Group>

                {/* Column Selection */}
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="mb-0">Columns to Export</Form.Label>
                    <div>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => selectAllColumns(true)}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => selectAllColumns(false)}
                      >
                        Select None
                      </Button>
                    </div>
                  </div>
                  
                  {/* Standard Columns */}
                  <div className="mb-3">
                    <h6 className="text-muted small mb-2">Columns to Export</h6>
                    <div className="column-selection-grid">
                      {availableColumns.map(column => (
                        <Form.Check
                          key={column.key}
                          type="checkbox"
                          label={column.label}
                          checked={selectedColumns.has(column.key)}
                          onChange={() => toggleColumn(column.key)}
                          className="mb-1"
                        />
                      ))}
                    </div>
                  </div>
                  
                  <small className="text-muted">
                    {selectedColumns.size} of {availableColumns.length} columns selected
                  </small>
                </Form.Group>

                {/* Export Info */}
                <Alert variant="info" className="mb-0">
                  <div className="d-flex justify-content-between">
                    <span>Entries to export: <strong>{workData.length}</strong></span>
                    <span>Estimated size: <strong>{Math.ceil(workData.length * selectedColumns.size * 0.05)}KB</strong></span>
                  </div>
                  {workData.length > 100 && exportConfig.backgroundProcessing && (
                    <div className="mt-1">
                      <small>Large dataset detected. Export will be processed in background.</small>
                    </div>
                  )}
                </Alert>
              </Card.Body>
            </Card>
          </Col>

          {/* Job Monitor */}
          {showJobMonitor && canViewExportJobs && (
            <Col lg={6}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">Export Jobs</h6>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={loadExportJobs}
                    disabled={jobsLoading}
                  >
                    {jobsLoading ? <Spinner size="sm" /> : <FaEye />}
                  </Button>
                </Card.Header>
                <Card.Body className="p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {exportJobs.length === 0 ? (
                    <div className="text-center p-3 text-muted">
                      No export jobs found
                    </div>
                  ) : (
                    <ListGroup variant="flush">
                      {exportJobs.map(job => (
                        <ListGroup.Item key={job.id} className="d-flex justify-content-between align-items-center">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              {getFormatIcon(job.format)}
                              <Badge bg={getStatusVariant(job.status)}>
                                {job.status}
                              </Badge>
                              <small className="text-muted">
                                {moment(job.createdAt).format('MM/DD HH:mm')}
                              </small>
                            </div>
                            
                            {activeJobs.has(job.id) && (
                              <ProgressBar
                                now={activeJobs.get(job.id).progress}
                                size="sm"
                                className="mb-1"
                              />
                            )}
                            
                            <small className="text-muted">
                              {job.entryCount} entries
                            </small>
                          </div>
                          
                          <div className="d-flex gap-1">
                            {job.status === 'completed' && (
                              <OverlayTrigger overlay={<Tooltip>Download</Tooltip>}>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleDownload(job)}
                                >
                                  <FaDownload />
                                </Button>
                              </OverlayTrigger>
                            )}
                            
                            {['queued', 'processing'].includes(job.status) && (
                              <OverlayTrigger overlay={<Tooltip>Cancel</Tooltip>}>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleCancelJob(job.id)}
                                >
                                  <FaTimes />
                                </Button>
                              </OverlayTrigger>
                            )}
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <div>
          {canViewExportJobs && (
            <Button
              variant="outline-info"
              onClick={() => setShowJobMonitor(!showJobMonitor)}
            >
              {showJobMonitor ? 'Hide' : 'Show'} Job Monitor
            </Button>
          )}
        </div>
        
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={loading || selectedColumns.size === 0}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Exporting...
              </>
            ) : (
              <>
                <FaDownload className="me-2" />
                Export {exportConfig.format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default EnhancedExportPanel;