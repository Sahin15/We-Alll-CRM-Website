import { useState } from "react";
import { Modal, Form, Button, Row, Col, Alert, ProgressBar, Table } from "react-bootstrap";
import { toast } from "react-toastify";
import { rawDataApi } from "../../api/rawDataApi";

const CATEGORIES = ["Makeup Artist", "Salon", "Bridal Clients", "Tattoo Artists", "Nail Art", "Other"];
const SOURCES = ["Instagram", "Facebook", "Referral", "Manual", "Website", "Justdial", "Event", "Existing Contact", "Other"];

function parseCsv(text) {
  // Normalize line endings
  const normalized = text.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Auto-detect delimiter: tab (Excel/Sheets copy-paste) or comma (CSV file)
  const firstLine = normalized.split("\n")[0];
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  // For tab-delimited (Excel/Sheets paste), split simply by lines
  // For CSV, we need to handle quoted fields that may contain newlines
  let lines = [];
  if (delimiter === "\t") {
    lines = normalized.split("\n").filter(Boolean);
  } else {
    // Reassemble lines respecting quoted fields that span multiple lines
    const rawLines = normalized.split("\n");
    let current = "";
    let inQuotes = false;
    for (const line of rawLines) {
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
      }
      current += (current ? "\n" : "") + line;
      if (!inQuotes) {
        if (current.trim()) lines.push(current);
        current = "";
      }
    }
    if (current.trim()) lines.push(current);
  }

  if (lines.length < 2) return [];

  // Parse a single line respecting quoted fields
  const parseLine = (line) => {
    if (delimiter === "\t") {
      return line.split("\t").map(v => v.trim().replace(/^"|"$/g, ""));
    }
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Normalize header names — handle "sources" → "source", "requirements" → "requirement" etc.
  const normalizeHeader = (h) => {
    const cleaned = h.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    // Map common variations
    const map = {
      sources: "source",
      requirements: "requirement",
      full_name: "name",
      phone_number: "phone",
      mobile: "phone",
      whatsapp_number: "whatsapp",
      city: "location",
      ref: "reference",
      notes: "remarks",
    };
    return map[cleaned] || cleaned;
  };

  const headers = parseLine(lines[0]).map(normalizeHeader);

  return lines.slice(1).map(line => {
    const vals = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/\n/g, " ").trim(); });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== ""));
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
        source: r.source || r.sources || defaultSource,
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
            <Alert variant="info" className="small mb-3 py-2">
              <strong>How to paste data:</strong>
              <ul className="mb-0 mt-1 ps-3">
                <li><strong>From Excel / Google Sheets:</strong> Select your cells and press <kbd>Ctrl+C</kbd>, then paste below</li>
                <li><strong>From a CSV file:</strong> Open the file, select all (<kbd>Ctrl+A</kbd>), copy and paste below</li>
                <li>First row must be column headers</li>
                <li>Supported columns: <code>name, phone, whatsapp, location, category, source, reference, requirement, remarks</code></li>
              </ul>
            </Alert>
            <Form.Control
              as="textarea"
              rows={10}
              placeholder={"name\tphone\tlocation\tcategory\tsource\nJohn Doe\t9876543210\tKolkata\tMakeup Artist\tInstagram"}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              className="font-monospace small"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <Alert variant="info" className="small">
              Found <strong>{parsed.length}</strong> rows — <strong className="text-success">{parsed.filter(r => (r.name || r.full_name) && (r.phone || r.mobile || r.phone_number)).length} valid</strong> (have name + phone), <strong className="text-warning">{parsed.filter(r => !(r.name || r.full_name) || !(r.phone || r.mobile || r.phone_number)).length} will be skipped</strong> (missing name or phone).
            </Alert>
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
            {result.skipped > 0 && (
              <Alert variant="warning" className="small mt-3 text-start">
                <strong>{result.skipped} records were skipped</strong> — these phone numbers already exist in the system. 
                To update existing records, go back and change <strong>Duplicate Strategy</strong> to <strong>"Merge with existing"</strong>.
              </Alert>
            )}
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
