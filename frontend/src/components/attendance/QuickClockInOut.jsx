import { useState, useEffect } from "react";
import { Button, Spinner, Modal } from "react-bootstrap";
import { FaClock, FaSignInAlt, FaSignOutAlt, FaPause, FaPlay } from "react-icons/fa";
import toast from "../../utils/toast";
import api from "../../services/api";
import OvertimeTimer from "./OvertimeTimer";
import WorkLogSubmissionModal from "../worklog/WorkLogSubmissionModal";

const QuickClockInOut = ({ variant = "light", size = "sm", showLabel = true }) => {
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [action, setAction] = useState(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);

  useEffect(() => {
    fetchTodayAttendance();
    
    // Poll for attendance updates every 30 seconds for better responsiveness
    const pollInterval = setInterval(() => {
      fetchTodayAttendance();
    }, 30000); // 30 seconds
    
    // Listen for attendance updates from other components
    const handleAttendanceUpdate = (event) => {
      const { data } = event.detail;
      setTodayAttendance(data);
    };
    
    // Refresh when tab becomes visible (user switches back to the tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTodayAttendance();
      }
    };
    
    window.addEventListener('attendanceUpdate', handleAttendanceUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('attendanceUpdate', handleAttendanceUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const response = await api.get("/attendance/today");
      setTodayAttendance(response.data);
      
      // Check if on break
      if (response.data && response.data.breaks && response.data.breaks.length > 0) {
        const lastBreak = response.data.breaks[response.data.breaks.length - 1];
        setIsOnBreak(lastBreak.startTime && !lastBreak.endTime);
      } else {
        setIsOnBreak(false);
      }
    } catch (error) {
      // No attendance for today yet or access denied
      // Silently handle - user might not have clocked in yet
      console.log("No attendance record for today or access denied");
      setTodayAttendance(null);
      setIsOnBreak(false);
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const response = await api.post("/attendance/clock-in");
      toast.clockIn();
      // Update state immediately for real-time UI update
      const attendanceData = response.data.attendance || response.data;
      setTodayAttendance(attendanceData);
      setShowConfirm(false);
      
      // Trigger event for other components to update
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockIn', data: attendanceData } 
      }));
    } catch (error) {
      console.error("Clock in error:", error);
      const errorType = error.response?.data?.type;
      const clockInTime = error.response?.data?.clockInTime;
      
      if (errorType === 'already_clocked_in') {
        const time = clockInTime ? new Date(clockInTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) : null;
        toast.alreadyClockedIn(time);
        // Refresh attendance data
        fetchTodayAttendance();
      } else {
        const errorMessage = error.response?.data?.message || "Failed to clock in. Please try again.";
        toast.error(errorMessage);
      }
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const response = await api.post("/attendance/clock-out");
      toast.clockOut();
      // Update state immediately for real-time UI update
      const attendanceData = response.data.attendance || response.data;
      setTodayAttendance(attendanceData);
      setIsOnBreak(false);
      setShowConfirm(false);
      
      // Trigger event for other components to update
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockOut', data: attendanceData } 
      }));
    } catch (error) {
      console.error("Clock out error:", error);
      const errorType = error.response?.data?.type;
      const clockOutTime = error.response?.data?.clockOutTime;
      const workLogRequired = error.response?.data?.workLogRequired;
      
      if (workLogRequired) {
        // Show work log modal instead of error
        setShowConfirm(false);
        setShowWorkLogModal(true);
      } else if (errorType === 'already_clocked_out') {
        const time = clockOutTime ? new Date(clockOutTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) : null;
        toast.alreadyClockedOut(time);
        // Refresh attendance data
        fetchTodayAttendance();
        setShowConfirm(false);
      } else if (errorType === 'not_clocked_in') {
        toast.notClockedIn();
        setShowConfirm(false);
      } else {
        const errorMessage = error.response?.data?.message || "Failed to clock out. Please try again.";
        toast.error(errorMessage);
        setShowConfirm(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setLoading(true);
    try {
      const response = await api.post("/attendance/start-break");
      toast.success("Break started");
      const attendanceData = response.data.attendance || response.data;
      setTodayAttendance(attendanceData);
      setIsOnBreak(true);
      setShowConfirm(false);
      
      // Trigger event for other components to update
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'startBreak', data: attendanceData } 
      }));
    } catch (error) {
      console.error("Start break error:", error);
      const errorMessage = error.response?.data?.message || "Failed to start break. Please try again.";
      toast.error(errorMessage);
      setShowConfirm(false);
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
      setIsOnBreak(false);
      setShowConfirm(false);
      
      // Trigger event for other components to update
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'endBreak', data: attendanceData } 
      }));
    } catch (error) {
      console.error("End break error:", error);
      const errorMessage = error.response?.data?.message || "Failed to end break. Please try again.";
      toast.error(errorMessage);
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkLogSubmit = async (workLog) => {
    // After work log is submitted, proceed with clock-out
    try {
      setLoading(true);
      const response = await api.post("/attendance/clock-out");
      toast.clockOut();
      const attendanceData = response.data.attendance || response.data;
      setTodayAttendance(attendanceData);
      setIsOnBreak(false);
      
      // Trigger event for other components to update
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockOut', data: attendanceData } 
      }));
      
      setShowWorkLogModal(false);
    } catch (error) {
      console.error("Error clocking out after work log:", error);
      toast.error("Failed to clock out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWorkLogSkip = async () => {
    // Manager skip - proceed with clock-out without work log
    try {
      setLoading(true);
      const response = await api.post("/attendance/clock-out");
      toast.clockOut();
      const attendanceData = response.data.attendance || response.data;
      setTodayAttendance(attendanceData);
      setIsOnBreak(false);
      
      // Trigger event for other components to update
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockOut', data: attendanceData } 
      }));
      
      setShowWorkLogModal(false);
    } catch (error) {
      console.error("Error clocking out (skip):", error);
      toast.error("Failed to clock out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (actionType) => {
    console.log('[CLOCK-BTN] Opening confirm dialog for action:', actionType);
    setAction(actionType);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    console.log('[CLOCK-BTN] Confirm action:', action);
    setShowConfirm(false); // Close modal before action
    if (action === "in") {
      handleClockIn();
    } else if (action === "out") {
      handleClockOut();
    } else if (action === "startBreak") {
      handleStartBreak();
    } else if (action === "endBreak") {
      handleEndBreak();
    }
  };

  const isClockedIn = todayAttendance && todayAttendance.clockIn && !todayAttendance.clockOut;
  const isClockedOut = todayAttendance && todayAttendance.clockOut;
  const notClockedIn = !todayAttendance || !todayAttendance.clockIn;

  return (
    <>
      <div className="d-flex align-items-center" style={{ flexWrap: 'nowrap', gap: showLabel ? '0.5rem' : '0.25rem' }}>
        <Button
          variant={variant}
          size={size}
          className={`d-flex align-items-center clock-btn ${
            isClockedOut ? 'clock-btn-disabled' : isClockedIn ? 'clock-btn-out' : 'clock-btn-in'
          }`}
          onClick={() => {
            console.log('[CLOCK-BTN] Button clicked', { isClockedIn, isClockedOut, loading });
            openConfirmDialog(isClockedIn ? "out" : "in");
          }}
          disabled={loading || isClockedOut}
          style={
            variant === "light"
              ? {
                  backgroundColor: isClockedOut 
                    ? "rgba(52, 58, 64, 0.4)" 
                    : isClockedIn 
                    ? "rgba(220, 53, 69, 0.35)" 
                    : "rgba(16, 185, 129, 0.35)",
                  border: "2px solid",
                  borderColor: isClockedOut
                    ? "rgba(108, 117, 125, 0.6)"
                    : isClockedIn
                    ? "rgba(220, 53, 69, 0.9)"
                    : "rgba(16, 185, 129, 0.9)",
                  color: "white",
                  fontWeight: "600",
                  boxShadow: isClockedOut
                    ? "none"
                    : isClockedIn
                    ? "0 0 20px rgba(220, 53, 69, 0.5)"
                    : "0 0 20px rgba(16, 185, 129, 0.5)",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden",
                }
              : {
                  // Styles for primary variant
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden",
                }
          }
        >
          {loading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <>
              <span className="clock-icon-wrapper">
                {isClockedIn ? (
                  <FaSignOutAlt className={showLabel ? "me-2" : ""} />
                ) : (
                  <FaSignInAlt className={showLabel ? "me-2" : ""} />
                )}
              </span>
              {showLabel && (
                <span className="clock-label">
                  {isClockedOut
                    ? "Clocked Out"
                    : isClockedIn
                    ? "Clock Out"
                    : "Clock In"}
                </span>
              )}
            </>
          )}
        </Button>

        {/* Break/Pause Button - Only show when clocked in and not clocked out */}
        {isClockedIn && !isClockedOut && (
          <Button
            variant={variant}
            size={size}
            className={`d-flex align-items-center clock-btn ${
              isOnBreak ? 'clock-btn-resume' : 'clock-btn-break'
            }`}
            onClick={() => openConfirmDialog(isOnBreak ? "endBreak" : "startBreak")}
            disabled={loading}
            style={
              variant === "light"
                ? {
                    backgroundColor: isOnBreak 
                      ? "rgba(255, 193, 7, 0.35)" 
                      : "rgba(255, 152, 0, 0.35)",
                    border: "2px solid",
                    borderColor: isOnBreak
                      ? "rgba(255, 193, 7, 0.9)"
                      : "rgba(255, 152, 0, 0.9)",
                    color: "white",
                    fontWeight: "600",
                    boxShadow: isOnBreak
                      ? "0 0 20px rgba(255, 193, 7, 0.5)"
                      : "0 0 20px rgba(255, 152, 0, 0.5)",
                    transition: "all 0.3s ease",
                    position: "relative",
                    overflow: "hidden",
                  }
                : {}
            }
          >
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <>
                <span className="clock-icon-wrapper">
                  {isOnBreak ? (
                    <FaPlay className={showLabel ? "me-2" : ""} />
                  ) : (
                    <FaPause className={showLabel ? "me-2" : ""} />
                  )}
                </span>
                {showLabel && (
                  <span className="clock-label">
                    {isOnBreak ? "Resume" : "Break"}
                  </span>
                )}
              </>
            )}
          </Button>
        )}

        {/* Overtime Timer - Show when clocked out OR not clocked in */}
        {(isClockedOut || notClockedIn) && (
          <OvertimeTimer 
            variant={variant} 
            size={size} 
            showLabel={showLabel}
          />
        )}
      </div>
      
      <style>{`
        .clock-btn {
          position: relative;
          overflow: hidden;
        }
        
        .clock-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        
        .clock-btn:hover::before {
          width: 300px;
          height: 300px;
        }
        
        .clock-btn-in:hover:not(:disabled) {
          background-color: rgba(16, 185, 129, 0.5) !important;
          border-color: rgba(16, 185, 129, 1) !important;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.7) !important;
          transform: translateY(-2px);
        }
        
        .clock-btn-out:hover:not(:disabled) {
          background-color: rgba(220, 53, 69, 0.5) !important;
          border-color: rgba(220, 53, 69, 1) !important;
          box-shadow: 0 0 30px rgba(220, 53, 69, 0.7) !important;
          transform: translateY(-2px);
        }

        .clock-btn-break:hover:not(:disabled) {
          background-color: rgba(255, 152, 0, 0.5) !important;
          border-color: rgba(255, 152, 0, 1) !important;
          box-shadow: 0 0 30px rgba(255, 152, 0, 0.7) !important;
          transform: translateY(-2px);
        }

        .clock-btn-resume:hover:not(:disabled) {
          background-color: rgba(255, 193, 7, 0.5) !important;
          border-color: rgba(255, 193, 7, 1) !important;
          box-shadow: 0 0 30px rgba(255, 193, 7, 0.7) !important;
          transform: translateY(-2px);
        }
        
        .clock-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.95);
        }
        
        .clock-icon-wrapper {
          position: relative;
          z-index: 1;
          display: inline-flex;
          animation: pulse 2s ease-in-out infinite;
        }
        
        .clock-btn-in .clock-icon-wrapper {
          animation: pulse-green 2s ease-in-out infinite;
        }
        
        .clock-btn-out .clock-icon-wrapper {
          animation: pulse-red 2s ease-in-out infinite;
        }

        .clock-btn-break .clock-icon-wrapper {
          animation: pulse-orange 2s ease-in-out infinite;
        }

        .clock-btn-resume .clock-icon-wrapper {
          animation: pulse-yellow 2s ease-in-out infinite;
        }

        .clock-btn-overtime:hover:not(:disabled) {
          background-color: rgba(13, 110, 253, 0.5) !important;
          border-color: rgba(13, 110, 253, 1) !important;
          box-shadow: 0 0 30px rgba(13, 110, 253, 0.7) !important;
          transform: translateY(-2px);
        }

        .clock-btn-overtime .clock-icon-wrapper {
          animation: pulse-blue 2s ease-in-out infinite;
        }
        
        .clock-label {
          position: relative;
          z-index: 1;
        }
        
        @keyframes pulse-green {
          0%, 100% {
            filter: drop-shadow(0 0 3px rgba(16, 185, 129, 0.9));
          }
          50% {
            filter: drop-shadow(0 0 10px rgba(16, 185, 129, 1));
          }
        }
        
        @keyframes pulse-red {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(220, 53, 69, 0.8));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(220, 53, 69, 1));
          }
        }

        @keyframes pulse-orange {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(255, 152, 0, 0.8));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(255, 152, 0, 1));
          }
        }

        @keyframes pulse-yellow {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(255, 193, 7, 0.8));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(255, 193, 7, 1));
          }
        }

        @keyframes pulse-blue {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(13, 110, 253, 0.8));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(13, 110, 253, 1));
          }
        }
        
        .clock-btn-disabled {
          cursor: not-allowed;
          opacity: 0.7;
          background-color: rgba(52, 58, 64, 0.4) !important;
          border-color: rgba(108, 117, 125, 0.6) !important;
          box-shadow: none !important;
        }
        
        .clock-btn-disabled .clock-icon-wrapper {
          animation: none;
          filter: grayscale(100%);
        }
        
        .clock-btn-disabled .clock-label {
          opacity: 0.8;
        }
      `}</style>

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
            {action === "in" ? "Clock In" : action === "out" ? "Clock Out" : action === "startBreak" ? "Start Break" : "Resume Work"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <FaClock className="text-primary fs-1 mb-3" />
            <h5>
              {action === "in"
                ? "Are you ready to start your workday?"
                : action === "out"
                ? "Are you done for the day?"
                : action === "startBreak"
                ? "Taking a break?"
                : "Ready to resume work?"}
            </h5>
            <p className="text-muted">
              {action === "in"
                ? "This will record your clock-in time."
                : action === "out"
                ? "This will record your clock-out time and calculate your work hours."
                : action === "startBreak"
                ? "This will start tracking your break time."
                : "This will end your break and resume work time tracking."}
            </p>
            {todayAttendance?.clockIn && action === "out" && (
              <div className="alert alert-info">
                <strong>Clock In Time:</strong>{" "}
                {new Date(todayAttendance.clockIn).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false
                })}
              </div>
            )}
            {todayAttendance?.totalBreakTime > 0 && (action === "out" || action === "endBreak") && (
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
            variant={action === "in" ? "success" : action === "out" ? "danger" : action === "startBreak" ? "warning" : "info"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : action === "in" ? (
              "Clock In"
            ) : action === "out" ? (
              "Clock Out"
            ) : action === "startBreak" ? (
              "Start Break"
            ) : (
              "Resume Work"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Work Log Submission Modal */}
      <WorkLogSubmissionModal
        show={showWorkLogModal}
        onHide={() => setShowWorkLogModal(false)}
        onSubmit={handleWorkLogSubmit}
        onSkip={handleWorkLogSkip}
      />
    </>
  );
};

export default QuickClockInOut;
