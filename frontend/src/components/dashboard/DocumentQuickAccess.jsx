import { Card, ListGroup, Badge, Button } from 'react-bootstrap';
import { FaFileAlt, FaFilePdf, FaFileWord, FaFileExcel, FaDownload, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const DocumentQuickAccess = ({ documents = [], onDocumentAction }) => {
  const navigate = useNavigate();

  const handleDocumentView = (doc) => {
    if (onDocumentAction) {
      onDocumentAction('view', doc);
    } else {
      console.log('View document:', doc);
    }
  };

  const handleDocumentDownload = (doc) => {
    if (onDocumentAction) {
      onDocumentAction('download', doc);
    } else {
      console.log('Download:', doc.name);
    }
  };

  const displayDocuments = Array.isArray(documents) ? documents : [];

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FaFilePdf className="text-danger" />;
      case 'doc':
      case 'docx': return <FaFileWord className="text-primary" />;
      case 'xls':
      case 'xlsx': return <FaFileExcel className="text-success" />;
      default: return <FaFileAlt className="text-secondary" />;
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Policy': return <Badge bg="primary">Policy</Badge>;
      case 'Report': return <Badge bg="success">Report</Badge>;
      case 'Form': return <Badge bg="info">Form</Badge>;
      default: return <Badge bg="secondary">{category}</Badge>;
    }
  };

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            <FaFileAlt className="me-2 text-info" />
            Important Documents
          </h5>
          <Button 
            size="sm" 
            variant="outline-primary"
            onClick={() => {
              // Documents page doesn't exist yet
              console.log('Navigate to documents page');
            }}
          >
            View All
          </Button>
        </div>
        <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {displayDocuments.slice(0, 6).map((doc) => (
            <ListGroup.Item 
              key={doc.id} 
              className="px-0 py-3 border-bottom"
              style={{ transition: 'all 0.2s ease' }}
            >
              <div className="d-flex align-items-start">
                <div className="me-3 mt-1" style={{ fontSize: '1.5rem' }}>
                  {getFileIcon(doc.fileName || doc.name)}
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className="mb-0">{doc.fileName || doc.name}</h6>
                    {getCategoryBadge(doc.category)}
                  </div>
                  <small className="text-muted d-block mb-2">
                    {doc.size || 'N/A'} • Uploaded {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString()}
                  </small>
                  <div className="d-flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDocumentView(doc);
                      }}
                    >
                      <FaEye className="me-1" />View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDocumentDownload(doc);
                      }}
                    >
                      <FaDownload className="me-1" />Download
                    </Button>
                  </div>
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
        {displayDocuments.length === 0 && (
          <div className="text-center py-4 text-muted">
            <FaFileAlt style={{ fontSize: '2rem', opacity: 0.3 }} />
            <p className="mt-2 mb-0">No documents available</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default DocumentQuickAccess;
