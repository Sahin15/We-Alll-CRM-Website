import { useState, useEffect } from "react";
import { Button, Modal, Spinner } from "react-bootstrap";
import { FaClock } from "react-icons/fa";
import toast from "../../utils/toast";
import api from "../../services/api";

const BreakTimer = () => {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [timer, setTimer] = useState(null);
  const [timerType, setTimerType] = useState(null); // 'work' or 'break'
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [action, setAction] = useState(null);

  useEffect(() => {
    fetchTodayAttendance();
    
    // Refresh every 3 seconds for near real-time updates
    const refreshInterval = setInterval(fetchTodayAttendance, 3000);
    
    // Listen for attendance updates from other components (like navbar)
    const handleAttendanceUpdate = (event) => {
      const { data } = event.detail;
      setTodayAttendance(data);
    };
    
    window.addEventListener('attendanceUpdate', handleAttendanceUpdate);
    
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('attendanceUpdate', handleAttendanceUpdate);
    };
  }, []);

  // Timer effect - updates every second
  useEffect(() => {
    let interval;
    
    if (todayAttendance && todayAttendance.clockIn) {
      const breaks = todayAttendance.breaks || [];
      const activeBreak = breaks.length > 0 && breaks[breaks.length - 1].startTime && !breaks[breaks.length - 1].endTime;
      
      if (activeBreak) {
        // On break
        setTimerType('break');
        const breakStartTime = new Date(breaks[breaks.length - 1].startTime);
        
        const updateTimer = () => {
          const now = new Date();
          const diff = now - breakStartTime;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          setTimer({ hours, minutes, seconds, startTime: breakStartTime });
        };
        
        updateTimer();
        interval = setInterval(updateTimer, 1000);
      } else if (!todayAttendance.clockOut) {
        // Working (clocked in but not on break and not clocked out)
        setTimerType('work');
        const clockInTime = new Date(todayAttendance.clockIn);
        
        const updateTimer = () => {
          const now = new Date();
          // Calculate total work time (excluding break times)
          let totalBreakTime = 0;
          breaks.forEach(b => {
            if (b.startTime && b.endTime) {
              totalBreakTime += new Date(b.endTime) - new Date(b.startTime);
            }
          });
          
          const workTime = now - clockInTime - totalBreakTime;
          const hours = Math.floor(workTime / (1000 * 60 * 60));
          const minutes = Math.floor((workTime % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((workTime % (1000 * 60)) / 1000);
          
          setTimer({ hours, minutes, seconds, startTime: clockInTime });
        };
        
        updateTimer();
        interval = setInterval(updateTimer, 1000);
      } else {
        // Clocked out
        setTimerType(null);
        setTimer(null);
      }
    } else {
      // Not clocked in
      setTimerType(null);
      setTimer(null);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [todayAttendance]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await api.get("/attendance/today");
      setTodayAttendance(response.data);
    } catch (error) {
      // No attendance today or user doesn't have attendance (admin/client)
      setTodayAttendance(null);
    }
  };

  const openConfirmDialog = (actionType) => {
    setAction(actionType);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    if (action === "startBreak") {
      handleStartBreak();
    } else if (action === "endBreak") {
      handleEndBreak();
    }
  };

  const handleStartBreak = async () => {
    setLoading(true);
    try {
      const response = await api.post("/attendance/start-break");
      toast.success("Break started");
      const attendanceData = response.data.attendance || response.data;
      setTodayAttendance(attendanceData);
      
      // Trigger event for other components to update
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'startBreak', data: attendanceData } 
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start break");
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setLoading(true);
    try {
      const response = await api.post("/attendance/end-break");
      toast.success("Break ended");
      const attendanceData = response.data.attendance || response.data;
      setTodayAttendance(attendanceData);
      
      // Trigger event for other components to update
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'endBreak', data: attendanceData } 
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to end break");
    } finally {
      setLoading(false);
    }
  };

  // Don't render if not clocked in
  if (!timerType || !timer) {
    return null;
  }

  const isBreak = timerType === 'break';
  
  const accentGradient = isBreak 
    ? 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)'
    : 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)';
  
  const icon = isBreak ? '☕' : '💼';
  const label = isBreak ? 'BREAK TIME' : 'WORK TIME';
  
  // Calculate additional info
  const clockInTime = todayAttendance?.clockIn ? new Date(todayAttendance.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
  const breaks = todayAttendance?.breaks || [];
  const completedBreaks = breaks.filter(b => b.startTime && b.endTime).length;
  
  // Calculate total break time taken today
  let totalBreakMinutes = 0;
  breaks.forEach(b => {
    if (b.startTime && b.endTime) {
      totalBreakMinutes += Math.floor((new Date(b.endTime) - new Date(b.startTime)) / (1000 * 60));
    }
  });

  return (
    <div 
      className="timer-card-floating-container"
      style={{ 
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '220px',
        zIndex: 20
      }}
    >
      <style>{`
        /* Timer Styles - Glassmorphism */
        @keyframes pulse-glow-glass {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          50% {
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }
        }
        
        @keyframes accent-pulse {
          0%, 100% {
            box-shadow: 0 2px 12px ${isBreak ? 'rgba(255, 152, 0, 0.6)' : 'rgba(76, 175, 80, 0.6)'};
          }
          50% {
            box-shadow: 0 4px 20px ${isBreak ? 'rgba(255, 152, 0, 0.9)' : 'rgba(76, 175, 80, 0.9)'};
          }
        }
        
        .timer-card-floating {
          animation: pulse-glow-glass 2s ease-in-out infinite;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px) saturate(180%);
          -webkit-backdrop-filter: blur(10px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        
        .timer-card-floating:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
        }
        
        .timer-info-text {
          font-size: 0.65rem;
          opacity: 0.95;
          line-height: 1.3;
        }
        
        .timer-accent-header {
          background: ${accentGradient};
          padding: 6px 10px;
          border-radius: 8px 8px 0 0;
          margin: -8px -8px 8px -8px;
          box-shadow: 0 4px 12px ${isBreak ? 'rgba(255, 152, 0, 0.4)' : 'rgba(76, 175, 80, 0.4)'};
          animation: accent-pulse 2s ease-in-out infinite;
        }
        
        .timer-icon-badge {
          background: rgba(255, 255, 255, 0.25);
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          backdrop-filter: blur(5px);
        }
        
        .timer-action-btn {
          font-size: 0.7rem;
          padding: 4px 12px;
          border-radius: 6px;
          font-weight: 600;
          transition: all 0.2s ease;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .timer-action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .timer-action-btn-compact {
          font-size: 1.2rem;
          padding: 6px 10px;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s ease;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          line-height: 1;
          min-width: 40px;
        }
        
        .timer-action-btn-compact:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .timer-action-btn-compact:active {
          transform: scale(0.95);
        }
        
        .timer-resume-btn {
          animation: pulse-resume 2s ease-in-out infinite;
        }
        
        .timer-resume-btn:hover {
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.6) !important;
        }
        
        .timer-break-btn:hover {
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.6) !important;
        }
        
        @keyframes pulse-resume {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
          }
          50% {
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.7);
          }
        }
        
        @media (max-width: 768px) {
          .timer-card-floating-container {
            position: relative !important;
            top: 0 !important;
            right: 0 !important;
            width: 100% !important;
            margin-top: 0 !important;
            margin-bottom: 15px !important;
          }
          
          .timer-card-floating {
            padding: 1rem !important;
          }
          
          .timer-card-floating .text-white {
            color: #ffffff !important;
          }
          
          .timer-display-compact {
            font-size: 2rem !important;
            color: #ffffff !important;
          }
          
          .timer-info-text {
            font-size: 0.75rem !important;
            color: #ffffff !important;
          }
          
          .timer-accent-header {
            padding: 10px 14px !important;
            margin: -16px -16px 12px -16px !important;
          }
          
          .timer-icon-badge {
            padding: 6px 12px !important;
          }
          
          .timer-icon-badge span {
            font-size: 1.3em !important;
          }
          
          .timer-icon-badge strong {
            font-size: 0.85rem !important;
            color: #ffffff !important;
          }
          
          .timer-action-btn-compact {
            font-size: 1.5rem !important;
            padding: 10px 14px !important;
            min-width: 50px !important;
          }
        }
      `}</style>
      
      <div 
        className="timer-card-floating p-2 rounded-3"
      >
        <div className="text-white">
          {/* Colored Header Bar */}
          <div className="timer-accent-header">
            <div className="timer-icon-badge">
              <span style={{ fontSize: '1.1em', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{icon}</span>
              <strong style={{ 
                fontSize: '0.75rem', 
                letterSpacing: '0.5px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                fontWeight: '700'
              }}>{label}</strong>
            </div>
          </div>
          
          {/* Timer Display with Action Button - Horizontal Layout */}
          <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
            {/* Timer */}
            <div 
              className="timer-display-compact d-flex justify-content-center align-items-center gap-1"
              style={{ 
                fontSize: '1.3rem', 
                fontWeight: 'bold', 
                fontFamily: 'monospace',
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                flex: '1'
              }}
            >
              <div className="text-center">
                <div style={{ lineHeight: '1' }}>{String(timer.hours).padStart(2, '0')}</div>
              </div>
              <div style={{ lineHeight: '1', opacity: 0.7 }}>:</div>
              <div className="text-center">
                <div style={{ lineHeight: '1' }}>{String(timer.minutes).padStart(2, '0')}</div>
              </div>
              <div style={{ lineHeight: '1', opacity: 0.7 }}>:</div>
              <div className="text-center">
                <div style={{ lineHeight: '1' }}>{String(timer.seconds).padStart(2, '0')}</div>
              </div>
            </div>
            
            {/* Action Button - Compact, Next to Timer */}
            {isBreak ? (
              <Button 
                size="sm" 
                className="timer-action-btn-compact timer-resume-btn"
                onClick={() => openConfirmDialog("endBreak")}
                disabled={loading}
                title="Resume Work"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: 'white'
                }}
              >
                {loading ? '...' : '▶️'}
              </Button>
            ) : (
              <Button 
                size="sm" 
                className="timer-action-btn-compact timer-break-btn"
                onClick={() => openConfirmDialog("startBreak")}
                disabled={loading}
                title="Start Break"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  color: 'white'
                }}
              >
                {loading ? '...' : '☕'}
              </Button>
            )}
          </div>
          
          {/* Additional Info */}
          <div 
            className="timer-info-text text-center" 
            style={{ 
              borderTop: '1px solid rgba(255,255,255,0.2)', 
              paddingTop: '6px',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            {isBreak ? (
              <>
                <div>Started: {new Date(timer.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="mt-1">Breaks today: {completedBreaks + 1}</div>
              </>
            ) : (
              <>
                <div>Clocked in: {clockInTime}</div>
                {completedBreaks > 0 && (
                  <div className="mt-1">Breaks: {completedBreaks} ({totalBreakMinutes}m)</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal 
        show={showConfirm} 
        onHide={() => setShowConfirm(false)} 
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {action === "startBreak" ? "Start Break" : "Resume Work"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <FaClock className="text-primary fs-1 mb-3" />
            <h5>
              {action === "startBreak"
                ? "Taking a break?"
                : "Ready to resume work?"}
            </h5>
            <p className="text-muted">
              {action === "startBreak"
                ? "This will start tracking your break time."
                : "This will end your break and resume work time tracking."}
            </p>
            {todayAttendance?.clockIn && (
              <div className="alert alert-info">
                <strong>Clock In Time:</strong>{" "}
                {new Date(todayAttendance.clockIn).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false
                })}
              </div>
            )}
            {todayAttendance?.totalBreakTime > 0 && action === "endBreak" && (
              <div className="alert alert-warning">
                <strong>Total Break Time:</strong> {Math.floor(todayAttendance.totalBreakTime)} minutes
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant={action === "startBreak" ? "warning" : "info"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : action === "startBreak" ? (
              "Start Break"
            ) : (
              "Resume Work"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BreakTimer;
