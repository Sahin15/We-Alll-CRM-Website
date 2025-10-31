import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
} from "react-bootstrap";
import { FaClock, FaSignOutAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import { attendanceApi } from "../../api/attendanceApi";
import { formatDate, formatDateTime } from "../../utils/helpers";

const MyAttendance = () => {
  const [attendances, setAttendances] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await attendanceApi.getMyAttendance();
      setAttendances(response.data);

      // Check if already clocked in today
      const today = new Date().toISOString().split("T")[0];
      const todayRecord = response.data.find(
        (a) => a.date?.split("T")[0] === today
      );
      setTodayAttendance(todayRecord);
    } catch (error) {
      toast.error("Failed to fetch attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setClockingIn(true);
      await attendanceApi.clockIn({
        latitude: 0,
        longitude: 0,
        address: "Office",
      });
      toast.success("Clocked in successfully");
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clock in");
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setClockingIn(true);
      await attendanceApi.clockOut("End of day");
      toast.success("Clocked out successfully");
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clock out");
    } finally {
      setClockingIn(false);
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>My Attendance</h2>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <h5>Today's Attendance</h5>
              {todayAttendance ? (
                <div>
                  <p className="mb-2">
                    <strong>Clock In:</strong>{" "}
                    {formatDateTime(todayAttendance.clockIn)}
                  </p>
                  {todayAttendance.clockOut ? (
                    <>
                      <p className="mb-2">
                        <strong>Clock Out:</strong>{" "}
                        {formatDateTime(todayAttendance.clockOut)}
                      </p>
                      <p className="mb-2">
                        <strong>Work Hours:</strong> {todayAttendance.workHours}{" "}
                        hours
                      </p>
                      <Badge bg="success">Completed</Badge>
                    </>
                  ) : (
                    <>
                      <p className="text-success mb-3">Currently working...</p>
                      <Button
                        variant="danger"
                        onClick={handleClockOut}
                        disabled={clockingIn}
                      >
                        <FaSignOutAlt className="me-2" />
                        {clockingIn ? "Clocking out..." : "Clock Out"}
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-muted mb-3">
                    You haven't clocked in today
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleClockIn}
                    disabled={clockingIn}
                  >
                    <FaClock className="me-2" />
                    {clockingIn ? "Clocking in..." : "Clock In"}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Attendance History</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Work Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.length > 0 ? (
                      attendances.map((attendance) => (
                        <tr key={attendance._id}>
                          <td>{formatDate(attendance.date)}</td>
                          <td>{formatDateTime(attendance.clockIn)}</td>
                          <td>
                            {attendance.clockOut
                              ? formatDateTime(attendance.clockOut)
                              : "-"}
                          </td>
                          <td>{attendance.workHours || 0} hours</td>
                          <td>
                            <Badge
                              bg={
                                attendance.status === "present"
                                  ? "success"
                                  : "warning"
                              }
                            >
                              {attendance.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          No attendance records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default MyAttendance;
