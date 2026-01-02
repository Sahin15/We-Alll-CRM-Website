import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { FaFile, FaEye, FaCode } from 'react-icons/fa';
import FileAttachments from './FileAttachments';

/**
 * File Attachments Demo Component
 * Shows how to integrate and use the FileAttachments component
 */
const FileAttachmentsDemo = () => {
  const [attachments, setAttachments] = useState([
    // Mock existing attachments
    {
      id: 1,
      name: 'project-requirements.pdf',
      size: 2048576, // 2MB
      type: 'application/pdf',
      uploadedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      uploadedBy: 'John Doe',
      url: 'https://example.com/files/project-requirements.pdf',
      workItemId: 'work-item-123'
    },
    {
      id: 2,
      name: 'design-mockup.png',
      size: 1536000, // 1.5MB
      type: 'image/png',
      uploadedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      uploadedBy: 'Jane Smith',
      url: 'https://via.placeholder.com/800x600/007bff/ffffff?text=Design+Mockup',
      workItemId: 'work-item-123'
    },
    {
      id: 3,
      name: 'api-documentation.docx',
      size: 512000, // 512KB
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      uploadedBy: 'Bob Johnson',
      url: 'https://example.com/files/api-documentation.docx',
      workItemId: 'work-item-123'
    }
  ]);

  const [showCode, setShowCode] = useState(false);

  const handleAttachmentsChange = (newAttachments) => {
    console.log('Attachments updated:', newAttachments);
    setAttachments(newAttachments);
  };

  const codeExample = `
// Basic Usage
import FileAttachments from './components/work/FileAttachments';

const MyComponent = () => {
  const [attachments, setAttachments] = useState([]);

  const handleAttachmentsChange = (newAttachments) => {
    setAttachments(newAttachments);
    // Save to backend API
    // await saveAttachments(workItemId, newAttachments);
  };

  return (
    <FileAttachments
      workItemId="work-item-123"
      attachments={attachments}
      onAttachmentsChange={handleAttachmentsChange}
      maxFileSize={10 * 1024 * 1024} // 10MB
      allowedTypes={[
        'image/*', 
        'application/pdf', 
        '.doc', '.docx', 
        '.xls', '.xlsx', 
        '.txt', '.zip'
      ]}
    />
  );
};

// Compact Usage (for work item cards)
<FileAttachments
  workItemId="work-item-123"
  attachments={attachments}
  onAttachmentsChange={handleAttachmentsChange}
  compact={true}
/>

// Read-only Usage (for viewing only)
<FileAttachments
  workItemId="work-item-123"
  attachments={attachments}
  readOnly={true}
/>
`;

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">File Attachments Demo</h2>
              <p className="text-muted mb-0">
                Interactive demo of the File Attachments component with full functionality
              </p>
            </div>
            
            <Button 
              variant="outline-secondary"
              onClick={() => setShowCode(!showCode)}
            >
              <FaCode className="me-2" />
              {showCode ? 'Hide Code' : 'Show Code'}
            </Button>
          </div>

          {showCode && (
            <Card className="mb-4">
              <Card.Header>
                <FaCode className="me-2" />
                Integration Code Example
              </Card.Header>
              <Card.Body>
                <pre className="bg-light p-3 rounded">
                  <code>{codeExample}</code>
                </pre>
              </Card.Body>
            </Card>
          )}

          <Row>
            <Col lg={8}>
              <Card>
                <Card.Header>
                  <FaFile className="me-2" />
                  Full File Attachments Component
                </Card.Header>
                <Card.Body>
                  <FileAttachments
                    workItemId="work-item-123"
                    attachments={attachments}
                    onAttachmentsChange={handleAttachmentsChange}
                    maxFileSize={10 * 1024 * 1024} // 10MB
                    allowedTypes={[
                      'image/*', 
                      'application/pdf', 
                      '.doc', '.docx', 
                      '.xls', '.xlsx', 
                      '.txt', '.zip', '.rar'
                    ]}
                  />
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className="mb-3">
                <Card.Header>
                  <FaEye className="me-2" />
                  Compact View
                </Card.Header>
                <Card.Body>
                  <FileAttachments
                    workItemId="work-item-123"
                    attachments={attachments}
                    onAttachmentsChange={handleAttachmentsChange}
                    compact={true}
                  />
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>
                  <FaEye className="me-2" />
                  Read-Only View
                </Card.Header>
                <Card.Body>
                  <FileAttachments
                    workItemId="work-item-123"
                    attachments={attachments}
                    readOnly={true}
                  />
                </Card.Body>
              </Card>

              <Alert variant="info">
                <h6>Features Included:</h6>
                <ul className="mb-0 small">
                  <li>✅ Drag & drop upload</li>
                  <li>✅ Multiple file selection</li>
                  <li>✅ File type validation</li>
                  <li>✅ Size limit enforcement</li>
                  <li>✅ Upload progress tracking</li>
                  <li>✅ File preview (images)</li>
                  <li>✅ Download functionality</li>
                  <li>✅ Delete with confirmation</li>
                  <li>✅ Compact & read-only modes</li>
                  <li>✅ Mobile responsive</li>
                </ul>
              </Alert>

              <Alert variant="warning">
                <h6>Mock Implementation:</h6>
                <p className="mb-0 small">
                  This demo uses mock file storage with localStorage. 
                  In production, integrate with your backend API for 
                  actual file upload and storage.
                </p>
              </Alert>
            </Col>
          </Row>

          <Row className="mt-4">
            <Col>
              <Card>
                <Card.Header>
                  Current Attachments State (Debug)
                </Card.Header>
                <Card.Body>
                  <pre className="bg-light p-3 rounded small">
                    {JSON.stringify(attachments, null, 2)}
                  </pre>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default FileAttachmentsDemo;