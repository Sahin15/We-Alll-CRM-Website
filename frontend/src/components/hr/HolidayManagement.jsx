import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Badge,
  Alert,
  Spinner,
  Row,
  Col,
  InputGroup
} from 'react-bootstrap';
import {
  FaCalendarAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaGift,
  FaSun,
  FaSnowflake
} from 'react-icons/fa';
import toast from "../../utils/toast";
import holidayApi from '../../api/holidayApi';
import { useAuth } from '../../context/AuthContext';
import { checkPageAccess, PAGE_ACCESS } from '../../constants/pageAccess';

const HolidayManagement = () => {
  const { user, canAccess } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'public',
    description: ''
  });

  const holidayTypes = [
    { value: 'public', label: 'Public Holiday', icon: <FaGift />, color: 'success' },
    { value: 'religious', label: 'Religious Holiday', icon: <FaSun />, color: 'warning' },
    { value: 'national', label: 'National Holiday', icon: <FaCalendarAlt />, color: 'primary' },
    { value: 'company', label: 'Company Holiday', icon: <FaSnowflake />, color: 'info' }
  ];

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await holidayApi.getHolidays();
      setHolidays(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch holidays');
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHoliday) {
        await holidayApi.updateHoliday(editingHoliday._id, formData);
        toast.success('Holiday updated successfully');
      } else {
        await holidayApi.createHoliday(formData);
        toast.success('Holiday created successfully');
      }
      
      fetchHolidays();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save holiday');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await holidayApi.deleteHoliday(id);
        toast.success('Holiday deleted successfully');
        fetchHolidays();
      } catch (error) {
        toast.error('Failed to delete holiday');
      }
    }
  };

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date.split('T')[0], // Format for date input
      type: holiday.type,
      description: holiday.description || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingHoliday(null);
    setFormData({
      name: '',
      date: '',
      type: 'public',
      description: ''
    });
  };

  const getTypeInfo = (type) => {
    return holidayTypes.find(t => t.value === type) || holidayTypes[0];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredHolidays = holidays.filter(holiday =>
    holiday.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    holiday.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if user has permission to manage holidays
  const canManage = checkPageAccess(canAccess, PAGE_ACCESS.companyHolidayManage);

  if (!canManage) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Access Denied</Alert.Heading>
        <p>You don't have permission to manage holidays. Only HR and Admin can manage holidays.</p>
      </Alert>
    );
  }

  return (
    <div>
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <FaCalendarAlt className="me-2 text-primary" />
              Holiday Management
            </h5>
            <small className="text-muted">Manage company holidays and observances</small>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <FaPlus className="me-1" />
            Add Holiday
          </Button>
        </Card.Header>

        <Card.Body>
          {/* Search */}
          <Row className="mb-3">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search holidays..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table responsive hover className="text-center">
              <thead>
                <tr>
                  <th className="text-start">Holiday Name</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No holidays found
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((holiday) => {
                    const typeInfo = getTypeInfo(holiday.type);
                    const holidayDate = new Date(holiday.date);
                    return (
                      <tr key={holiday._id}>
                        <td className="text-start">
                          <strong>{holiday.name}</strong>
                        </td>
                        <td>
                          {holidayDate.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </td>
                        <td>
                          <Badge bg="light" text="dark" className="border">
                            {holidayDate.toLocaleDateString('en-US', { weekday: 'long' })}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={typeInfo.color}>
                            {typeInfo.icon} {typeInfo.label}
                          </Badge>
                        </td>
                        <td>
                          <small 
                            className="text-muted"
                            style={{ 
                              display: 'inline-block',
                              maxWidth: '150px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={holiday.description || 'No description'}
                          >
                            {holiday.description || 'No description'}
                          </small>
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-1"
                            onClick={() => handleEdit(holiday)}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(holiday._id)}
                          >
                            <FaTrash />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Holiday Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Holiday Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Christmas Day"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Holiday Type *</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    {holidayTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                {/* Removed Holiday Status section */}
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description about the holiday..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default HolidayManagement;