import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Modal, Form, Badge, InputGroup } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaCopy, FaLock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { projectApi } from '../../api/projectApi';
import { formatDate } from '../../utils/helpers';

const ProjectCredentials = ({ projectId, canEdit }) => {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [canViewPassword, setCanViewPassword] = useState(false);
  const [accessUsers, setAccessUsers] = useState([]);
  
  const [formData, setFormData] = useState({
    platform: '',
    url: '',
    username: '',
    password: '',
    notes: ''
  });

  useEffect(() => {
    fetchCredentials();
  }, [projectId]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const res = await projectApi.getProjectCredentials(projectId);
      if (res.success) {
        setCredentials(res.data);
        setCanViewPassword(!!res.canViewPassword);
        setAccessUsers(res.accessUsers || []);
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
      if (error.response && error.response.status === 403) {
        // Access denied, handled by UI gracefully
      } else {
        toast.error('Failed to load credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (cred = null) => {
    if (cred) {
      setEditingId(cred._id);
      setFormData({
        platform: cred.platform,
        url: cred.url || '',
        username: cred.username,
        password: canViewPassword ? cred.password : '',
        notes: cred.notes || ''
      });
    } else {
      setEditingId(null);
      setFormData({ platform: '', url: '', username: '', password: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await projectApi.updateProjectCredential(projectId, editingId, formData);
        toast.success('Credential updated successfully');
      } else {
        await projectApi.addProjectCredential(projectId, formData);
        toast.success('Credential added successfully');
      }
      handleCloseModal();
      fetchCredentials();
    } catch (error) {
      console.error('Error saving credential:', error);
      toast.error(error.response?.data?.message || 'Failed to save credential');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      try {
        await projectApi.deleteProjectCredential(projectId, id);
        toast.success('Credential deleted successfully');
        fetchCredentials();
      } catch (error) {
        console.error('Error deleting credential:', error);
        toast.error('Failed to delete credential');
      }
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  if (loading) {
    return <div className="text-center py-4">Loading credentials...</div>;
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <FaLock className="me-2 text-primary" /> Client Credentials
        </h5>
        {canEdit && (
          <Button variant="primary" size="sm" onClick={() => handleShowModal()}>
            <FaPlus className="me-2" /> Add Credential
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {credentials.length === 0 ? (
          <p className="text-muted text-center py-4">No credentials stored for this project yet.</p>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Username / Email</th>
                  <th>Password</th>
                  <th>Notes</th>
                  <th>Added On</th>
                  {canEdit && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred) => (
                  <tr key={cred._id}>
                    <td>
                      <strong>{cred.platform}</strong>
                      {cred.url && (
                        <div className="small">
                          <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                            Link
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <span className="me-2">{cred.username}</span>
                        <Button 
                          variant="link" 
                          className="p-0 text-secondary" 
                          onClick={() => copyToClipboard(cred.username, 'Username')}
                          title="Copy Username"
                        >
                          <FaCopy />
                        </Button>
                      </div>
                    </td>
                    <td>
                      {canViewPassword ? (
                        <div className="d-flex align-items-center gap-2">
                          <InputGroup size="sm" style={{ width: '180px' }}>
                            <Form.Control
                              type={visiblePasswords[cred._id] ? "text" : "password"}
                              value={cred.password}
                              readOnly
                              className="bg-light"
                            />
                            <Button 
                              variant="outline-secondary" 
                              onClick={() => togglePasswordVisibility(cred._id)}
                              title={visiblePasswords[cred._id] ? "Hide password" : "Show password"}
                            >
                              {visiblePasswords[cred._id] ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                          </InputGroup>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => copyToClipboard(cred.password, 'Password')}
                            title="Copy Password"
                          >
                            <FaCopy /> Copy
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted">••••••••</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cred.notes || ''}>
                      {cred.notes || '-'}
                    </td>
                    <td>{formatDate(cred.addedAt)}</td>
                    {canEdit && (
                      <td className="text-end">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="me-2"
                          onClick={() => handleShowModal(cred)}
                        >
                          <FaEdit />
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDelete(cred._id)}
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Edit Credential' : 'Add Credential'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Platform (e.g., Facebook, Gmail, Hosting)</Form.Label>
              <Form.Control 
                type="text" 
                name="platform"
                value={formData.platform}
                onChange={handleChange}
                required 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Login URL (Optional)</Form.Label>
              <Form.Control 
                type="url" 
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Username / Email</Form.Label>
              <Form.Control 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleChange}
                required 
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password {editingId && !canViewPassword && "(Hidden)"}</Form.Label>
              <InputGroup>
                <Form.Control 
                  type={visiblePasswords['modal'] ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingId} 
                  placeholder={editingId && !canViewPassword ? "Enter new password to change" : ""}
                />
                <Button 
                  variant="outline-secondary" 
                  onClick={() => togglePasswordVisibility('modal')}
                >
                  {visiblePasswords['modal'] ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </InputGroup>
              <Form.Text className="text-muted">
                {editingId && !canViewPassword 
                  ? "Leave blank to keep the current password. If entered, it will be securely encrypted in the database." 
                  : "Password will be securely encrypted in the database."}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes (Optional)</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingId ? 'Update Credential' : 'Save Credential'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default ProjectCredentials;
