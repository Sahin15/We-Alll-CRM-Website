import { useState, useMemo } from "react";
import { Card, Button, Badge, Row, Col, Form } from "react-bootstrap";
import { FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa";
import { statusColors } from "../../data/mockSlots";

const SlotCalendar = ({ slots = [], onSlotClick, onDateClick, canCreateSlot = false, filters = {} }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get calendar data
  const { year, month, daysInMonth, firstDayOfMonth, today } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return { year, month, daysInMonth, firstDayOfMonth, today };
  }, [currentDate]);

  // Month names
  const monthNames = [
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

  // Day names
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get slots for a specific date
  const getSlotsForDate = (day) => {
    const dateToCheck = new Date(year, month, day);
    dateToCheck.setHours(0, 0, 0, 0);

    return slots.filter((slot) => {
      // Support both postingDate (legacy) and dueDate (new)
      const slotDate = new Date(slot.dueDate || slot.postingDate);
      slotDate.setHours(0, 0, 0, 0);
      return slotDate.getTime() === dateToCheck.getTime();
    });
  };

  // Check if date is today
  const isToday = (day) => {
    const dateToCheck = new Date(year, month, day);
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck.getTime() === today.getTime();
  };

  // Check if date is in the past
  const isPast = (day) => {
    const dateToCheck = new Date(year, month, day);
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck < today;
  };

  // Get status color for slot
  const getSlotColor = (slot) => {
    // Check if overdue
    const slotDate = new Date(slot.dueDate || slot.postingDate);
    slotDate.setHours(0, 0, 0, 0);
    if (slotDate < today && slot.status !== "Completed" && slot.status !== "Approved" && slot.postingStatus !== "Posted") {
      return "#dc3545"; // Red for overdue
    }
    return statusColors[slot.status || slot.designStatus] || "#6c757d";
  };

  // Handle date click
  const handleDateClick = (day) => {
    if (canCreateSlot && onDateClick) {
      const clickedDate = new Date(year, month, day);
      onDateClick(clickedDate);
    }
  };

  // Render calendar days
  const renderCalendarDays = () => {
    const days = [];
    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const day = i - firstDayOfMonth + 1;
      const isValidDay = day > 0 && day <= daysInMonth;
      const daySlots = isValidDay ? getSlotsForDate(day) : [];
      const isTodayDate = isValidDay && isToday(day);
      const isPastDate = isValidDay && isPast(day);

      days.push(
        <div
          key={i}
          className={`calendar-day ${!isValidDay ? "empty" : ""} ${isTodayDate ? "today" : ""} ${
            isPastDate ? "past" : ""
          } ${canCreateSlot && isValidDay ? "clickable" : ""}`}
          onClick={() => isValidDay && handleDateClick(day)}
        >
          {isValidDay && (
            <>
              <div className="day-number">{day}</div>
              <div className="day-slots">
                {daySlots.length > 0 ? (
                  <>
                    {daySlots.slice(0, 3).map((slot) => (
                      <div
                        key={slot._id}
                        className="slot-item"
                        style={{ backgroundColor: getSlotColor(slot) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSlotClick && onSlotClick(slot);
                        }}
                        title={`${slot.workType || slot.postType} - ${slot.title || slot.occasion || slot.contentBucket}`}
                      >
                        <span className="slot-text">
                          {slot.workType || slot.postType}
                          {slot.platforms && slot.platforms.length > 0 && ` - ${slot.platforms[0]}`}
                          {slot.platforms && slot.platforms.length > 1 && ` +${slot.platforms.length - 1}`}
                          {!slot.platforms && slot.assignedTo && ` - ${slot.assignedTo.name}`}
                        </span>
                      </div>
                    ))}
                    {daySlots.length > 3 && (
                      <div className="slot-more">+{daySlots.length - 3} more</div>
                    )}
                  </>
                ) : (
                  canCreateSlot && (
                    <div className="add-slot-hint">
                      <FaPlus size={12} />
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="slot-calendar">
      {/* Calendar Header */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={4}>
              <div className="d-flex gap-2">
                <Button variant="outline-primary" size="sm" onClick={goToPreviousMonth}>
                  <FaChevronLeft />
                </Button>
                <Button variant="outline-primary" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline-primary" size="sm" onClick={goToNextMonth}>
                  <FaChevronRight />
                </Button>
              </div>
            </Col>
            <Col md={4} className="text-center">
              <h4 className="mb-0">
                {monthNames[month]} {year}
              </h4>
            </Col>
            <Col md={4} className="text-end">
              <small className="text-muted">
                {slots.length} slot{slots.length !== 1 ? "s" : ""} this month
              </small>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Color Legend */}
      <Card className="mb-3">
        <Card.Body className="py-2">
          <div className="d-flex flex-wrap gap-3 justify-content-center align-items-center">
            <small className="text-muted">Status:</small>
            <div className="d-flex align-items-center gap-1">
              <div className="legend-color" style={{ backgroundColor: statusColors["Planned"] }}></div>
              <small>Planned</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <div className="legend-color" style={{ backgroundColor: statusColors["In Design"] }}></div>
              <small>In Design</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <div className="legend-color" style={{ backgroundColor: statusColors["Ready for Review"] }}></div>
              <small>Ready for Review</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <div className="legend-color" style={{ backgroundColor: statusColors["Approved"] }}></div>
              <small>Approved</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <div className="legend-color" style={{ backgroundColor: statusColors["Posted"] }}></div>
              <small>Posted</small>
            </div>
            <div className="d-flex align-items-center gap-1">
              <div className="legend-color" style={{ backgroundColor: "#dc3545" }}></div>
              <small>Overdue</small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <Card.Body className="p-0">
          <div className="calendar-grid">
            {/* Day headers */}
            <div className="calendar-header">
              {dayNames.map((day) => (
                <div key={day} className="day-header">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="calendar-body">{renderCalendarDays()}</div>
          </div>
        </Card.Body>
      </Card>

      <style>{`
        .slot-calendar {
          width: 100%;
        }

        .calendar-grid {
          display: flex;
          flex-direction: column;
        }

        .calendar-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background-color: #f8f9fa;
          border-bottom: 2px solid #dee2e6;
        }

        .day-header {
          padding: 10px;
          text-align: center;
          font-weight: 600;
          font-size: 0.9rem;
          color: #495057;
        }

        .calendar-body {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background-color: #dee2e6;
        }

        .calendar-day {
          background-color: white;
          min-height: 120px;
          padding: 8px;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .calendar-day.empty {
          background-color: #f8f9fa;
        }

        .calendar-day.today {
          background-color: #fff3cd;
          border: 2px solid #ffc107;
        }

        .calendar-day.past {
          background-color: #f8f9fa;
        }

        .calendar-day.clickable:hover {
          background-color: #e9ecef;
          cursor: pointer;
        }

        .day-number {
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 4px;
          color: #495057;
        }

        .calendar-day.today .day-number {
          color: #856404;
        }

        .day-slots {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .slot-item {
          padding: 4px 6px;
          border-radius: 3px;
          font-size: 0.75rem;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .slot-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slot-text {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .slot-more {
          padding: 2px 6px;
          font-size: 0.7rem;
          color: #6c757d;
          text-align: center;
          font-weight: 600;
        }

        .add-slot-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          color: #adb5bd;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .calendar-day.clickable:hover .add-slot-hint {
          opacity: 1;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          border: 1px solid #dee2e6;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .calendar-day {
            min-height: 80px;
            padding: 4px;
          }

          .day-number {
            font-size: 0.8rem;
          }

          .slot-item {
            font-size: 0.65rem;
            padding: 2px 4px;
          }

          .day-header {
            padding: 8px 4px;
            font-size: 0.75rem;
          }

          .slot-text {
            display: none;
          }

          .slot-item::after {
            content: "•";
            font-size: 1.2rem;
          }
        }

        @media (max-width: 576px) {
          .calendar-day {
            min-height: 60px;
            padding: 2px;
          }

          .day-number {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SlotCalendar;
