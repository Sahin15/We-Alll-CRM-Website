import { useState } from "react";
import { Modal, Form, Button, Row, Col, Alert, ProgressBar, Table } from "react-bootstrap";
import { toast } from "react-toastify";
import { rawDataApi } from "../../api/rawDataApi";

const CATEGORIES = ["Makeup Artist", "Salon", "Bridal Clients", "Tattoo Artists", "Nail Art", "Other"];
const SOURCES = ["Instagram", "Facebook", "Referral", "Manual", "Website", "Justdial", "Event", "Existing Contact", "Other"];

function parseCsv(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
}

export default function BatchImportModal({ show, onHide, onImported }) {
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState([]);
  const [dupStrategy, setDupStrategy] = useState("skip");
  const [defaultCategory, setDefaultCategory] = useState("Other");
  const [defaultSource, setDefaultSource] = useState("Manual");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleParse = () => {
    const rows = parseCsv(rawText);
    if (!rows.length) return toast.error("No valid rows found. Ensure first row is headers.");
    setParsed(rows);
    setStep(2);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const records = parsed.map(r => ({
        name: r.name || r.full_name || "",
        phone: r.phone || r.phone_number || r.mobile || "",
        whatsapp: r.whatsapp || r.whatsapp_number || "",
        location: r.location || r.city || "",
        category: r.category || defaultCategory,
        source: r.source || defaultSource,
        reference: r.reference || r.ref || "",
        requirement: r.requirement || r.requirements || "",
        remarks: r.remarks || r.notes || "",
      })).filter(r => r.name && r.phone);

      const res = await rawDataApi.batchImport({ records, duplicateStrategy: dupStrategy });
      setResult(res.data.summary);
      setStep(3);
      toast.success(`Imported ${res.data.summary.imported} records`);
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setStep(1); setRawText(""); setParsed([]); setResult(null); };

  return (
    <Modal show={show} onHide={() => { reset(); onHide(); }} size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6">Bulk Import Raw Data</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Step indicator */}
        <div className="d-flex gap-2 mb-4 small">
          {["Paste Data", "Preview & Configure", "Done"].map((s, i) => (
            <span key={i} className={`px-2 py-1 rounded ${step === i + 1 ? "bg-primary text-white" : "bg-light text-muted"}`}>{i + 1}. {s}</span>
          ))}
        </div>

        {step === 1 && (
          <div>
            <p className="small text-muted">Paste CSV data below. First row must be headers. Supported columns: <code>name, phone, whatsapp, location, category, source, reference, requirement, remarks</code></p>
            <Form.Control as="textarea" rows={10} placeholder={"name,phone,location,category,source\nJohn Doe,9876543210,Kolkata,Makeup Artist,Instagram"} value={rawText} onChange={e => setRawText(e.target.value)} className="font-monospace small" />
          </div>
        )}

        {step === 2 && (
          <div>
            <Alert variant="info" className="small">Found <strong>{parsed.length}</strong> rows. Configure defaults for missing fields.</Alert>
            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Label className="small fw-medium">Default Category</Form.Label>
                <Form.Select size="sm" value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-medium">Default Source</Form.Label>
                <Form.Select size="sm" value={defaultSource} onChange={e => setDefaultSource(e.target.value)}>
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-medium">Duplicate Strategy</Form.Label>
                <Form.Select size="sm" value={dupStrategy} onChange={e => setDupStrategy(e.target.value)}>
                  <option value="skip">Skip duplicates</option>
                  <option value="merge">Merge with existing</option>
                  <option value="keep">Keep duplicates</option>
                </Form.Select>
              </Col>
            </Row>
            <div className="small text-muted mb-2">Preview (first 5 rows):</div>
            <div className="table-responsive">
              <Table size="sm" bordered className="small">
                <thead className="table-light">
                  <tr>{Object.keys(parsed[0] || {}).slice(0, 6).map(k => <th key={k}>{k}</th>)}</tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 5).map((r, i) => (
                    <tr key={i}>{Object.values(r).slice(0, 6).map((v, j) => <td key={j}>{v}</td>)}</tr>
                  ))}
                </tbody>
              </Table>
            </div>
            {importing && <ProgressBar animated now={100} className="mt-2" />}
          </div>
        )}

        {step === 3 && result && (
          <div className="text-center py-3">
            <div className="fs-1 mb-2">✅</div>
            <h5>Import Complete</h5>
            <div className="d-flex justify-content-center gap-4 mt-3 small">
              <div><div className="fs-4 fw-bold text-success">{result.imported}</div><div className="text-muted">Imported</div></div>
              <div><div className="fs-4 fw-bold text-warning">{result.skipped}</div><div className="text-muted">Skipped</div></div>
              <div><div className="fs-4 fw-bold text-danger">{result.failed}</div><div className="text-muted">Failed</div></div>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {step === 1 && <><Button variant="secondary" size="sm" onClick={onHide}>Cancel</Button><Button variant="primary" size="sm" onClick={handleParse} disabled={!rawText.trim()}>Next →</Button></>}
        {step === 2 && <><Button variant="secondary" size="sm" onClick={() => setStep(1)}>← Back</Button><Button variant="success" size="sm" onClick={handleImport} disabled={importing}>Import {parsed.length} Records</Button></>}
        {step === 3 && <><Button variant="primary" size="sm" onClick={() => { reset(); onImported(); }}>Done</Button></>}
      </Modal.Footer>
    </Modal>
  );
}
