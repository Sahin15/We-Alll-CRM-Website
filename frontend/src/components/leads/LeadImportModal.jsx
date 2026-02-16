import { useState, useRef } from 'react';
import {
  Modal,
  Button,
  Form,
  Alert,
  ProgressBar,
  Table,
  Spinner,
  Row,
  Col,
  Card
} from 'react-bootstrap';
import { FaUpload, FaDownload, FaCheck, FaFileExcel, FaFileCsv } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './LeadImportModal.css';

const LeadImportModal = ({ show, onHide, onImportComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [fileData, setFileData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    updateDuplicates: false
  });
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  const availableFields = [
    { key: 'fullName', label: 'Full Name', required: true },
    { key: 'phone', label: 'Phone Number', required: true },
    { key: 'email', label: 'Email Address', required: false },
    { key: 'companyName', label: 'Company Name', required: false },
    { key: 'service', label: 'Service Required', required: false },
    { key: 'budget', label: 'Budget Range', required: false },
    { key: 'source', label: 'Lead Source', required: false },
    { key: 'reference', label: 'Reference', required: false },
    { key: 'status', label: 'Status', required: false }
  ];

  const resetModal = () => {
    setCurrentStep(1);
    setFileData(null);
    setColumnMapping({});
    setImportOptions({ skipDuplicates: true, updateDuplicates: false });
    setImporting(false);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onHide();
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/lead-import/template', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lead-import-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload only Excel (.xlsx, .xls) or CSV files');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/lead-import/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      setFileData(result.data);
      setColumnMapping(result.data.suggestedMapping || {});
      setCurrentStep(2);
      toast.success(`File uploaded successfully! Found ${result.data.totalRows} rows`);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    }
  };

  const handleColumnMappingChange = (columnIndex, fieldName) => {
    setColumnMapping(prev => ({
      ...prev,
      [columnIndex]: fieldName
    }));
  };

  const handleImport = async () => {
    if (!fileData) return;

    const requiredFields = availableFields.filter(field => field.required);
    const mappedFields = Object.values(columnMapping);
    const missingRequired = requiredFields.filter(field => !mappedFields.includes(field.key));

    if (missingRequired.length > 0) {
      toast.error(`Please map required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setImporting(true);
    setCurrentStep(3);

    try {
      const response = await fetch('/api/lead-import/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fileId: fileData.fileId,
          columnMapping,
          options: importOptions
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Import failed');
      }

      setImportResults(result.data);
      setCurrentStep(4);
      
      if (result.data.successful > 0) {
        toast.success(`Successfully imported ${result.data.successful} leads!`);
        if (onImportComplete) {
          onImportComplete();
        }
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import leads');
      setCurrentStep(2);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Import Leads from Excel/CSV</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="import-progress mb-4">
          <div className="d-flex justify-content-between">
            {[1, 2, 3, 4].map(step => (
              <div key={step} className={`step-indicator ${currentStep >= step ? 'active' : ''}`}>
                <div className="step-number">{step}</div>
                <div className="step-label">
                  {step === 1 && 'Upload'}
                  {step === 2 && 'Map'}
                  {step === 3 && 'Import'}
                  {step === 4 && 'Results'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {currentStep === 1 && (
          <div className="upload-step">
            <div className="text-center mb-4">
              <FaUpload size={48} className="text-primary mb-3" />
              <h5>Upload Lead File</h5>
              <p className="text-muted">
                Upload an Excel (.xlsx, .xls) or CSV file containing your leads data
              </p>
            </div>

            <div className="upload-area mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="d-none"
              />
              
              <div 
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-content">
                  <FaFileExcel size={32} className="text-success me-2" />
                  <FaFileCsv size={32} className="text-info" />
                  <p className="mt-2 mb-0">Click to select file or drag and drop</p>
                  <small className="text-muted">Maximum file size: 10MB</small>
                </div>
              </div>
            </div>

            <div className="template-section">
              <h6>Need a template?</h6>
              <p className="text-muted small">
                Download our template to see the expected format and required fields
              </p>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={downloadTemplate}
              >
                <FaDownload className="me-1" />
                Download Template
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="mapping-step">
            <div className="mb-4">
              <h5>Map Your Columns</h5>
              <p className="text-muted">
                Match your file columns to our lead fields. Required fields are marked with *
              </p>
            </div>

            <Row>
              <Col md={6}>
                <Card className="h-100">
                  <Card.Header>
                    <h6 className="mb-0">Your File Columns</h6>
                  </Card.Header>
                  <Card.Body>
                    {fileData?.headers.map((header, index) => (
                      <div key={index} className="mb-2">
                        <Form.Group>
                          <Form.Label className="small fw-bold">{header}</Form.Label>
                          <Form.Select
                            size="sm"
                            value={columnMapping[index] || ''}
                            onChange={(e) => handleColumnMappingChange(index, e.target.value)}
                          >
                            <option value="">-- Skip this column --</option>
                            {availableFields.map(field => (
                              <option key={field.key} value={field.key}>
                                {field.label} {field.required ? '*' : ''}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="h-100">
                  <Card.Header>
                    <h6 className="mb-0">Data Preview</h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="preview-table">
                      <Table size="sm" responsive>
                        <thead>
                          <tr>
                            {fileData?.headers.map((header, index) => (
                              <th key={index} className="small">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fileData?.preview.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {fileData.headers.map((header, colIndex) => (
                                <td key={colIndex} className="small">
                                  {row[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <div className="import-options mt-4">
              <h6>Import Options</h6>
              <Form.Check
                type="checkbox"
                label="Skip duplicate leads (based on phone/email)"
                checked={importOptions.skipDuplicates}
                onChange={(e) => setImportOptions(prev => ({
                  ...prev,
                  skipDuplicates: e.target.checked,
                  updateDuplicates: e.target.checked ? false : prev.updateDuplicates
                }))}
              />
              <Form.Check
                type="checkbox"
                label="Update existing leads with new data"
                checked={importOptions.updateDuplicates}
                disabled={importOptions.skipDuplicates}
                onChange={(e) => setImportOptions(prev => ({
                  ...prev,
                  updateDuplicates: e.target.checked,
                  skipDuplicates: e.target.checked ? false : prev.skipDuplicates
                }))}
              />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="import-step text-center">
            <Spinner animation="border" size="lg" className="mb-3" />
            <h5>Importing Leads...</h5>
            <p className="text-muted">Please wait while we process your file</p>
            <ProgressBar animated now={100} className="mb-3" />
          </div>
        )}

        {currentStep === 4 && (
          <div className="results-step">
            <div className="text-center mb-4">
              <FaCheck size={48} className="text-success mb-3" />
              <h5>Import Complete!</h5>
            </div>

            <Row className="mb-4">
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <h4 className="text-success">{importResults?.successful || 0}</h4>
                    <small>Successful</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <h4 className="text-warning">{importResults?.duplicates || 0}</h4>
                    <small>Duplicates</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <h4 className="text-danger">{importResults?.failed || 0}</h4>
                    <small>Failed</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <h4 className="text-info">{importResults?.total || 0}</h4>
                    <small>Total Rows</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {importResults?.errors?.length > 0 && (
              <Alert variant="danger">
                <Alert.Heading>Errors ({importResults.errors.length})</Alert.Heading>
                <div className="max-height-200 overflow-auto">
                  {importResults.errors.map((error, index) => (
                    <div key={index} className="small">{error}</div>
                  ))}
                </div>
              </Alert>
            )}

            {importResults?.warnings?.length > 0 && (
              <Alert variant="warning">
                <Alert.Heading>Warnings ({importResults.warnings.length})</Alert.Heading>
                <div className="max-height-200 overflow-auto">
                  {importResults.warnings.map((warning, index) => (
                    <div key={index} className="small">{warning}</div>
                  ))}
                </div>
              </Alert>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {currentStep === 1 && (
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        )}
        
        {currentStep === 2 && (
          <>
            <Button variant="secondary" onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <Button variant="primary" onClick={handleImport}>
              Import Leads ({fileData?.totalRows || 0} rows)
            </Button>
          </>
        )}
        
        {currentStep === 4 && (
          <Button variant="success" onClick={handleClose}>
            Done
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default LeadImportModal;