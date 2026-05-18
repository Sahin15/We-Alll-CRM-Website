import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Badge, 
  Alert, 
  Modal, 
  Form,
  ProgressBar,
  ListGroup,
  OverlayTrigger,
  Tooltip,
  Dropdown,
  Row,
  Col
} from 'react-bootstrap';
import { 
  FaUpload, 
  FaFile, 
  FaImage, 
  FaFilePdf, 
  FaFileWord, 
  FaFileExcel,
  FaFileCode,
  FaFileArchive,
  FaDownload,
  FaTrash,
  FaEye,
  FaPlus,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaCloudUploadAlt,
  FaSpinner
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import moment from 'moment';
import './FileAttachments.css';

/**
 * File Attachments Component
 * Features:
 * - Drag & drop file upload
 * - Multiple file selection
 * - File type validation
 * - Progress tracking
 * - File preview
 * - Download/delete files
 * - File size limits
 * - Mock file storage (ready for API integration)
 */
const FileAttachments = ({ 
  workItemId, 
  attachments = [], 
  onAttachmentsChange,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar'],
  compact = false,
  readOnly = false
}) => {
  // State
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [localAttachments, setLocalAttachments] = useState(attachments);
  
  // Refs
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Update local attachments when prop changes
  useEffect(() => {
    setLocalAttachments(attachments);
  }, [attachments]);

  // File type icons mapping
  const getFileIcon = (fileName, mimeType) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const type = mimeType || '';
    
    if (type.startsWith('image/')) return FaImage;
    if (type === 'application/pdf' || extension === 'pdf') return FaFilePdf;
    if (type.includes('word') || ['doc', 'docx'].includes(extension)) return FaFileWord;
    if (type.includes('excel') || type.includes('spreadsheet') || ['xls', 'xlsx'].includes(extension)) return FaFileExcel;
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'xml'].includes(extension)) return FaFileCode;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return FaFileArchive;
    
    return FaFile;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Validate file
  const validateFile = (file) => {
    const errors = [];
    
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size exceeds ${formatFileSize(maxFileSize)} limit`);
    }
    
    // Check file type
    const isAllowed = allowedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      } else if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      } else {
        return file.type === type;
      }
    });
    
    if (!isAllowed) {
      errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    return errors;
  };

  // Handle file selection
  const handleFileSelect = useCallback((files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    const invalidFiles = [];
    
    fileArray.forEach(file => {
      const errors = validateFile(file);
      if (errors.length === 0) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ file, errors });
      }
    });
    
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(({ file, errors }) => {
        toast.error(`${file.name}: ${errors.join(', ')}`);
      });
    }
    
    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setShowUploadModal(true);
    }
  }, [maxFileSize, allowedTypes]);

  // Handle drag events
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input
    e.target.value = '';
  }, [handleFileSelect]);

  // Simulate file upload with progress
  const simulateUpload = useCallback((file) => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Create mock file attachment
          const attachment = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Current User', // In real app, get from auth context
            url: URL.createObjectURL(file), // Mock URL for preview
            workItemId: workItemId
          };
          
          resolve(attachment);
        }
        
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: progress
        }));
      }, 100 + Math.random() * 200);
    });
  }, [workItemId]);

  // Upload selected files
  const uploadFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    const newAttachments = [];
    
    try {
      // Upload files one by one (in real app, could be parallel)
      for (const file of selectedFiles) {
        const attachment = await simulateUpload(file);
        newAttachments.push(attachment);
      }
      
      // Update attachments
      const updatedAttachments = [...localAttachments, ...newAttachments];
      setLocalAttachments(updatedAttachments);
      
      // Notify parent component
      if (onAttachmentsChange) {
        onAttachmentsChange(updatedAttachments);
      }
      
      toast.success(`${newAttachments.length} file(s) uploaded successfully!`);
      
      // Reset state
      setSelectedFiles([]);
      setShowUploadModal(false);
      setUploadProgress({});
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, localAttachments, onAttachmentsChange, simulateUpload]);

  // Delete attachment
  const deleteAttachment = useCallback((attachmentId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      const updatedAttachments = localAttachments.filter(att => att.id !== attachmentId);
      setLocalAttachments(updatedAttachments);
      
      if (onAttachmentsChange) {
        onAttachmentsChange(updatedAttachments);
      }
      
      toast.success('File deleted successfully');
    }
  }, [localAttachments, onAttachmentsChange]);

  // Download attachment
  const downloadAttachment = useCallback((attachment) => {
    // In real app, this would download from server
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Downloading ${attachment.name}`);
  }, []);

  // Preview attachment
  const previewAttachment = useCallback((attachment) => {
    setPreviewFile(attachment);
    setShowPreview(true);
  }, []);

  // Get file color based on type
  const getFileColor = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'success';
    if (mimeType === 'application/pdf') return 'danger';
    if (mimeType.includes('word')) return 'primary';
    if (mimeType.includes('excel')) return 'success';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'warning';
    return 'secondary';
  };

  // Render attachment item
  const renderAttachment = (attachment) => {
    const FileIcon = getFileIcon(attachment.name, attachment.type);
    const color = getFileColor(attachment.type);
    
    return (
      <ListGroup.Item key={attachment.id} className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <FileIcon className={`text-${color} me-2`} size={20} />
          <div>
            <div className="fw-bold">{attachment.name}</div>
            <small className="text-muted">
              {formatFileSize(attachment.size)} • 
              Uploaded {moment(attachment.uploadedAt).fromNow()} by {attachment.uploadedBy}
            </small>
          </div>
        </div>
        
        {!readOnly && (
          <div className="d-flex gap-1">
            {attachment.type.startsWith('image/') && (
              <OverlayTrigger overlay={<Tooltip>Preview</Tooltip>}>
                <Button 
                  variant="outline-info" 
                  size="sm"
                  onClick={() => previewAttachment(attachment)}
                >
                  <FaEye />
                </Button>
              </OverlayTrigger>
            )}
            
            <OverlayTrigger overlay={<Tooltip>Download</Tooltip>}>
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={() => downloadAttachment(attachment)}
              >
                <FaDownload />
              </Button>
            </OverlayTrigger>
            
            <OverlayTrigger overlay={<Tooltip>Delete</Tooltip>}>
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={() => deleteAttachment(attachment.id)}
              >
                <FaTrash />
              </Button>
            </OverlayTrigger>
          </div>
        )}
      </ListGroup.Item>
    );
  };

  // Compact view
  if (compact) {
    return (
      <div className="file-attachments-compact">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <FaFile className="text-muted" />
            <span className="small text-muted">
              {localAttachments.length} attachment(s)
            </span>
          </div>
          
          {!readOnly && (
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaPlus size={10} />
            </Button>
          )}
        </div>
        
        {localAttachments.length > 0 && (
          <div className="attachment-list-compact">
            {localAttachments.slice(0, 3).map(attachment => {
              const FileIcon = getFileIcon(attachment.name, attachment.type);
              return (
                <div key={attachment.id} className="d-flex align-items-center gap-2 mb-1">
                  <FileIcon size={14} className="text-muted" />
                  <span className="small text-truncate" style={{ maxWidth: '150px' }}>
                    {attachment.name}
                  </span>
                </div>
              );
            })}
            {localAttachments.length > 3 && (
              <small className="text-muted">+{localAttachments.length - 3} more</small>
            )}
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  // Full view
  return (
    <>
      <Card className="file-attachments-card">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaFile className="text-primary" />
            <span className="fw-bold">File Attachments</span>
            <Badge bg="secondary">{localAttachments.length}</Badge>
          </div>
          
          {!readOnly && (
            <Dropdown>
              <Dropdown.Toggle variant="outline-primary" size="sm">
                <FaPlus /> Add Files
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => fileInputRef.current?.click()}>
                  <FaUpload className="me-2" />
                  Browse Files
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setShowUploadModal(true)}>
                  <FaCloudUploadAlt className="me-2" />
                  Drag & Drop Zone
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </Card.Header>
        
        <Card.Body>
          {localAttachments.length === 0 ? (
            <Alert variant="info" className="text-center mb-0">
              <FaFile size={24} className="mb-2 d-block mx-auto text-muted" />
              <div>No files attached yet</div>
              {!readOnly && (
                <small className="text-muted">
                  Click "Add Files" or drag & drop files here
                </small>
              )}
            </Alert>
          ) : (
            <ListGroup variant="flush">
              {localAttachments.map(renderAttachment)}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(',')}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCloudUploadAlt className="me-2" />
            Upload Files
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          {selectedFiles.length === 0 ? (
            // Drag & Drop Zone
            <div
              ref={dropZoneRef}
              className={`drag-drop-zone p-5 text-center border-2 border-dashed rounded ${
                dragOver ? 'border-primary bg-light' : 'border-secondary'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer', minHeight: '200px' }}
            >
              <FaCloudUploadAlt 
                size={48} 
                className={`mb-3 ${dragOver ? 'text-primary' : 'text-muted'}`} 
              />
              <h5 className={dragOver ? 'text-primary' : 'text-muted'}>
                {dragOver ? 'Drop files here' : 'Drag & drop files here'}
              </h5>
              <p className="text-muted mb-3">
                or click to browse files
              </p>
              <div className="small text-muted">
                <div>Max file size: {formatFileSize(maxFileSize)}</div>
                <div>Allowed types: {allowedTypes.join(', ')}</div>
              </div>
            </div>
          ) : (
            // Selected Files List
            <div>
              <h6 className="mb-3">Selected Files ({selectedFiles.length})</h6>
              
              {selectedFiles.map((file, index) => (
                <div key={index} className="d-flex align-items-center justify-content-between p-2 border rounded mb-2">
                  <div className="d-flex align-items-center">
                    {React.createElement(getFileIcon(file.name, file.type), {
                      className: 'text-primary me-2',
                      size: 20
                    })}
                    <div>
                      <div className="fw-bold">{file.name}</div>
                      <small className="text-muted">{formatFileSize(file.size)}</small>
                    </div>
                  </div>
                  
                  {uploading && uploadProgress[file.name] !== undefined ? (
                    <div style={{ width: '100px' }}>
                      <ProgressBar 
                        now={uploadProgress[file.name]} 
                        size="sm"
                        label={`${Math.round(uploadProgress[file.name])}%`}
                      />
                    </div>
                  ) : (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                      }}
                      disabled={uploading}
                    >
                      <FaTimes />
                    </Button>
                  )}
                </div>
              ))}
              
              {uploading && (
                <Alert variant="info" className="d-flex align-items-center">
                  <FaSpinner className="fa-spin me-2" />
                  Uploading files... Please wait.
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowUploadModal(false);
              setSelectedFiles([]);
              setUploadProgress({});
            }}
            disabled={uploading}
          >
            Cancel
          </Button>
          
          {selectedFiles.length > 0 && (
            <Button 
              variant="primary" 
              onClick={uploadFiles}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <FaSpinner className="fa-spin me-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <FaUpload className="me-2" />
                  Upload {selectedFiles.length} File(s)
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEye className="me-2" />
            File Preview
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="text-center">
          {previewFile && (
            <div>
              <h6 className="mb-3">{previewFile.name}</h6>
              
              {previewFile.type.startsWith('image/') ? (
                <img loading="lazy" src={previewFile.url} 
                  alt={previewFile.name}
                  style={{ maxWidth: '100%', maxHeight: '400px' }}
                  className="rounded"
                />
              ) : (
                <div className="p-4">
                  {React.createElement(getFileIcon(previewFile.name, previewFile.type), {
                    size: 64,
                    className: 'text-muted mb-3'
                  })}
                  <div>Preview not available for this file type</div>
                  <small className="text-muted">
                    {formatFileSize(previewFile.size)} • {previewFile.type}
                  </small>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
          
          {previewFile && (
            <Button 
              variant="primary" 
              onClick={() => downloadAttachment(previewFile)}
            >
              <FaDownload className="me-2" />
              Download
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Custom Styles */}
      <style jsx>{`
        .drag-drop-zone {
          transition: all 0.3s ease;
        }
        
        .drag-drop-zone:hover {
          border-color: var(--bs-primary) !important;
          background-color: var(--bs-light) !important;
        }
        
        .file-attachments-compact .attachment-list-compact {
          max-height: 100px;
          overflow-y: auto;
        }
        
        .fa-spin {
          animation: fa-spin 1s infinite linear;
        }
        
        @keyframes fa-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default FileAttachments;
