import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { projectApi } from '../../api/projectApi';
import { clientApi } from '../../api/clientApi';
import { userApi } from '../../api/userApi';
import departmentApi from '../../api/departmentApi';

/**
 * Simplified Project Creation/Edit Modal
 * Only essential fields - no department complexity
 */
const SimplifiedProjectModal = ({ show, onHide, onSuccess, project = null }) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    projectHead: '',
    departments: [],
    description: '',
    startDate: '',
    budget: '',
    priority: 'medium',
    status: 'Pending',
    enableSlotSystem: true, // Always enabled
    totalSlots: 20 // Always 20 slots per month
  });

  useEffect(() => {
    if (show) {
      loadClients();
      loadEmployees();
      loadDepartments();
      
      if (project) {
        // Edit mode - populate form
        setFormData({
          name: project.name || '',
          client: project.client?._id || '',
          projectHead: project.projectHead?._id || '',
          departments: Array.isArray(project.departments) 
            ? project.departments.map(d => d._id || d)
            : project.department ? [project.department._id || project.department] : [],
          description: project.description || '',
          startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
          budget: project.budget || '',
          priority: project.priority || 'medium',
          status: project.status || 'Pending',
          enableSlotSystem: true, // Always enabled
          totalSlots: 20 // Always 20 slots per month
        });
      } else {
        // Create mode - reset form
        setFormData({
          name: '',
          client: '',
          projectHead: '',
          departments: [],
          description: '',
          startDate: '',
          budget: '',
          priority: 'medium',
          status: 'Pending',
          enableSlotSystem: true, // Always enabled
          totalSlots: 20 // Always 20 slots per month
        });
      }
    }
  }, [show, project]);

  const loadClients = async () => {
    try {
      const response = await clientApi.getAllClients();
      const clientList = response.data || response || [];
      setClients(clientList);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await userApi.getAllUsers();
      const allUsers = response.data || response.users || [];
      // Filter to only employees (not clients)
      const employeeList = allUsers.filter(u => u.role !== 'client');
      setEmployees(employeeList);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentApi.getAllDepartments();
      const deptList = Array.isArray(response) ? response : (response.data || response.departments || []);
      setDepartments(deptList);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleDepartmentChange = (departmentId, isChecked) => {
    setFormData(prev => {
      const newDepartments = isChecked 
        ? [...prev.departments, departmentId]
        : prev.departments.filter(id => id !== departmentId);
      
      return {
        ...prev,
        departments: newDepartments
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.projectHead || !formData.startDate) {
      toast.error('Please fill in all required fields (name, project head, start date)');
      return;
    }

    try {
      setLoading(true);
      
      const projectData = {
        name: formData.name,
        client: formData.client || null,
        projectHead: formData.projectHead,
        departments: formData.departments,
        description: formData.description,
        startDate: formData.startDate,
        budget: formData.budget ? parseFloat(formData.budget) : 0,
        priority: formData.priority,
        status: formData.status,
        enableSlotSystem: formData.enableSlotSystem,
        totalSlots: formData.totalSlots ? parseInt(formData.totalSlots) : 0
      };

      if (project) {
        // Update existing project
        await projectApi.updateProject(project._id, projectData);
        toast.success('Project updated successfully!');
      } else {
        // Create new project
        await projectApi.createProject(projectData);
        toast.success('Project created successfully!');
      }

      onSuccess();
      onHide();
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error(error.response?.data?.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {project ? 'Edit Project' : 'Create New Project'}
        </Modal.Title>
      </Modal.Header>
      
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <small>
              <strong>Simplified Workflow:</strong> Just enter project name, assign a Project Head, and optionally select a client. 
              The Project Head will manage team members and work assignments.
            </small>
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label>Project Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter project name"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Project Head <span className="text-danger">*</span></Form.Label>
            <Form.Select
              name="projectHead"
              value={formData.projectHead}
              onChange={handleChange}
              required
            >
              <option value="">Select Project Head...</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              Project Head will manage team members and assign work
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Client (Optional)</Form.Label>
            <Form.Select
              name="client"
              value={formData.client}
              onChange={handleChange}
            >
              <option value="">No client / Internal project</option>
              {clients.map(client => (
                <option key={client._id} value={client._id}>
                  {client.name} {client.company && `- ${client.company}`}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Services Required <span className="text-muted">(Optional)</span>
            </Form.Label>
            <div className="border rounded p-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
              {departments.map((dept) => (
                <Form.Check
                  key={dept._id}
                  type="checkbox"
                  id={`dept-${dept._id}`}
                  label={dept.name}
                  checked={formData.departments.includes(dept._id)}
                  onChange={(e) => handleDepartmentChange(dept._id, e.target.checked)}
                  className="mb-1"
                />
              ))}
              {departments.length === 0 && (
                <small className="text-muted">No services available</small>
              )}
            </div>
            <Form.Text className="text-muted">
              Select services/departments involved in this project (for information only)
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter project description"
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Start Date <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Priority</Form.Label>
                <Form.Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Budget</Form.Label>
            <Form.Control
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              placeholder="Enter project budget"
              min="0"
              step="0.01"
            />
          </Form.Group>

          <hr className="my-4" />

          {/* Slot System is automatically enabled with 20 slots per month - hidden from users */}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {project ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              project ? 'Update Project' : 'Create Project'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default SimplifiedProjectModal;
