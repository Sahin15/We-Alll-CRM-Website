import { useState, useEffect } from "react";
import { Card, Badge, Button, Spinner, Form } from "react-bootstrap";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { leaveApi } from "../../api/leaveApi";
import { toast } from "react-toastify";

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [reminderText, setReminderText] = useState("");
  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('calendarReminders');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    fetchLeaves();
  }, [currentDate]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await leaveApi.getAllLeaves();
      setLeaves(response.data || []);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      toast.error("Failed to fetch calendar data");
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getLeaveForDate = (date) => {
    return leaves.filter((leave) => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      const checkDate = new Date(date);
      
      return checkDate >= leaveStart && checkDate <= leaveEnd &&
        (filterType === "all" || leave.status === filterType);
    });
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dateKey = date.toISOString().split('T')[0];
    setReminderText(reminders[dateKey] || "");
    setShowReminderModal(true);
  };

  const handleSaveReminder = () => {
    const dateKey = selectedDate.toISOString().split('T')[0];
    const updatedReminders = { ...reminders };
    
    if (reminderText.trim()) {
      updatedReminders[dateKey] = reminderText.trim();
    } else {
      delete updatedReminders[dateKey];
    }
    
    setReminders(updatedReminders);
    localStorage.setItem('calendarReminders', JSON.stringify(updatedReminders));
    setShowReminderModal(false);
    toast.success(reminderText.trim() ? "Reminder saved!" : "Reminder deleted!");
  };

  const getReminderForDate = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    return reminders[dateKey];
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "success";
      case "pending": return "warning";
      case "rejected": return "danger";
      default: return "secondary";
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">
            <FaCalendarAlt className="me-2 text-primary" />
            Calendar View
          </h5>
          <div className="d-flex gap-2 align-items-center">
            <Button variant="outline-secondary" size="sm" onClick={previousMonth}>
              <FaChevronLeft />
            </Button>
            <span className="fw-bold">
              {monthNames[month]} {year}
            </span>
            <Button variant="outline-secondary" size="sm" onClick={nextMonth}>
              <FaChevronRight />
            </Button>
          </div>
        </div>
        <Form.Select
          size="sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ maxWidth: "200px" }}
        >
          <option value="all">All Leaves</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </Form.Select>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <div className="calendar-grid">
            {/* Day headers */}
            <div className="d-grid mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {dayNames.map((day) => (
                <div key={day} className="text-center bg-light py-2 rounded">
                  <small className="fw-bold text-muted">{day}</small>
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {/* Empty cells for days before month starts */}
              {[...Array(startingDayOfWeek)].map((_, index) => (
                <div key={`empty-${index}`} className="border rounded bg-light" style={{ minHeight: "90px", opacity: 0.3 }}></div>
              ))}

              {/* Days of the month */}
              {[...Array(daysInMonth)].map((_, index) => {
                const day = index + 1;
                const date = new Date(year, month, day);
                const dayLeaves = getLeaveForDate(date).filter(leave => 
                  leave.status === 'approved' || leave.status === 'pending'
                );
                const isToday = date.toDateString() === new Date().toDateString();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const reminder = getReminderForDate(date);

                return (
                  <div
                    key={day}
                    className={`border rounded p-2 ${
                      isToday ? "border-primary border-2 bg-primary bg-opacity-10" : 
                      isWeekend ? "bg-light" : "bg-white"
                    }`}
                    style={{ 
                      minHeight: "90px", 
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onClick={() => handleDateClick(date)}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                  >
                    <div className={`fw-bold mb-1 ${isToday ? "text-primary" : isWeekend ? "text-muted" : ""}`}>
                      {day}
                    </div>
                    {reminder && (
                      <div className="mb-1">
                        <Badge bg="primary" className="text-truncate d-block" style={{ fontSize: "0.65rem" }} title={reminder}>
                          📝 {reminder.substring(0, 15)}{reminder.length > 15 ? '...' : ''}
                        </Badge>
                      </div>
                    )}
                    {dayLeaves.length > 0 && (
                      <div className="d-flex flex-column gap-1">
                        {dayLeaves.slice(0, 1).map((leave, idx) => (
                          <Badge
                            key={idx}
                            bg={getStatusColor(leave.status)}
                            className="text-truncate"
                            style={{ fontSize: "0.65rem" }}
                            title={`${leave.employee?.name} - ${leave.leaveType}`}
                          >
                            {leave.employee?.name?.split(" ")[0]}
                          </Badge>
                        ))}
                        {dayLeaves.length > 1 && (
                          <Badge bg="info" style={{ fontSize: "0.65rem" }}>
                            +{dayLeaves.length - 1} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 pt-3 border-top">
          <small className="text-muted d-block mb-2">Legend:</small>
          <div className="d-flex gap-3 flex-wrap">
            <div>
              <Badge bg="primary" className="me-1">📝</Badge>
              <small>Reminder</small>
            </div>
            <div>
              <Badge bg="success" className="me-1">●</Badge>
              <small>Approved Leave</small>
            </div>
            <div>
              <Badge bg="warning" className="me-1">●</Badge>
              <small>Pending Leave</small>
            </div>
          </div>
          <small className="text-muted d-block mt-2">💡 Click any date to add a reminder or note</small>
        </div>
      </Card.Body>

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowReminderModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  📝 Reminder for {selectedDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowReminderModal(false)}></button>
              </div>
              <div className="modal-body">
                <Form.Group>
                  <Form.Label>Add a note or reminder:</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={reminderText}
                    onChange={(e) => setReminderText(e.target.value)}
                    placeholder="e.g., Team meeting at 2 PM, Project deadline, Birthday celebration..."
                    autoFocus
                  />
                  <Form.Text className="text-muted">
                    Leave empty to delete the reminder
                  </Form.Text>
                </Form.Group>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowReminderModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveReminder}>
                  Save Reminder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CalendarView;
