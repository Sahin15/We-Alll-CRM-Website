import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import { toast } from "react-toastify";
import { payrollPeriodApi } from "../../api/payrollPeriodApi";
import { usePayrollPeriod } from "../../context/PayrollPeriodContext.jsx";

const formatPaymentDateBadge = (value) => {
  if (!value) return "Not set";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not set";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * Period salary payment date (shown on payslips after credit salary).
 *
 * @param {object} props
 * @param {number} props.month
 * @param {number} props.year
 * @param {boolean} [props.compact]
 * @param {(iso: string|null) => void} [props.onDateChange]
 */
const SalaryPaymentDateCard = ({ month, year, compact = false, onDateChange }) => {
  const payPeriodCtx = usePayrollPeriod();
  const [salaryPaymentDate, setSalaryPaymentDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!month || !year) return;
    setLoading(true);
    try {
      const res = await payrollPeriodApi.getPaymentDate(year, month);
      const iso = res.data?.data?.salaryPaymentDate || null;
      setSalaryPaymentDate(iso);
      onDateChange?.(iso);
      const label = iso ? formatPaymentDateBadge(iso) : null;
      payPeriodCtx?.setPaymentDateLabel?.(label);
    } catch {
      setSalaryPaymentDate(null);
      onDateChange?.(null);
      payPeriodCtx?.setPaymentDateLabel?.(null);
    } finally {
      setLoading(false);
    }
  }, [month, year, onDateChange, payPeriodCtx]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = () => {
    if (salaryPaymentDate) {
      const d = new Date(salaryPaymentDate);
      setDraft(d.toISOString().slice(0, 10));
    } else {
      const suggest = new Date(year, month, 10);
      if (suggest.getMonth() !== month) suggest.setDate(0);
      setDraft(suggest.toISOString().slice(0, 10));
    }
    setShowModal(true);
  };

  const save = async () => {
    if (!draft) {
      toast.error("Choose a payment date");
      return;
    }
    setSaving(true);
    try {
      await payrollPeriodApi.setPaymentDate(year, month, {
        salaryPaymentDate: new Date(draft).toISOString(),
      });
      toast.success("Salary payment date saved");
      setShowModal(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save payment date");
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="small text-muted">Payment date:</span>
          {loading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <Badge bg={salaryPaymentDate ? "primary" : "secondary"}>
              {formatPaymentDateBadge(salaryPaymentDate)}
            </Badge>
          )}
          <Button size="sm" variant="outline-primary" onClick={openEdit}>
            Edit
          </Button>
        </div>
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Salary payment date</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Control
              type="date"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={saving} onClick={save}>
              {saving ? <Spinner size="sm" /> : "Save"}
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Row className="g-2 align-items-center">
        <Col xs={12} md={8}>
          <span className="small text-muted mb-1 d-block">Salary payment date</span>
          <input hidden />
          <div className="d-flex flex-wrap align-items-center gap-2">
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <Badge bg={salaryPaymentDate ? "primary" : "secondary"}>
                {formatPaymentDateBadge(salaryPaymentDate)}
              </Badge>
            )}
            <Button size="sm" variant="outline-primary" onClick={openEdit}>
              Edit date
            </Button>
          </div>
          <p className="small text-muted mb-0 mt-1">
            Shown on payslips after you credit salary. Preview alone does not
            create a payslip.
          </p>
        </Col>
      </Row>
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Salary payment date — {month}/{year}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Date credited / paid</Form.Label>
            <Form.Control
              type="date"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving} onClick={save}>
            {saving ? <Spinner size="sm" /> : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default SalaryPaymentDateCard;
