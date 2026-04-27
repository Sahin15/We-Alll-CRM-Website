import { useState, useEffect } from "react";
import { Container, Card, Row, Col, Badge, Spinner, Alert } from "react-bootstrap";
import {
  FaHeadset, FaEnvelope, FaPhone, FaUser,
  FaCalendarAlt, FaFileAlt, FaSignOutAlt,
  FaBuilding, FaExclamationCircle, FaStar,
} from "react-icons/fa";
import { supportApi } from "../../api/supportApi";
import { importantPersonApi } from "../../api/importantPersonApi";

const SECTIONS = [
  { key: "hr_admin",   label: "HR & Administrative Support", color: "#4F46E5", light: "#EEF2FF" },
  { key: "operations", label: "Operations & Grievance",       color: "#0891B2", light: "#ECFEFF" },
];

const CATEGORY_META = {
  leave_wfh_attendance: { icon: <FaCalendarAlt /> },
  official_documents:   { icon: <FaFileAlt /> },
  resignation_exit:     { icon: <FaSignOutAlt /> },
  general_office:       { icon: <FaBuilding /> },
  complaints_issues:    { icon: <FaExclamationCircle /> },
};

const SupportPage = () => {
  const [categories, setCategories] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const catRes = await supportApi.getCategories();
        setCategories(catRes.data || []);
      } catch {
        setError("Failed to load support contacts.");
      }
      try {
        const personRes = await importantPersonApi.getPersons();
        setPersons(personRes.data || []);
      } catch {
        // non-critical, silently ignore
      }
      setLoading(false);
    };
    load();
  }, []);

  const getSection = (key) => categories.filter(c => c.section === key);

  return (
    <Container fluid className="py-4" style={{ background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", minHeight: "100vh" }}>

      {/* Page header */}
      <Card className="border-0 shadow-lg mb-4" style={{ borderRadius: "20px" }}>
        <Card.Body className="p-4">
          <div className="d-flex align-items-center">
            <div className="p-3 rounded-circle me-3" style={{ background: "linear-gradient(135deg, #4F46E5, #EC4899)" }}>
              <FaHeadset size={26} className="text-white" />
            </div>
            <div>
              <h2 className="mb-1 fw-bold text-dark">Support</h2>
              <p className="mb-0 text-muted">Find the right contact for your issue</p>
            </div>
          </div>
        </Card.Body>
      </Card>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading…</p>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && SECTIONS.map(section => {
        const cats = getSection(section.key);
        if (cats.length === 0) return null;

        return (
          <div key={section.key} className="mb-4">
            {/* Section header */}
            <div className="d-flex align-items-center mb-3">
              <div className="px-3 py-1 rounded-pill text-white fw-semibold me-3"
                style={{ background: section.color, fontSize: "0.82rem" }}>
                {section.label}
              </div>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${section.color}40, transparent)` }} />
            </div>

            <Row className="g-3">
              {cats.map(cat => {
                const meta = CATEGORY_META[cat.category] || { icon: <FaHeadset /> };
                const hasEmails = cat.emails?.main || cat.emails?.cc1 || cat.emails?.cc2 || cat.emails?.bcc;
                const hasPhones = cat.phones?.length > 0;

                return (
                  <Col key={cat._id} lg={4} md={6}>
                    <Card className="border-0 shadow-sm h-100"
                      style={{ borderRadius: "16px", borderLeft: `4px solid ${section.color}` }}>
                      <Card.Body className="p-4">
                        {/* Card header */}
                        <div className="d-flex align-items-center mb-3">
                          <div className="d-flex align-items-center justify-content-center rounded-circle me-3 flex-shrink-0"
                            style={{ width: 42, height: 42, background: section.light, color: section.color, fontSize: "1.1rem" }}>
                            {meta.icon}
                          </div>
                          <div>
                            <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: "0.95rem" }}>{cat.label}</h6>
                            {cat.description && <small className="text-muted">{cat.description}</small>}
                          </div>
                        </div>

                        <hr className="my-2" style={{ borderColor: `${section.color}20` }} />

                        {!hasEmails && !hasPhones ? (
                          <p className="text-muted small mb-0 fst-italic text-center py-2">
                            No contact information added yet
                          </p>
                        ) : (
                          <>
                            {hasEmails && (
                              <div className="mb-3">
                                {[["To", cat.emails?.main], ["CC", cat.emails?.cc1], ["CC", cat.emails?.cc2], ["BCC", cat.emails?.bcc]]
                                  .filter(([, v]) => v)
                                  .map(([label, value], i) => (
                                    <div key={i} className="d-flex align-items-center mb-2">
                                      <span className="fw-bold me-2 text-uppercase"
                                        style={{ minWidth: 32, fontSize: "0.68rem", color: section.color, letterSpacing: "0.5px" }}>
                                        {label}:
                                      </span>
                                      <a href={`mailto:${value}`} className="text-decoration-none fw-semibold"
                                        style={{ fontSize: "0.83rem", color: section.color }}>
                                        <FaEnvelope size={11} className="me-1" />{value}
                                      </a>
                                    </div>
                                  ))}
                              </div>
                            )}

                            {hasPhones && (
                              <div className="d-flex flex-column gap-2">
                                {cat.phones.map((p, i) => (
                                  <div key={i} className="d-flex align-items-center gap-2 p-2 rounded-3"
                                    style={{ background: section.light }}>
                                    <div className="d-flex align-items-center justify-content-center rounded-circle bg-white flex-shrink-0"
                                      style={{ width: 28, height: 28 }}>
                                      <FaUser size={10} style={{ color: section.color }} />
                                    </div>
                                    <div className="flex-grow-1 min-width-0">
                                      <div className="fw-semibold text-dark" style={{ fontSize: "0.82rem" }}>{p.name}</div>
                                      {p.role && <div className="text-muted" style={{ fontSize: "0.72rem" }}>{p.role}</div>}
                                    </div>
                                    {p.phone && (
                                      <a href={`tel:${p.phone}`} className="text-decoration-none fw-semibold flex-shrink-0"
                                        style={{ fontSize: "0.8rem", color: section.color }}>
                                        <FaPhone size={10} className="me-1" />{p.phone}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        );
      })}

      {/* Important Persons section */}
      {!loading && !error && persons.length > 0 && (
        <div className="mb-4">
          <div className="d-flex align-items-center mb-3">
            <div className="px-3 py-1 rounded-pill text-white fw-semibold me-3"
              style={{ background: "#D97706", fontSize: "0.82rem" }}>
              <FaStar size={11} className="me-1" />Important Persons
            </div>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #D9770640, transparent)" }} />
          </div>
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
                        <a href={`tel:${p.phone}`} className="text-decoration-none fw-semibold d-block mt-1"
                          style={{ fontSize: "0.82rem", color: "#D97706" }}>
                          <FaPhone size={10} className="me-1" />{p.phone}
                        </a>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

    </Container>
  );
};

export default SupportPage;
