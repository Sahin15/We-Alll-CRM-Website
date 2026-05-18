import { useState, useEffect } from 'react';
import { Card, Badge, Row, Col } from 'react-bootstrap';
import { getStatusColor, formatHours } from '../../utils/helpers';
import holidayApi from '../../api/holidayApi';
import './AttendanceCalendar.css';

/**
 * AttendanceCalendar - Shows all dates of the month with attendance status
 * Displays: Present, Late, Half Day, Absent, On Leave, No Data, Company Holiday
 * Note: Holidays are flexible - employees can work on any day and take holiday on another day
 */
const AttendanceCalendar = ({ attendances, selectedMonth, selectedYear, employeeName }) => {
  const [calendarDays, setCalendarDays] = useState([]);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetchHolidays();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    generateCalendar();
  }, [selectedMonth, selectedYear, attendances, holidays]);

  const fetchHolidays = async () => {
    try {
      const response = await holidayApi.getHolidays();
      console.log('🎉 Holiday API Response:', response);
      
      // The API returns { success: true, data: holidays }
      let holidaysData = [];
      if (response && response.data && Array.isArray(response.data)) {
        holidaysData = response.data;
      } else if (Array.isArray(response)) {
        holidaysData = response;
      }
      
      console.log('🎉 Processed holidays:', holidaysData);
      console.log('🎉 Holidays count:', holidaysData.length);
      setHolidays(holidaysData);
    } catch (error) {
      console.error('❌ Error fetching holidays:', error);
      setHolidays([]);
    }
  };

  const generateCalendar = () => {
    const year = selectedYear || new Date().getFullYear();
    const month = selectedMonth || new Date().getMonth();

    console.log(`📅 Generating calendar for ${year}-${month + 1}, Holidays count: ${holidays.length}`);
    if (holidays.length > 0) {
      console.log('🎉 Available holidays:', holidays.map(h => ({ name: h.name, date: h.date })));
    }

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday

    // Get today's date for comparison
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
                       String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(today.getDate()).padStart(2, '0');

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // Create date string in local timezone (YYYY-MM-DD)
      const dateString = date.getFullYear() + '-' + 
                        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(date.getDate()).padStart(2, '0');

      // Check if this date is in the future
      const isFutureDate = dateString > todayString;

      // Check if this date is a company holiday
      const isHoliday = holidays.some(holiday => {
        if (!holiday || !holiday.date) return false;
        
        // Parse holiday date - handle both string and Date formats
        let holidayDate;
        if (typeof holiday.date === 'string') {
          holidayDate = new Date(holiday.date);
        } else {
          holidayDate = new Date(holiday.date);
        }
        
        // Get the date part only (ignore time and timezone)
        const holidayDateString = holidayDate.getFullYear() + '-' + 
                                 String(holidayDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                 String(holidayDate.getDate()).padStart(2, '0');
        
        const match = holidayDateString === dateString;
        if (match) {
          console.log(`✅ Holiday found on ${dateString}: ${holiday.name}`);
        }
        return match;
      });

      const holidayData = holidays.find(holiday => {
        if (!holiday || !holiday.date) return false;
        
        // Parse holiday date - handle both string and Date formats
        let holidayDate;
        if (typeof holiday.date === 'string') {
          holidayDate = new Date(holiday.date);
        } else {
          holidayDate = new Date(holiday.date);
        }
        
        // Get the date part only (ignore time and timezone)
        const holidayDateString = holidayDate.getFullYear() + '-' + 
                                 String(holidayDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                 String(holidayDate.getDate()).padStart(2, '0');
        
        return holidayDateString === dateString;
      });

      // Find attendance record for this date
      const attendance = attendances.find(a => {
        if (!a.date) return false;
        // Parse the attendance date - handle both string and Date formats
        let aDate;
        if (typeof a.date === 'string') {
          // If it's a string, parse it directly
          aDate = new Date(a.date);
        } else {
          // If it's a Date object, use it directly
          aDate = new Date(a.date);
        }
        
        // Get the date part only (ignore time and timezone)
        const aDateString = aDate.getFullYear() + '-' + 
                           String(aDate.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(aDate.getDate()).padStart(2, '0');
        
        const match = aDateString === dateString;
        return match;
      });

      // Determine status - holiday takes precedence, then weekend
      let status;
      if (isHoliday) {
        status = 'holiday';
      } else if (date.getDay() === 0) {
        status = 'weekend'; // Sunday — always a day off
      } else if (attendance) {
        status = attendance.status;
      } else if (isFutureDate) {
        status = 'no-data'; // Future date with no record
      } else {
        status = 'no-data'; // Past date with no record (same as table view)
      }

      days.push({
        day,
        date: dateString,
        dayOfWeek: date.getDay(),
        isFutureDate,
        attendance,
        status,
        isHoliday,
        holidayName: holidayData?.name || null,
      });
    }

    setCalendarDays(days);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'late':
        return 'Late';
      case 'half-day':
        return 'Half Day';
      case 'absent':
        return 'Absent';
      case 'on-leave':
        return 'On Leave';
      case 'holiday':
        return 'Holiday';
      case 'no-data':
        return 'No Data';
      case 'weekend':
        return 'Weekend';
      default:
        return 'Absent';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return '✓';
      case 'late':
        return '⏰';
      case 'half-day':
        return '◐';
      case 'absent':
        return '✕';
      case 'on-leave':
        return '🏖️';
      case 'holiday':
        return '🎉';
      case 'no-data':
        return '?';
      case 'weekend':
        return '🌴';
      default:
        return '✕';
    }
  };

  const monthName = new Date(selectedYear || new Date().getFullYear(), selectedMonth || new Date().getMonth()).toLocaleString('default', { month: 'long', year: 'numeric' });



  // Calculate statistics
  const stats = {
    present: calendarDays.filter(d => d && d.status === 'present').length,
    late: calendarDays.filter(d => d && d.status === 'late').length,
    halfDay: calendarDays.filter(d => d && d.status === 'half-day').length,
    absent: calendarDays.filter(d => d && d.status === 'absent').length,
    onLeave: calendarDays.filter(d => d && d.status === 'on-leave').length,
    holiday: calendarDays.filter(d => d && d.status === 'holiday').length,
    noData: calendarDays.filter(d => d && d.status === 'no-data').length,
  };

  return (
    <div className="attendance-calendar">
      <Card>
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            📅 Attendance Calendar - {employeeName || 'Employee'} ({monthName})
          </h5>
        </Card.Header>
        <Card.Body>
          {/* Statistics */}
          <Row className="mb-4">
            <Col xs={6} sm={4} md={2} className="mb-2">
              <div className="text-center p-2 bg-success bg-opacity-10 rounded border border-success">
                <h6 className="text-success mb-0">{stats.present}</h6>
                <small className="text-success fw-semibold">Present</small>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2} className="mb-2">
              <div className="text-center p-2 bg-warning bg-opacity-10 rounded border border-warning">
                <h6 className="text-warning mb-0">{stats.late}</h6>
                <small className="text-warning fw-semibold">Late</small>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2} className="mb-2">
              <div className="text-center p-2 bg-info bg-opacity-10 rounded border border-info">
                <h6 className="text-info mb-0">{stats.halfDay}</h6>
                <small className="text-info fw-semibold">Half Day</small>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2} className="mb-2">
              <div className="text-center p-2 bg-danger bg-opacity-10 rounded border border-danger">
                <h6 className="text-danger mb-0">{stats.absent}</h6>
                <small className="text-danger fw-semibold">Absent</small>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2} className="mb-2">
              <div className="text-center p-2 bg-secondary bg-opacity-10 rounded border border-secondary">
                <h6 className="text-secondary mb-0">{stats.onLeave}</h6>
                <small className="text-secondary fw-semibold">On Leave</small>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2} className="mb-2">
              <div className="text-center p-2 bg-purple bg-opacity-10 rounded border border-purple" style={{ borderColor: '#6f42c1' }}>
                <h6 className="mb-0" style={{ color: '#6f42c1' }}>{stats.holiday}</h6>
                <small className="fw-semibold" style={{ color: '#6f42c1' }}>Holiday</small>
              </div>
            </Col>
            <Col xs={6} sm={4} md={2} className="mb-2">
              <div className="text-center p-2 bg-light border border-secondary rounded">
                <h6 className="text-muted mb-0">{stats.noData}</h6>
                <small className="text-muted fw-semibold">No Data</small>
              </div>
            </Col>
          </Row>

          {/* Expected vs Achieved Average */}
          <div className="mb-4 p-3 bg-primary bg-opacity-10 rounded border border-primary">
            <Row className="text-center">
              <Col xs={6} md={3}>
                <div>
                  <h5 className="text-primary mb-0">
                    {(() => {
                      // Expected average: based only on days where employee actually clocked out (workHours > 0)
                      let totalExpected = 0;
                      let daysWithHours = 0;
                      attendances.forEach((a) => {
                        if (a.workHours && a.workHours > 0) {
                          const date = new Date(a.date);
                          const dayOfWeek = date.getDay();
                          if (a.status === 'half-day') {
                            totalExpected += dayOfWeek === 6 ? 3 : 4;
                          } else {
                            totalExpected += dayOfWeek === 6 ? 6 : 8;
                          }
                          daysWithHours += 1;
                        }
                      });
                      return daysWithHours > 0 ? formatHours(totalExpected / daysWithHours) : '0.00';
                    })()}
                  </h5>
                  <small className="text-muted">Expected Avg/Day</small>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div>
                  <h5 className="text-success mb-0">
                    {(() => {
                      // Achieved average = total work hours / days where employee actually clocked out
                      let totalHours = 0;
                      let daysWithHours = 0;
                      attendances.forEach((a) => {
                        if (a.workHours && a.workHours > 0) {
                          totalHours += a.workHours;
                          daysWithHours += 1;
                        }
                      });
                      return daysWithHours > 0 ? formatHours(totalHours / daysWithHours) : '0.00';
                    })()}
                  </h5>
                  <small className="text-muted">Achieved Avg/Day</small>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div>
                  {/* Difference: achieved avg - expected avg, using days with actual hours */}
                  <h5 className={`mb-0 ${(() => {
                    let totalExpected = 0;
                    let totalHours = 0;
                    let daysWithHours = 0;
                    attendances.forEach((a) => {
                      if (a.workHours && a.workHours > 0) {
                        const date = new Date(a.date);
                        const dayOfWeek = date.getDay();
                        if (a.status === 'half-day') {
                          totalExpected += dayOfWeek === 6 ? 3 : 4;
                        } else {
                          totalExpected += dayOfWeek === 6 ? 6 : 8;
                        }
                        totalHours += a.workHours;
                        daysWithHours += 1;
                      }
                    });
                    const expectedAvg = daysWithHours > 0 ? totalExpected / daysWithHours : 0;
                    const achievedAvg = daysWithHours > 0 ? totalHours / daysWithHours : 0;
                    return achievedAvg >= expectedAvg ? 'text-success' : 'text-danger';
                  })()}`}>
                    {(() => {
                      let totalExpected = 0;
                      let totalHours = 0;
                      let daysWithHours = 0;
                      attendances.forEach((a) => {
                        if (a.workHours && a.workHours > 0) {
                          const date = new Date(a.date);
                          const dayOfWeek = date.getDay();
                          if (a.status === 'half-day') {
                            totalExpected += dayOfWeek === 6 ? 3 : 4;
                          } else {
                            totalExpected += dayOfWeek === 6 ? 6 : 8;
                          }
                          totalHours += a.workHours;
                          daysWithHours += 1;
                        }
                      });
                      const expectedAvg = daysWithHours > 0 ? totalExpected / daysWithHours : 0;
                      const achievedAvg = daysWithHours > 0 ? totalHours / daysWithHours : 0;
                      return formatHours(achievedAvg - expectedAvg);
                    })()}
                  </h5>
                  <small className="text-muted">Difference</small>
                </div>
              </Col>
              <Col xs={6} md={3}>
                <div>
                  <h5 className="text-info mb-0">
                    {(() => {
                      let workingDays = 0;
                      attendances.forEach((a) => {
                        if (a.status === 'present' || a.status === 'late' || a.status === 'half-day') {
                          workingDays += 1;
                        }
                      });
                      return workingDays;
                    })()}
                  </h5>
                  <small className="text-muted">Days Worked</small>
                </div>
              </Col>
            </Row>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="calendar-day-header">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((dayData, index) => (
              <div
                key={index}
                className={`calendar-day ${dayData ? '' : 'empty'} ${dayData ? `status-${dayData.status}` : ''}`}
                title={dayData && dayData.isHoliday ? `🎉 ${dayData.holidayName}` : ''}
              >
                {dayData ? (
                  <div className="day-content">
                    <div className="day-number">{dayData.day}</div>
                    <div className="day-status">
                      <Badge bg={getStatusColor(dayData.status).bg} text={getStatusColor(dayData.status).text} className="w-100 text-center">
                        <span className="status-icon">{getStatusIcon(dayData.status)}</span>
                        <span className="status-label">{getStatusLabel(dayData.status)}</span>
                      </Badge>
                    </div>
                    {dayData.isHoliday && dayData.holidayName && (
                      <div className="day-holiday-name">
                        <small className="text-muted fw-semibold">{dayData.holidayName}</small>
                      </div>
                    )}
                    {dayData.attendance && !dayData.isHoliday && (
                      <div className="day-details">
                        <small className="text-muted">
                          {dayData.attendance.status === 'on-leave' ? 'On Leave' : (dayData.attendance.clockIn ? new Date(dayData.attendance.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-')}
                        </small>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-top">
            <h6 className="mb-3">Legend:</h6>
            <Row>
              <Col xs={6} sm={4} md={3} className="mb-2">
                <small>
                  <Badge bg="success" text="white">✓ Present</Badge> - On time
                </small>
              </Col>
              <Col xs={6} sm={4} md={3} className="mb-2">
                <small>
                  <Badge bg="warning" text="dark">⏰ Late</Badge> - Late arrival
                </small>
              </Col>
              <Col xs={6} sm={4} md={3} className="mb-2">
                <small>
                  <Badge bg="info" text="white">◐ Half Day</Badge> - Half day work
                </small>
              </Col>
              <Col xs={6} sm={4} md={3} className="mb-2">
                <small>
                  <Badge bg="danger" text="white">✕ Absent</Badge> - No clock-in
                </small>
              </Col>
              <Col xs={6} sm={4} md={3} className="mb-2">
                <small>
                  <Badge bg="secondary" text="white">🏖️ On Leave</Badge> - Leave day
                </small>
              </Col>
              <Col xs={6} sm={4} md={3} className="mb-2">
                <small>
                  <Badge style={{ backgroundColor: '#6f42c1', color: 'white' }}>🎉 Holiday</Badge> - Company holiday
                </small>
              </Col>
              <Col xs={6} sm={4} md={3} className="mb-2">
                <small>
                  <Badge bg="light" text="muted">? No Data</Badge> - Future date
                </small>
              </Col>
              <Col xs={6} sm={4} md={3} className="mb-2">
                <small>
                  <Badge bg="light" text="muted">🌴 Weekend</Badge> - Sunday (day off)
                </small>
              </Col>
            </Row>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AttendanceCalendar;
