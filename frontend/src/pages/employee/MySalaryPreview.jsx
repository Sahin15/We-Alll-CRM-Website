import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert
} from "react-bootstrap";
import { FaEye, FaCalendarAlt } from "react-icons/fa";
import SalaryPreview from "../../components/salary/SalaryPreview";

const MySalaryPreview = () => {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Set current month and year as default
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
    setShowPreview(true);
  }, []);

  const handleMonthYearChange = () => {
    if (selectedMonth && selectedYear) {
      setShowPreview(true);
    }
  };

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

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    // Show current year and previous 2 years
    for (let year = currentYear; year >= currentYear - 2; year--) {
      years.push(year);
    }
    
    return years.map(year => (
      <option key={year} value={year}>
        {year}
      </option>
    ));
  };

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
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
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
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <option value="">Select Year</option>
                      {generateYearOptions()}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Button 
                variant="primary" 
                onClick={handleMonthYearChange}
                disabled={!selectedMonth || !selectedYear}
                className="w-100"
              >
                View Preview
              </Button>
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
            <p className="mb-2">
              <strong>Review Period:</strong> You have 5 days from generation to review and raise any queries.
            </p>
            <p className="mb-0">
              <strong>Queries:</strong> If you have concerns about the calculation, you can raise queries 
              and HR will respond within 24 hours.
            </p>
          </Alert>
        </Col>
      </Row>

      {/* Salary Preview */}
      {showPreview && selectedMonth && selectedYear && (
        <Row>
          <Col>
            <SalaryPreview 
              month={parseInt(selectedMonth)} 
              year={parseInt(selectedYear)}
              onPreviewUpdate={(updatedPreview) => {
                // Handle preview updates if needed
                console.log("Preview updated:", updatedPreview);
              }}
            />
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default MySalaryPreview;