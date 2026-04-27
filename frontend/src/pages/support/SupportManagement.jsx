import { useState, useEffect } from "react";
import {
  Container, Card, Row, Col, Button, Form, Spinner, Alert, Badge, Modal,
} from "react-bootstrap";
import {
  FaHeadset, FaSave, FaPlus, FaTrash, FaEdit, FaTimes,
  FaEnvelope, FaPhone, FaUser,
  FaCalendarAlt, FaFileAlt, FaSignOutAlt,
  FaBuilding, FaExclamationCircle, FaStar,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { supportApi } from "../../api/supportApi";
import { importantPersonApi } from "../../api/importantPersonApi";

const SECTIONS = [
  { key: "hr_admin",   label: "HR & Administrative Support", color: "#4F46E5", light: "#EEF2FF" },
  { key: "operations", label: "Operations & Grievance",       color: "#0891B2", light: "#ECFEFF" },
];

const CATEGORY_ICONS = {
  leave_wfh_attendance: <FaCalendarAlt />,
  official_documents:   <FaFileAlt />,
  resignation_exit:     <FaSignOutAlt />,
  general_office:       <FaBuilding />,
  complaints_issues:    <FaExclamationCircle />,
};

const CategoryCard = ({ cat, color, light, onSave, onDelete }) => {
  const icon = CATEGORY_ICONS[cat.category] || <FaHeadset />;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    emails: { main: cat.emails?.main || "", cc1: cat.emails?.cc1 || "", cc2: cat.emails?.cc2 || "", bcc: cat.emails?.bcc || "" },
    phones: (cat.phones || []).map(p => ({ ...p })),
  });

  const addPhone = () => setForm(f => ({ ...f, phones: [...f.phones, { name: "", role: "", phone: "" }] }));
  const removePhone = (i) => setForm(f => ({ ...f, phones: f.phones.filter((_, idx) => idx !== i) }));
  const updatePhone = (i, field, val) => setForm(f => ({ ...f, phones: f.phones.map((p, idx) => idx === i ? { ...p, [field]: val } : p) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await supportApi.updateCategory(cat.category, form);
      toast.success(`"${cat.label}" saved`);
      setEditing(false);
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const hasEmails = form.emails.main || form.emails.cc1 || form.emails.cc2 || form.emails.bcc;
  const hasPhones = form.phones.length > 0;

  return (
    <Card className="border-0 shadow-sm h-100" style={{ borderRadius: "16px", borderLeft: `4px solid ${color}` }}>
      <Card.Body className="p-4">
        {/* Header */}
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{ width: 42, height: 42, background: light, color, fontSize: "1.1rem" }}>
              {icon}
            </div>
            <div>
              <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: "0.95rem" }}>{cat.label}</h6>
              {cat.description && <small className="text-muted">{cat.description}</small>}
              <div className="mt-1 d-flex gap-1 flex-wrap">
                {cat.isDefault
                  ? <Badge bg="secondary" style={{ fontSize: "0.6rem" }}>Default</Badge>
                  : <Badge bg="info" style={{ fontSize: "0.6rem" }}>Custom</Badge>}
                {hasEmails && <Badge bg="success" style={{ fontSize: "0.6rem" }}>Emails set</Badge>}
                {hasPhones && <Badge bg="primary" style={{ fontSize: "0.6rem" }}>{form.phones.length} phone(s)</Badge>}
              </div>
            </div>
          </div>
          <div className="d-flex gap-1 flex-shrink-0">
            <Button size="sm" variant={editing ? "outline-secondary" : "outline-primary"}
              onClick={() => setEditing(e => !e)} style={{ borderRadius: "8px", padding: "4px 10px" }}>
              {editing ? <FaTimes size={11} /> : <FaEdit size={11} />}
            </Button>
            {!cat.isDefault && (
              <Button size="sm" variant="outline-danger" onClick={() => onDelete(cat)}
                style={{ borderRadius: "8px", padding: "4px 10px" }}>
                <FaTrash size={11} />
              </Button>
            )}
          </div>
        </div>

        <hr className="my-2" style={{ borderColor: `${color}20` }} />

        {/* View mode */}
        {!editing && (
          <>
            {!hasEmails && !hasPhones ? (
              <p className="text-muted small mb-0 fst-italic text-center py-2">No contact info yet — click edit to add</p>
            ) : (
              <>
                {hasEmails && (
                  <div className="mb-3">
                    {[["To", form.emails.main], ["CC", form.emails.cc1], ["CC", form.emails.cc2], ["BCC", form.emails.bcc]]
                      .filter(([, v]) => v)
                      .map(([label, value], i) => (
                        <div key={i} className="d-flex align-items-center mb-2">
                          <span className="fw-bold me-2 text-uppercase" style={{ minWidth: 32, fontSize: "0.68rem", color, letterSpacing: "0.5px" }}>{label}:</span>
                          <a href={`mailto:${value}`} className="text-decoration-none fw-semibold" style={{ fontSize: "0.83rem", color }}>
                            <FaEnvelope size={11} className="me-1" />{value}
                          </a>
                        </div>
                      ))}
                  </div>
                )}
                {hasPhones && (
                  <div className="d-flex flex-column gap-2">
                    {form.phones.map((p, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ background: light }}>
                        <div className="d-flex align-items-center justify-content-center rounded-circle bg-white flex-shrink-0" style={{ width: 28, height: 28 }}>
                          <FaUser size={10} style={{ color }} />
                        </div>
                        <div className="flex-grow-1 min-width-0">
                          <div className="fw-semibold text-dark" style={{ fontSize: "0.82rem" }}>{p.name}</div>
                          {p.role && <div className="text-muted" style={{ fontSize: "0.72rem" }}>{p.role}</div>}
                        </div>
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="text-decoration-none fw-semibold flex-shrink-0" style={{ fontSize: "0.8rem", color }}>
                            <FaPhone size={10} className="me-1" />{p.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Edit mode */}
        {editing && (
          <div className="mt-2">
            <p className="fw-semibold text-muted mb-2" style={{ fontSize: "0.75rem" }}>
              <FaEnvelope className="me-1" />EMAIL SET
            </p>
            {[{ key: "main", label: "Main (To)" }, { key: "cc1", label: "CC 1" }, { key: "cc2", label: "CC 2" }, { key: "bcc", label: "BCC" }]
              .map(({ key, label }) => (
                <Form.Group className="mb-2" key={key}>
                  <Form.Label className="small text-muted mb-1" style={{ fontSize: "0.72rem" }}>{label}</Form.Label>
                  <Form.Control type="email" size="sm" placeholder="email@company.com"
                    value={form.emails[key]}
                    onChange={e => setForm(f => ({ ...f, emails: { ...f.emails, [key]: e.target.value } }))}
                    style={{ borderRadius: "8px", fontSize: "0.82rem" }} />
                </Form.Group>
              ))}

            <div className="d-flex align-items-center justify-content-between mt-3 mb-2">
              <p className="fw-semibold text-muted mb-0" style={{ fontSize: "0.75rem" }}>
                <FaPhone className="me-1" />PHONE CONTACTS
              </p>
              <Button size="sm" variant="outline-primary" onClick={addPhone}
                style={{ borderRadius: "6px", padding: "2px 8px", fontSize: "0.75rem" }}>
                <FaPlus size={9} className="me-1" />Add
              </Button>
            </div>
            {form.phones.length === 0 ? (
              <p className="text-muted small fst-italic mb-2">No phone contacts yet.</p>
            ) : (
              form.phones.map((p, i) => (
                <div key={i} className="d-flex gap-1 mb-2 align-items-center p-2 rounded-3" style={{ background: light }}>
                  <Form.Control size="sm" placeholder="Name" value={p.name} onChange={e => updatePhone(i, "name", e.target.value)} style={{ borderRadius: "6px", fontSize: "0.78rem" }} />
                  <Form.Control size="sm" placeholder="Role" value={p.role} onChange={e => updatePhone(i, "role", e.target.value)} style={{ borderRadius: "6px", fontSize: "0.78rem" }} />
                  <Form.Control size="sm" placeholder="Phone" value={p.phone} onChange={e => updatePhone(i, "phone", e.target.value)} style={{ borderRadius: "6px", fontSize: "0.78rem" }} />
                  <Button size="sm" variant="outline-danger" onClick={() => removePhone(i)} style={{ padding: "3px 7px", borderRadius: "6px", flexShrink: 0 }}>
                    <FaTrash size={9} />
                  </Button>
                </div>
              ))
            )}

            <div className="d-flex gap-2 justify-content-end mt-3">
              <Button size="sm" variant="outline-secondary" onClick={() => setEditing(false)} style={{ borderRadius: "8px" }}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={handleSave} disabled={saving} style={{ borderRadius: "8px" }}>
                {saving ? <Spinner size="sm" className="me-1" /> : <FaSave size={11} className="me-1" />}Save
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

const SupportManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Important persons state
  const [persons, setPersons] = useState([]);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [personForm, setPersonForm] = useState({ name: "", role: "", phone: "", order: 99 });
  const [personError, setPersonError] = useState("");
  const [savingPerson, setSavingPerson] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSection, setNewSection] = useState("hr_admin");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await supportApi.getAllCategories();
      setCategories(res.data || []);
    } catch {
      setError("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPersons = async () => {
    try {
      const res = await importantPersonApi.getAllPersons();
      setPersons(res.data || []);
    } catch {
      // non-critical
    }
  };

  useEffect(() => { fetchCategories(); fetchPersons(); }, []); // eslint-disable-line

  const openAddModal = () => { setNewLabel(""); setNewDesc(""); setNewSection("hr_admin"); setAddError(""); setShowAddModal(true); };

  const handleAddCategory = async () => {
    if (!newLabel.trim()) { setAddError("Category name is required."); return; }
    setAdding(true); setAddError("");
    try {
      await supportApi.createCategory({ label: newLabel.trim(), description: newDesc.trim(), section: newSection });
      toast.success(`"${newLabel}" created`);
      setShowAddModal(false);
      fetchCategories();
    } catch (err) {
      setAddError(err.response?.data?.message || "Failed to create");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supportApi.deleteCategory(deleteTarget.category);
      toast.success(`"${deleteTarget.label}" deleted`);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const getSection = (key) => categories.filter(c => c.section === key);

  const openAddPerson = () => {
    setEditingPerson(null);
    setPersonForm({ name: "", role: "", phone: "", order: 99 });
    setPersonError("");
    setShowPersonModal(true);
  };

  const openEditPerson = (p) => {
    setEditingPerson(p);
    setPersonForm({ name: p.name, role: p.role || "", phone: p.phone || "", order: p.order || 99 });
    setPersonError("");
    setShowPersonModal(true);
  };

  const handleSavePerson = async () => {
    if (!personForm.name.trim()) { setPersonError("Name is required."); return; }
    setSavingPerson(true); setPersonError("");
    try {
      if (editingPerson) {
        await importantPersonApi.updatePerson(editingPerson._id, personForm);
        toast.success("Person updated");
      } else {
        await importantPersonApi.createPerson(personForm);
        toast.success("Person added");
      }
      setShowPersonModal(false);
      fetchPersons();
    } catch (err) {
      setPersonError(err.response?.data?.message || "Failed to save");
    } finally {
      setSavingPerson(false);
    }
  };

  const handleDeletePerson = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await importantPersonApi.deletePerson(p._id);
      toast.success("Person deleted");
      fetchPersons();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <Container fluid className="py-4" style={{ background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", minHeight: "100vh" }}>

      {/* Header */}
      <Card className="border-0 shadow-lg mb-4" style={{ borderRadius: "20px" }}>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <div className="p-3 rounded-circle me-3" style={{ background: "linear-gradient(135deg, #4F46E5, #EC4899)" }}>
                <FaHeadset size={24} className="text-white" />
              </div>
              <div>
                <h4 className="mb-0 fw-bold text-dark">Support Contacts Management</h4>
                <p className="mb-0 text-muted small">Click the edit icon on any category to update its contacts</p>
              </div>
            </div>
            <Button variant="primary" onClick={openAddModal} style={{ borderRadius: "12px" }}>
              <FaPlus className="me-2" />Add Category
            </Button>
          </div>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : (
        SECTIONS.map(section => {
          const cats = getSection(section.key);
          return (
            <div key={section.key} className="mb-4">
              {/* Section label */}
              <div className="d-flex align-items-center mb-3">
                <div className="px-3 py-1 rounded-pill text-white fw-semibold me-3"
                  style={{ background: section.color, fontSize: "0.82rem" }}>
                  {section.label}
                </div>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${section.color}40, transparent)` }} />
                <Badge bg="secondary" className="ms-3">{cats.length}</Badge>
              </div>

              {cats.length === 0 ? (
                <Card className="border-0 shadow-sm text-center py-4" style={{ borderRadius: "16px" }}>
                  <Card.Body>
                    <p className="text-muted mb-0 small">No categories in this section yet.</p>
                  </Card.Body>
                </Card>
              ) : (
                <Row className="g-3">
                  {cats.map(cat => (
                    <Col key={cat._id} lg={4} md={6}>
                      <CategoryCard cat={cat} color={section.color} light={section.light}
                        onSave={fetchCategories} onDelete={setDeleteTarget} />
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          );
        })
      )}

      {/* Important Persons section */}
      <div className="mb-4">
        <div className="d-flex align-items-center mb-3">
          <div className="px-3 py-1 rounded-pill text-white fw-semibold me-3"
            style={{ background: "#D97706", fontSize: "0.82rem" }}>
            <FaStar size={11} className="me-1" />Important Persons
          </div>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #D9770640, transparent)" }} />
          <Button size="sm" variant="outline-warning" className="ms-3" onClick={openAddPerson}
            style={{ borderRadius: "8px" }}>
            <FaPlus size={10} className="me-1" />Add Person
          </Button>
        </div>

        {persons.length === 0 ? (
          <Card className="border-0 shadow-sm text-center py-4" style={{ borderRadius: "16px" }}>
            <Card.Body>
              <p className="text-muted mb-0 small">No important persons added yet.</p>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-3">
            {persons.map(p => (
              <Col key={p._id} lg={3} md={4} sm={6}>
                <Card className="border-0 shadow-sm h-100" style={{ borderRadius: "16px", borderLeft: "4px solid #D97706" }}>
                  <Card.Body className="p-3 d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{ width: 42, height: 42, background: "#FFFBEB", color: "#D97706", fontSize: "1.1rem" }}>
                      <FaUser />
                    </div>
                    <div className="flex-grow-1 min-width-0">
                      <div className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>{p.name}</div>
                      {p.role && <div className="text-muted" style={{ fontSize: "0.75rem" }}>{p.role}</div>}
                      {p.phone && (
                        <div className="fw-semibold" style={{ fontSize: "0.82rem", color: "#D97706" }}>
                          <FaPhone size={10} className="me-1" />{p.phone}
                        </div>
                      )}
                    </div>
                    <div className="d-flex flex-column gap-1 flex-shrink-0">
                      <Button size="sm" variant="outline-primary" onClick={() => openEditPerson(p)}
                        style={{ padding: "3px 7px", borderRadius: "6px" }}>
                        <FaEdit size={10} />
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => handleDeletePerson(p)}
                        style={{ padding: "3px 7px", borderRadius: "6px" }}>
                        <FaTrash size={10} />
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Add/Edit Person Modal */}
      <Modal show={showPersonModal} onHide={() => setShowPersonModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingPerson ? "Edit Person" : "Add Important Person"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {personError && <Alert variant="danger" className="small py-2">{personError}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Name <span className="text-danger">*</span></Form.Label>
            <Form.Control placeholder="e.g. Amit Santra" value={personForm.name}
              onChange={e => { setPersonForm(f => ({ ...f, name: e.target.value })); if (personError) setPersonError(""); }}
              autoFocus style={{ borderRadius: "10px" }} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Role / Title</Form.Label>
            <Form.Control placeholder="e.g. CEO" value={personForm.role}
              onChange={e => setPersonForm(f => ({ ...f, role: e.target.value }))} style={{ borderRadius: "10px" }} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Phone Number</Form.Label>
            <Form.Control placeholder="+91 98765 43210" value={personForm.phone}
              onChange={e => setPersonForm(f => ({ ...f, phone: e.target.value }))} style={{ borderRadius: "10px" }} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPersonModal(false)} disabled={savingPerson} style={{ borderRadius: "10px" }}>Cancel</Button>
          <Button variant="warning" onClick={handleSavePerson} disabled={savingPerson} style={{ borderRadius: "10px" }}>
            {savingPerson ? <Spinner size="sm" className="me-1" /> : <FaSave className="me-1" />}
            {editingPerson ? "Save Changes" : "Add Person"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Category Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Add New Category</Modal.Title></Modal.Header>
        <Modal.Body>
          {addError && <Alert variant="danger" className="small py-2">{addError}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Category Name <span className="text-danger">*</span></Form.Label>
            <Form.Control placeholder="e.g. IT Support" value={newLabel}
              onChange={e => { setNewLabel(e.target.value); if (addError) setAddError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAddCategory()} autoFocus style={{ borderRadius: "10px" }} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Section</Form.Label>
            <Form.Select value={newSection} onChange={e => setNewSection(e.target.value)} style={{ borderRadius: "10px" }}>
              {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label className="fw-semibold small">Description <span className="text-muted">(optional)</span></Form.Label>
            <Form.Control as="textarea" rows={2} placeholder="What kind of issues does this cover?"
              value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ borderRadius: "10px" }} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={adding} style={{ borderRadius: "10px" }}>Cancel</Button>
          <Button variant="primary" onClick={handleAddCategory} disabled={adding} style={{ borderRadius: "10px" }}>
            {adding ? <Spinner size="sm" className="me-1" /> : <FaPlus className="me-1" />}Create
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal show={!!deleteTarget} onHide={() => setDeleteTarget(null)} centered size="sm">
        <Modal.Header closeButton><Modal.Title>Delete Category</Modal.Title></Modal.Header>
        <Modal.Body>Delete <strong>"{deleteTarget?.label}"</strong>? This cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting} style={{ borderRadius: "10px" }}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteCategory} disabled={deleting} style={{ borderRadius: "10px" }}>
            {deleting ? <Spinner size="sm" className="me-1" /> : <FaTrash className="me-1" />}Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SupportManagement;
