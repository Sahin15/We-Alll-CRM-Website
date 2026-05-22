import { useState, useEffect } from "react";
import { Modal, Form, Button, Row, Col, Spinner, Alert } from "react-bootstrap";
import { FaEye, FaFilePdf } from "react-icons/fa";
import { toast } from "react-toastify";
import { hrDocumentApi } from "../../api/hrDocumentApi";

const GENERATABLE_SLUGS = {
  joining_letter: "joining_letter",
  employment_contract: "employment_contract",
  nda: "nda",
  policy_acknowledgment: "policy_acknowledgment",
  increment_letter: "increment_letter",
  bonus_letter: "bonus_letter",
  promotion_letter: "promotion_letter",
  experience_letter: "experience_letter",
  experience_certificate: "experience_certificate",
  relieving_letter: "relieving_letter",
};

export const isGeneratableDocType = (categoryKey) =>
  Object.prototype.hasOwnProperty.call(GENERATABLE_SLUGS, categoryKey);

const getSlugForCategory = (categoryKey) => GENERATABLE_SLUGS[categoryKey] || categoryKey;

const getApiErrorMessage = async (err, fallback) => {
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed.message || fallback;
    } catch {
      return fallback;
    }
  }
  return err.response?.data?.message || fallback;
};

const GenerateHrDocumentModal = ({
  show,
  onHide,
  userId,
  templateSlug,
  templateLabel,
  onGenerated,
}) => {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [onePerEmployee, setOnePerEmployee] = useState(false);

  useEffect(() => {
    if (!show || !templateSlug || !userId) return;

    const load = async () => {
      try {
        setLoading(true);
        const [detailRes, prefillRes] = await Promise.all([
          hrDocumentApi.getTemplate(templateSlug),
          hrDocumentApi.prefill(templateSlug, userId),
        ]);
        setFields(detailRes.data.fields || []);
        setValues(prefillRes.data.values || {});
        setOnePerEmployee(!!detailRes.data.onePerEmployee);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load form");
        onHide();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [show, templateSlug, userId, onHide]);

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handlePreview = async () => {
    try {
      setSubmitting(true);
      const res = await hrDocumentApi.preview(templateSlug, values);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank");
    } catch (err) {
      toast.error(await getApiErrorMessage(err, "Preview failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setSubmitting(true);
      await hrDocumentApi.generate(templateSlug, userId, values);
      toast.success(`${templateLabel || "Document"} generated and saved`);
      onGenerated?.();
      onHide();
    } catch (err) {
      toast.error(await getApiErrorMessage(err, "Failed to generate document"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Generate {templateLabel}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {onePerEmployee && (
          <Alert variant="warning" className="small py-2">
            Generating again will replace the existing document of this type for this employee.
          </Alert>
        )}
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" />
          </div>
        ) : (
          <Row className="g-3">
            {fields.map((field) => (
              <Col md={field.type === "textarea" ? 12 : 6} key={field.key}>
                <Form.Group>
                  <Form.Label>
                    {field.label}
                    {field.required && <span className="text-danger"> *</span>}
                  </Form.Label>
                  {field.type === "textarea" ? (
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={values[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                    />
                  ) : field.type === "date" ? (
                    <Form.Control
                      type="date"
                      value={values[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                    />
                  ) : (
                    <Form.Control
                      value={values[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                    />
                  )}
                </Form.Group>
              </Col>
            ))}
          </Row>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="outline-info" onClick={handlePreview} disabled={loading || submitting}>
          <FaEye className="me-1" />
          Preview
        </Button>
        <Button variant="primary" onClick={handleGenerate} disabled={loading || submitting}>
          {submitting ? <Spinner size="sm" /> : <><FaFilePdf className="me-1" />Generate & Save</>}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export { getSlugForCategory };
export default GenerateHrDocumentModal;
