import { useState, useEffect } from "react";
import { Button, Spinner, Modal } from "react-bootstrap";
import { FaClock, FaSignInAlt, FaSignOutAlt } from "react-icons/fa";
import toast from "../../utils/toast";
import api from "../../services/api";

const QuickClockInOut = ({ variant = "light", size = "sm", showLabel = true }) => {
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [action, setAction] = useState(null);

  useEffect(() => {
    fetchTodayAttendance();
    
    // Poll for attendance updates every 30 seconds
    const pollInterval = setInterval(() => {
      fetchTodayAttendance();
    }, 30000);
    
    // Listen for attendance updates from other components
    const handleAttendanceUpdate = (event) => {
      const { data } = event.detail;
      setTodayAttendance(data);
    };
    
    window.addEventListener('attendanceUpdate', handleAttendanceUpdate);
    
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('attendanceUpdate', handleAttendanceUpdate);
    };
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const response = await api.get("/attendance/today");
      setTodayAttendance(response.data);
    } catch (error) {
      // No attendance for today yet
      setTodayAttendance(null);
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
        const time = clockInTime ? new Date(clockInTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
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
      setShowConfirm(false);
      
      // Trigger event for other components to update
      window.dispatchEvent(new CustomEvent('attendanceUpdate', { 
        detail: { type: 'clockOut', data: attendanceData } 
      }));
    } catch (error) {
      console.error("Clock out error:", error);
      const errorType = error.response?.data?.type;
      const clockOutTime = error.response?.data?.clockOutTime;
      
      if (errorType === 'already_clocked_out') {
        const time = clockOutTime ? new Date(clockOutTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }) : null;
        toast.alreadyClockedOut(time);
        // Refresh attendance data
        fetchTodayAttendance();
      } else if (errorType === 'not_clocked_in') {
        toast.notClockedIn();
      } else {
        const errorMessage = error.response?.data?.message || "Failed to clock out. Please try again.";
        toast.error(errorMessage);
      }
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (actionType) => {
    setAction(actionType);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (action === "in") {
      handleClockIn();
    } else {
      handleClockOut();
    }
  };

  const isClockedIn = todayAttendance && todayAttendance.clockIn && !todayAttendance.clockOut;
  const isClockedOut = todayAttendance && todayAttendance.clockOut;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`d-flex align-items-center clock-btn ${
          isClockedOut ? 'clock-btn-disabled' : isClockedIn ? 'clock-btn-out' : 'clock-btn-in'
        }`}
        onClick={() => openConfirmDialog(isClockedIn ? "out" : "in")}
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
            : {}
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
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {action === "in" ? "Clock In" : "Clock Out"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <FaClock className="text-primary fs-1 mb-3" />
            <h5>
              {action === "in"
                ? "Are you ready to start your workday?"
                : "Are you done for the day?"}
            </h5>
            <p className="text-muted">
              {action === "in"
                ? "This will record your clock-in time."
                : "This will record your clock-out time and calculate your work hours."}
            </p>
            {todayAttendance?.clockIn && action === "out" && (
              <div className="alert alert-info">
                <strong>Clock In Time:</strong>{" "}
                {new Date(todayAttendance.clockIn).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant={action === "in" ? "success" : "danger"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : action === "in" ? (
              "Clock In"
            ) : (
              "Clock Out"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default QuickClockInOut;
