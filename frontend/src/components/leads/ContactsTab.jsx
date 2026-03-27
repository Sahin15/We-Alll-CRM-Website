import { useState } from "react";
import { Card, Button, Badge, ListGroup, Modal, Form, Row, Col } from "react-bootstrap";
import { FaPlus, FaEdit, FaTimes, FaStar, FaPhone, FaEnvelope } from "react-icons/fa";
import { toast } from "react-toastify";
import { leadApi } from "../../api/leadApi";

const ContactsTab = ({ leadId, contacts, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    type: "Phone",
    value: "",
    label: "Primary",
    isPrimary: false,
  });

  const handleOpenModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name || "",
        designation: contact.designation || "",
        type: contact.type,
        value: contact.value,
        label: contact.label,
        isPrimary: contact.isPrimary,
      });
    } else {
      setEditingContact(null);
      setFormData({
        name: "",
        designation: "",
        type: "Phone",
        value: "",
        label: "Primary",
        isPrimary: false,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.value) {
        toast.error("Please enter contact value");
        return;
      }

      if (editingContact) {
        await leadApi.updateContact(leadId, editingContact._id, formData);
        toast.success("Contact updated");
      } else {
        await leadApi.addContact(leadId, formData);
        toast.success("Contact added");
      }
      
      setShowModal(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to save contact");
    }
  };

  const handleSetPrimary = async (contactId) => {
    try {
      await leadApi.setPrimaryContact(leadId, contactId);
      toast.success("Primary contact updated");
      onUpdate();
    } catch (error) {
      toast.error("Failed to set primary contact");
    }
  };

  const handleDelete = async (contactId) => {
    if (!window.confirm("Delete this contact?")) return;
    try {
      await leadApi.deleteContact(leadId, contactId);
      toast.success("Contact deleted");
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

  const phoneContacts = contacts.filter(c => c.type === "Phone");
  const emailContacts = contacts.filter(c => c.type === "Email");

  return (
    <>
      <Card className="border-0">
        <Card.Header className="d-flex justify-content-between align-items-center bg-white border-0 py-2">
          <h6 className="mb-0">Contact Details</h6>
          <Button size="sm" variant="primary" onClick={() => handleOpenModal()}>
            <FaPlus className="me-1" /> Add Contact
          </Button>
        </Card.Header>
        <Card.Body className="py-2">
          <Row>
            <Col md={6} className="mb-3 mb-md-0">
              <h6 className="mb-2"><FaPhone className="me-2" />Phone Numbers</h6>
              {phoneContacts.length > 0 ? (
                <div>
                  {phoneContacts.map((contact) => (
                    <div key={contact._id} className="mb-3 pb-2 border-bottom">
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                          {contact.name && (
                            <div className="fw-bold mb-1 small">{contact.name}</div>
                          )}
                          {contact.designation && (
                            <div className="text-muted small mb-1">{contact.designation}</div>
                          )}
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <small className="fw-bold">{contact.value}</small>
                            <Badge bg="secondary" className="small">{contact.label}</Badge>
                            {contact.isPrimary && <FaStar className="text-warning" title="Primary" size={12} />}
                          </div>
                        </div>
                        <div className="d-flex gap-1" style={{ flexShrink: 0 }}>
                          {!contact.isPrimary && (
                            <Button 
                              size="sm" 
                              variant="outline-warning" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetPrimary(contact._id);
                              }}
                              title="Set as primary"
                              style={{ padding: '0.25rem 0.4rem' }}
                            >
                              <FaStar size={12} />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline-primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(contact);
                            }}
                            title="Edit"
                            style={{ padding: '0.25rem 0.4rem' }}
                          >
                            <FaEdit size={12} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline-danger" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(contact._id);
                            }}
                            title="Delete"
                            style={{ padding: '0.25rem 0.4rem' }}
                          >
                            <FaTimes size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted small mb-0">No phone numbers added</p>
              )}
            </Col>
            <Col md={6}>
              <h6 className="mb-2"><FaEnvelope className="me-2" />Email Addresses</h6>
              {emailContacts.length > 0 ? (
                <div>
                  {emailContacts.map((contact) => (
                    <div key={contact._id} className="mb-3 pb-2 border-bottom">
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                          {contact.name && (
                            <div className="fw-bold mb-1 small">{contact.name}</div>
                          )}
                          {contact.designation && (
                            <div className="text-muted small mb-1">{contact.designation}</div>
                          )}
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <small className="fw-bold text-break" style={{ wordBreak: 'break-all' }}>{contact.value}</small>
                            <Badge bg="secondary" className="small">{contact.label}</Badge>
                            {contact.isPrimary && <FaStar className="text-warning" title="Primary" size={12} />}
                          </div>
                        </div>
                        <div className="d-flex gap-1" style={{ flexShrink: 0 }}>
                          {!contact.isPrimary && (
                            <Button 
                              size="sm" 
                              variant="outline-warning" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetPrimary(contact._id);
                              }}
                              title="Set as primary"
                              style={{ padding: '0.25rem 0.4rem' }}
                            >
                              <FaStar size={12} />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline-primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(contact);
                            }}
                            title="Edit"
                            style={{ padding: '0.25rem 0.4rem' }}
                          >
                            <FaEdit size={12} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline-danger" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(contact._id);
                            }}
                            title="Delete"
                            style={{ padding: '0.25rem 0.4rem' }}
                          >
                            <FaTimes size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted small mb-0">No email addresses added</p>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingContact ? "Edit" : "Add"} Contact</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Contact person name (optional)" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Designation</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="e.g., Manager, Director, Owner (optional)" 
                value={formData.designation} 
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })} 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="Phone">Phone</option>
                <option value="Email">Email</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Value *</Form.Label>
              <Form.Control 
                type={formData.type === "Email" ? "email" : "text"} 
                placeholder={formData.type === "Email" ? "email@example.com" : "+1234567890"} 
                value={formData.value} 
                onChange={(e) => setFormData({ ...formData, value: e.target.value })} 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Label</Form.Label>
              <Form.Select value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })}>
                <option value="Primary">Primary</option>
                <option value="Office">Office</option>
                <option value="Personal">Personal</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check 
                type="checkbox" 
                label="Set as primary contact" 
                checked={formData.isPrimary} 
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })} 
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>Save</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ContactsTab;
