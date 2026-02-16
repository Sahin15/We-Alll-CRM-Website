import { useState, useEffect } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { FaMoneyBillWave, FaDownload, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { salarySlipApi } from "../../api/salaryApi";

const SalaryWidget = () => {
  const navigate = useNavigate();
  const [currentSlip, setCurrentSlip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentMonthSlip();
  }, []);

  const fetchCurrentMonthSlip = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const response = await salarySlipApi.getMySlips({
        year: currentYear,
      });

      const slips = response.data || [];
      const slip = slips.find(
        (s) => s.month === currentMonth && s.year === currentYear
      );

      setCurrentSlip(slip || null);
    } catch (error) {
      console.error("Error fetching current salary slip:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthName = (month) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <Card className="dashboard-card stat-card border-0 shadow-sm h-100">
        <Card.Body className="d-flex justify-content-center align-items-center">
          <Spinner animation="border" size="sm" />
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card 
      className="dashboard-card stat-card border-0 shadow-sm h-100 cursor-pointer"
      onClick={() => navigate("/employee/salary-slips")}
      style={{ cursor: 'pointer' }}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h6 className="text-muted mb-2">My Salary</h6>
            {currentSlip ? (
              <>
                <h3 className="mb-1 text-success">
                  {formatCurrency(currentSlip.netSalary)}
                </h3>
                <small className="text-success">
                  {getMonthName(currentSlip.month)} {currentSlip.year} • Click for details
                </small>
              </>
            ) : (
              <>
                <h3 className="mb-1">Not Available</h3>
                <small className="text-muted">
                  Current month slip • Click to view all
                </small>
              </>
            )}
          </div>
          <div className="bg-success bg-opacity-10 p-3 rounded">
            <FaMoneyBillWave className="text-success fs-4" />
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default SalaryWidget;
