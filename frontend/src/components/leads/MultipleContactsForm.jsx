import { useState } from "react";
import { Form, Row, Col, Button, Card, Badge } from "react-bootstrap";
import { FaPlus, FaTrash, FaStar } from "react-icons/fa";
import { toast } from "react-toastify";

const MultipleContactsForm = ({ contacts = [], onContactsChange }) => {
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    designation: "",
    type: "Phone",
    value: "",
    label: "Primary",
    isPrimary: false,
  });

  const handleAddContact = () => {
    // Contact value is now optional
    if (newContact.type === "Email" && newContact.value && !newContact.value.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    const updatedContacts = [...contacts, { ...newContact, _id: Date.now().toString() }];
    
    // First contact is always primary
    if (updatedContacts.length === 1) {
      updatedContacts[0].isPrimary = true;
    } else if (newContact.isPrimary) {
      // If setting as primary, unset other primary contacts of same type
      updatedContacts.forEach((contact, idx) => {
        if (contact.type === newContact.type && idx !== updatedContacts.length - 1) {
          contact.isPrimary = false;
        }
      });
    }

    onContactsChange(updatedContacts);
    setNewContact({
      name: "",
      designation: "",
      type: "Phone",
      value: "",
      label: "Primary",
      isPrimary: false,
    });
    setShowAddContact(false);
    toast.success("Contact added");
  };

  const handleRemoveContact = (index) => {
    const updatedContacts = contacts.filter((_, i) => i !== index);
    onContactsChange(updatedContacts);
    toast.success("Contact removed");
  };

  const handleSetPrimary = (index) => {
    const contactType = contacts[index].type;
    const updatedContacts = contacts.map((contact, idx) => ({
      ...contact,
      isPrimary: idx === index && contact.type === contactType,
    }));
    onContactsChange(updatedContacts);
  };

  const phoneContacts = contacts.filter(c => c.type === "Phone");
  const emailContacts = contacts.filter(c => c.type === "Email");

  return (
    <div className="multiple-contacts-form">
      {/* Phone Contacts */}
      <div className="mb-4">
        <h6 className="mb-3">📞 Phone Numbers</h6>
        {phoneContacts.length > 0 && (
          <div className="mb-3">
            {phoneContacts.map((contact, idx) => {
              const actualIndex = contacts.findIndex(c => c._id === contact._id);
              return (
                <Card key={contact._id} className="mb-2 border-left-primary">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <strong>{contact.value}</strong>
                          <Badge bg="secondary" className="small">{contact.label}</Badge>
                          {contact.isPrimary && <FaStar className="text-warning" size={14} title="Primary" />}
                        </div>
                        {contact.name && (
                          <div className="small text-muted mb-1">
                            <strong>Name:</strong> {contact.name}
                          </div>
                        )}
                        {contact.designation && (
                          <div className="small text-muted">
                            <strong>Designation:</strong> {contact.designation}
                          </div>
                        )}
                      </div>
                      <div className="d-flex gap-2">
                        {!contact.isPrimary && (
                          <Button
                            size="sm"
                            variant="outline-warning"
                            onClick={() => handleSetPrimary(actualIndex)}
                            title="Set as primary"
                          >
                            <FaStar size={12} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleRemoveContact(actualIndex)}
                          title="Remove"
                        >
                          <FaTrash size={12} />
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Contacts */}
      <div className="mb-4">
        <h6 className="mb-3">✉️ Email Addresses</h6>
        {emailContacts.length > 0 && (
          <div className="mb-3">
            {emailContacts.map((contact, idx) => {
              const actualIndex = contacts.findIndex(c => c._id === contact._id);
              return (
                <Card key={contact._id} className="mb-2 border-left-info">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <strong className="text-break">{contact.value}</strong>
                          <Badge bg="secondary" className="small">{contact.label}</Badge>
                          {contact.isPrimary && <FaStar className="text-warning" size={14} title="Primary" />}
                        </div>
                        {contact.name && (
                          <div className="small text-muted mb-1">
                            <strong>Name:</strong> {contact.name}
                          </div>
                        )}
                        {contact.designation && (
                          <div className="small text-muted">
                            <strong>Designation:</strong> {contact.designation}
                          </div>
                        )}
                      </div>
                      <div className="d-flex gap-2">
                        {!contact.isPrimary && (
                          <Button
                            size="sm"
                            variant="outline-warning"
                            onClick={() => handleSetPrimary(actualIndex)}
                            title="Set as primary"
                          >
                            <FaStar size={12} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleRemoveContact(actualIndex)}
                          title="Remove"
                        >
                          <FaTrash size={12} />
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Contact Form */}
      {showAddContact ? (
        <Card className="mb-3 bg-light">
          <Card.Body>
            <h6 className="mb-3">Add New Contact</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small">Contact Person Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., John Doe"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    size="sm"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small">Designation</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Manager, Director"
                    value={newContact.designation}
                    onChange={(e) => setNewContact({ ...newContact, designation: e.target.value })}
                    size="sm"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small">Type</Form.Label>
                  <Form.Select
                    value={newContact.type}
                    onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                    size="sm"
                  >
                    <option value="Phone">Phone</option>
                    <option value="Email">Email</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small">Label</Form.Label>
                  <Form.Select
                    value={newContact.label}
                    onChange={(e) => setNewContact({ ...newContact, label: e.target.value })}
                    size="sm"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Office">Office</option>
                    <option value="Personal">Personal</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="small">{newContact.type === "Email" ? "Email Address" : "Phone Number"} *</Form.Label>
              <Form.Control
                type={newContact.type === "Email" ? "email" : "tel"}
                placeholder={newContact.type === "Email" ? "email@example.com" : "+1234567890"}
                value={newContact.value}
                onChange={(e) => setNewContact({ ...newContact, value: e.target.value })}
                size="sm"
              />
            </Form.Group>

            <div className="d-flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleAddContact}
              >
                <FaPlus className="me-1" /> Add Contact
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowAddContact(false)}
              >
                Cancel
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => setShowAddContact(true)}
          className="w-100"
        >
          <FaPlus className="me-2" /> Add Another Contact
        </Button>
      )}
    </div>
  );
};

export default MultipleContactsForm;
