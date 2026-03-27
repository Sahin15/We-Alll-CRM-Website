import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Spinner, Badge } from "react-bootstrap";
import { FaDatabase, FaPhone, FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import { rawDataApi } from "../../api/rawDataApi";

const StatCard = ({ icon, label, value, variant = "primary" }) => (
  <Card className="border-0 shadow-sm h-100">
    <Card.Body className="d-flex align-items-center gap-3">
      <div className={`p-3 rounded-3 bg-${variant} bg-opacity-10 text-${variant}`} style={{ fontSize: 22 }}>
        {icon}
      </div>
      <div>
        <div className="small text-muted">{label}</div>
        <div className="fs-4 fw-bold">{value ?? "—"}</div>
      </div>
    </Card.Body>
  </Card>
);

export default function RawDataDashboard() {
  const [summary, setSummary] = useState(null);
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, src, cat] = await Promise.all([
          rawDataApi.getDashboardSummary(),
          rawDataApi.getSourceAnalysis(),
          rawDataApi.getCategoryAnalysis(),
        ]);
        setSummary(s.data);
        setSources(src.data.sources || []);
        setCategories(cat.data.categories || []);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  const conversionRate = summary?.total > 0
    ? ((summary.converted / summary.total) * 100).toFixed(1)
    : 0;

  return (
    <Container fluid className="py-3">
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="mb-0 fw-bold">Raw Data Dashboard</h4>
          <small className="text-muted">Overview of your contact pool and calling performance</small>
        </Col>
      </Row>

      {/* Summary cards */}
      <Row className="g-3 mb-4">
        <Col md={4} lg={2}>
          <StatCard icon={<FaDatabase />} label="Total Records" value={summary?.total} variant="primary" />
        </Col>
        <Col md={4} lg={2}>
          <StatCard icon={<FaPhone />} label="Called Today" value={summary?.calledToday} variant="info" />
        </Col>
        <Col md={4} lg={2}>
          <StatCard icon={<FaClock />} label="Pending" value={summary?.pending} variant="warning" />
        </Col>
        <Col md={4} lg={2}>
          <StatCard icon={<FaCheckCircle />} label="Converted" value={summary?.converted} variant="success" />
        </Col>
        <Col md={4} lg={2}>
          <StatCard icon={<FaTimesCircle />} label="No Response" value={summary?.noResponse} variant="dark" />
        </Col>
        <Col md={4} lg={2}>
          <StatCard icon={<FaExclamationTriangle />} label="Conversion Rate" value={`${conversionRate}%`} variant="success" />
        </Col>
      </Row>

      {/* Conversion funnel */}
      <Row className="g-3 mb-4">
        <Col md={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-medium">Conversion Funnel</Card.Header>
            <Card.Body>
              {summary && (
                <div className="d-flex flex-wrap gap-3 align-items-center justify-content-center">
                  {[
                    { label: "Total", value: summary.total, color: "primary" },
                    { label: "Pending", value: summary.pending, color: "warning" },
                    { label: "Called Today", value: summary.calledToday, color: "info" },
                    { label: "No Response", value: summary.noResponse, color: "secondary" },
                    { label: "Converted", value: summary.converted, color: "success" },
                  ].map((step, i) => (
                    <div key={step.label} className="d-flex align-items-center gap-2">
                      <div className="text-center">
                        <div className={`fs-3 fw-bold text-${step.color}`}>{step.value}</div>
                        <div className="small text-muted">{step.label}</div>
                      </div>
                      {i < 4 && <span className="text-muted fs-5">→</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        {/* Source breakdown */}
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white fw-medium">By Source</Card.Header>
            <Card.Body className="p-0">
              {sources.length === 0 ? (
                <p className="text-muted small p-3">No data yet</p>
              ) : (
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Source</th>
                      <th className="text-end">Total</th>
                      <th className="text-end">Converted</th>
                      <th className="text-end">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources
                      .sort((a, b) => b.total - a.total)
                      .map(s => (
                        <tr key={s.source || "unknown"}>
                          <td>{s.source || <span className="text-muted">Unknown</span>}</td>
                          <td className="text-end">{s.total}</td>
                          <td className="text-end text-success">{s.converted}</td>
                          <td className="text-end">
                            <Badge bg={s.conversionRate >= 10 ? "success" : "secondary"} className="small">
                              {s.conversionRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Category breakdown */}
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white fw-medium">By Category</Card.Header>
            <Card.Body className="p-0">
              {categories.length === 0 ? (
                <p className="text-muted small p-3">No data yet</p>
              ) : (
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Category</th>
                      <th className="text-end">Total</th>
                      <th className="text-end">Converted</th>
                      <th className="text-end">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories
                      .sort((a, b) => b.total - a.total)
                      .map(c => (
                        <tr key={c.category || "unknown"}>
                          <td>{c.category || <span className="text-muted">Unknown</span>}</td>
                          <td className="text-end">{c.total}</td>
                          <td className="text-end text-success">{c.converted}</td>
                          <td className="text-end">
                            <Badge bg={c.conversionRate >= 10 ? "success" : "secondary"} className="small">
                              {c.conversionRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
