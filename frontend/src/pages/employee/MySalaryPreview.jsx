import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Alert
} from "react-bootstrap";
import { FaEye, FaCalendarAlt } from "react-icons/fa";
import SalaryPreview from "../../components/salary/SalaryPreview";
import { getCompanyYearOptions } from "../../constants/branding";

const MySalaryPreview = () => {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    const now = new Date();
    const prevMonth = now.getMonth();
    const prevYear = prevMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
    setSelectedMonth(prevMonth === 0 ? 12 : prevMonth);
    setSelectedYear(prevYear);
  }, []);

  const generateMonthOptions = () => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    return months.map((month, index) => (
      <option key={index + 1} value={index + 1}>
        {month}
      </option>
    ));
  };

  const generateYearOptions = () =>
    getCompanyYearOptions().map((year) => (
      <option key={year} value={year}>
        {year}
      </option>
    ));

  return (
    <Container fluid className="mt-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2>
            <FaEye className="me-2" />
            My Salary Preview
          </h2>
          <p className="text-muted">
            Review your salary calculation before it's finalized. You can raise queries if you have any concerns.
          </p>
        </Col>
      </Row>

      {/* Month/Year Selection */}
      <Row className="mb-4">
        <Col md={6} lg={4}>
          <Card className="shadow-sm">
            <Card.Header>
              <h6 className="mb-0">
                <FaCalendarAlt className="me-2" />
                Select Month & Year
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Month</Form.Label>
                    <Form.Select
                      value={selectedMonth ?? ""}
                      onChange={(e) =>
                        setSelectedMonth(Number(e.target.value) || null)
                      }
                    >
                      <option value="">Select Month</option>
                      {generateMonthOptions()}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Year</Form.Label>
                    <Form.Select
                      value={selectedYear ?? ""}
                      onChange={(e) =>
                        setSelectedYear(Number(e.target.value) || null)
                      }
                    >
                      <option value="">Select Year</option>
                      {generateYearOptions()}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <p className="small text-muted mb-0">
                Preview updates automatically when you change month or year.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Information Alert */}
      <Row className="mb-4">
        <Col>
          <Alert variant="info">
            <Alert.Heading>About Salary Previews</Alert.Heading>
            <p className="mb-2">
              <strong>What is a salary preview?</strong> It's a detailed breakdown of your salary calculation 
              before it's finalized, showing working days, leave impact, and all earnings/deductions.
            </p>
            <p className="mb-0">
              <strong>Queries:</strong> If you have concerns about the calculation, you can raise queries
              anytime before your salary is credited, and HR will respond.
            </p>
          </Alert>
        </Col>
      </Row>

      {/* Salary Preview */}
      {selectedMonth && selectedYear ? (
        <Row>
          <Col>
            <SalaryPreview
              key={`${selectedYear}-${selectedMonth}`}
              month={selectedMonth}
              year={selectedYear}
            />
          </Col>
        </Row>
      ) : null}
    </Container>
  );
};

export default MySalaryPreview;