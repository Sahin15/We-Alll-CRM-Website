import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Modal, Spinner } from "react-bootstrap";
import { FaClock } from "react-icons/fa";
import toast from "../../utils/toast";
import api from "../../services/api";

// ─── Session cache helpers ────────────────────────────────────────────────────
const CACHE_KEY = "attendance_today_cache";

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    // Treat cache as fresh for up to 60 seconds
    if (Date.now() - ts < 60_000) return data;
    return null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}

// ─── Timer calculation helpers ────────────────────────────────────────────────
function calcWorkSeconds(attendance) {
  if (!attendance?.clockIn) return 0;
  const clockInMs = new Date(attendance.clockIn).getTime();
  const totalBreakMs = (attendance.breaks || []).reduce((acc, b) => {
    if (b.startTime && b.endTime) return acc + (new Date(b.endTime) - new Date(b.startTime));
    return acc;
  }, 0);
  return Math.max(0, Math.floor((Date.now() - clockInMs - totalBreakMs) / 1000));
}

function calcBreakSeconds(attendance) {
  const breaks = attendance?.breaks || [];
  const active = breaks.find(b => b.startTime && !b.endTime);
  if (!active) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(active.startTime).getTime()) / 1000));
}

function getTimerType(attendance) {
  if (!attendance?.clockIn) return null;
  if (attendance.clockOut) return null;
  const breaks = attendance.breaks || [];
  const onBreak = breaks.some(b => b.startTime && !b.endTime);
  return onBreak ? "break" : "work";
}

function secondsToHMS(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { hours: h, minutes: m, seconds: s };
}

// ─── Component ────────────────────────────────────────────────────────────────
const BreakTimer = () => {
  // Initialise from cache immediately — no blank flash on login
  const [todayAttendance, setTodayAttendance] = useState(() => readCache());
  const [seconds, setSeconds] = useState(() => {
    const cached = readCache();
    if (!cached) return 0;
    const type = getTimerType(cached);
    if (type === "work") return calcWorkSeconds(cached);
    if (type === "break") return calcBreakSeconds(cached);
    return 0;
  });
  const [timerType, setTimerType] = useState(() => getTimerType(readCache()));
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [action, setAction] = useState(null);

  const intervalRef = useRef(null);

  // ── Start / restart the tick interval ──────────────────────────────────────
  const startInterval = useCallback((type) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (type === "work" || type === "break") {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
  }, []);

  // ── Apply new attendance data (from API or action response) ────────────────
  const applyAttendance = useCallback((data, immediate = false) => {
    setTodayAttendance(data);
    writeCache(data);

    const type = getTimerType(data);
    setTimerType(type);

    if (type === "work") {
      const s = calcWorkSeconds(data);
      setSeconds(s);
      startInterval("work");
    } else if (type === "break") {
      const s = calcBreakSeconds(data);
      setSeconds(s);
      startInterval("break");
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSeconds(0);
    }
  }, [startInterval]);

  // ── Fetch from API ──────────────────────────────────────────────────────────
  const fetchTodayAttendance = useCallback(async () => {
    try {
      const response = await api.get("/attendance/today");
      applyAttendance(response.data);
    } catch {
      setTodayAttendance(null);
      setTimerType(null);
      setSeconds(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearCache();
    }
  }, [applyAttendance]);

  // ── Mount: start interval from cache immediately, then fetch fresh data ────
  useEffect(() => {
    // If we loaded from cache, start ticking right away
    const cached = readCache();
    if (cached) {
      const type = getTimerType(cached);
      startInterval(type);
    }

    // Fetch fresh data (will update seconds/type if different)
    fetchTodayAttendance();

    // Poll every 30s (not 3s — the local interval handles per-second updates)
    const pollId = setInterval(fetchTodayAttendance, 30_000);

    // Listen for cross-component attendance updates
    const handleUpdate = (e) => applyAttendance(e.detail.data, true);
    window.addEventListener("attendanceUpdate", handleUpdate);

    return () => {
      clearInterval(pollId);
      clearInterval(intervalRef.current);
      window.removeEventListener("attendanceUpdate", handleUpdate);
    };
  }, [fetchTodayAttendance, applyAttendance, startInterval]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const openConfirmDialog = (actionType) => {
    setAction(actionType);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    if (action === "startBreak") handleStartBreak();
    else if (action === "endBreak") handleEndBreak();
  };

  const handleStartBreak = async () => {
    setLoading(true);
    try {
      const response = await api.post("/attendance/start-break");
      toast.success("Break started");
      const data = response.data.attendance || response.data;
      // Apply immediately — timer switches to break mode without any delay
      applyAttendance(data, true);
      window.dispatchEvent(new CustomEvent("attendanceUpdate", {
        detail: { type: "startBreak", data }
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
      const data = response.data.attendance || response.data;
      // Apply immediately — timer switches back to work mode without any delay
      applyAttendance(data, true);
      window.dispatchEvent(new CustomEvent("attendanceUpdate", {
        detail: { type: "endBreak", data }
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to end break");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!timerType) return null;

  const { hours, minutes, seconds: secs } = secondsToHMS(seconds);
  const isBreak = timerType === "break";

  const accentGradient = isBreak
    ? "linear-gradient(135deg, #ff9800 0%, #ff5722 100%)"
    : "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)";

  const icon = isBreak ? "☕" : "💼";
  const label = isBreak ? "BREAK TIME" : "WORK TIME";

  const clockInTime = todayAttendance?.clockIn
    ? new Date(todayAttendance.clockIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "";
  const breaks = todayAttendance?.breaks || [];
  const completedBreaks = breaks.filter(b => b.startTime && b.endTime).length;
  let totalBreakMinutes = 0;
  breaks.forEach(b => {
    if (b.startTime && b.endTime)
      totalBreakMinutes += Math.floor((new Date(b.endTime) - new Date(b.startTime)) / 60000);
  });

  const activeBreakStart = isBreak
    ? breaks.find(b => b.startTime && !b.endTime)?.startTime
    : null;

  return (
    <div
      className="timer-card-floating-container"
      style={{ position: "absolute", top: "20px", right: "20px", width: "220px", zIndex: 20 }}
    >
      <style>{`
        @keyframes pulse-glow-glass {
          0%, 100% { box-shadow: 0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2); }
          50%       { box-shadow: 0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3); }
        }
        @keyframes accent-pulse {
          0%, 100% { box-shadow: 0 2px 12px ${isBreak ? "rgba(255,152,0,0.6)" : "rgba(76,175,80,0.6)"}; }
          50%       { box-shadow: 0 4px 20px ${isBreak ? "rgba(255,152,0,0.9)" : "rgba(76,175,80,0.9)"}; }
        }
        @keyframes pulse-resume {
          0%, 100% { box-shadow: 0 2px 8px rgba(16,185,129,0.4); }
          50%       { box-shadow: 0 4px 16px rgba(16,185,129,0.7); }
        }
        .timer-card-floating {
          animation: pulse-glow-glass 2s ease-in-out infinite;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px) saturate(180%);
          -webkit-backdrop-filter: blur(10px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .timer-card-floating:hover { transform: translateY(-2px); }
        .timer-accent-header {
          background: ${accentGradient};
          padding: 6px 10px;
          border-radius: 8px 8px 0 0;
          margin: -8px -8px 8px -8px;
          animation: accent-pulse 2s ease-in-out infinite;
        }
        .timer-icon-badge {
          background: rgba(255,255,255,0.25);
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .timer-action-btn-compact {
          font-size: 1.2rem;
          padding: 6px 10px;
          border-radius: 8px;
          font-weight: 600;
          border: none;
          min-width: 40px;
          transition: all 0.2s ease;
        }
        .timer-action-btn-compact:hover { transform: scale(1.1); }
        .timer-action-btn-compact:active { transform: scale(0.95); }
        .timer-resume-btn { animation: pulse-resume 2s ease-in-out infinite; }
        .timer-info-text { font-size: 0.65rem; opacity: 0.95; line-height: 1.3; }
        @media (max-width: 768px) {
          .timer-card-floating-container {
            position: relative !important; top: 0 !important; right: 0 !important;
            width: 100% !important; margin-bottom: 15px !important;
          }
        }
      `}</style>

      <div className="timer-card-floating p-2 rounded-3">
        <div className="text-white">
          {/* Coloured header */}
          <div className="timer-accent-header">
            <div className="timer-icon-badge">
              <span style={{ fontSize: "1.1em", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>{icon}</span>
              <strong style={{ fontSize: "0.75rem", letterSpacing: "0.5px", textShadow: "0 2px 4px rgba(0,0,0,0.3)", fontWeight: 700 }}>
                {label}
              </strong>
            </div>
          </div>

          {/* Timer + action button */}
          <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
            <div
              className="d-flex justify-content-center align-items-center gap-1"
              style={{ fontSize: "1.3rem", fontWeight: "bold", fontFamily: "monospace", textShadow: "0 2px 8px rgba(0,0,0,0.4)", flex: 1 }}
            >
              <span>{String(hours).padStart(2, "0")}</span>
              <span style={{ opacity: 0.7 }}>:</span>
              <span>{String(minutes).padStart(2, "0")}</span>
              <span style={{ opacity: 0.7 }}>:</span>
              <span>{String(secs).padStart(2, "0")}</span>
            </div>

            {isBreak ? (
              <Button
                size="sm"
                className="timer-action-btn-compact timer-resume-btn"
                onClick={() => openConfirmDialog("endBreak")}
                disabled={loading}
                title="Resume Work"
                style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}
              >
                {loading ? "..." : "▶️"}
              </Button>
            ) : (
              <Button
                size="sm"
                className="timer-action-btn-compact"
                onClick={() => openConfirmDialog("startBreak")}
                disabled={loading}
                title="Start Break"
                style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white" }}
              >
                {loading ? "..." : "☕"}
              </Button>
            )}
          </div>

          {/* Info row */}
          <div
            className="timer-info-text text-center"
            style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "6px", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            {isBreak ? (
              <>
                <div>Started: {activeBreakStart ? new Date(activeBreakStart).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                <div className="mt-1">Breaks today: {completedBreaks + 1}</div>
              </>
            ) : (
              <>
                <div>Clocked in: {clockInTime}</div>
                {completedBreaks > 0 && <div className="mt-1">Breaks: {completedBreaks} ({totalBreakMinutes}m)</div>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title>{action === "startBreak" ? "Start Break" : "Resume Work"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <FaClock className="text-primary fs-1 mb-3" />
            <h5>{action === "startBreak" ? "Taking a break?" : "Ready to resume work?"}</h5>
            <p className="text-muted">
              {action === "startBreak"
                ? "This will start tracking your break time."
                : "This will end your break and resume work time tracking."}
            </p>
            {todayAttendance?.clockIn && (
              <div className="alert alert-info">
                <strong>Clock In Time:</strong>{" "}
                {new Date(todayAttendance.clockIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button
            variant={action === "startBreak" ? "warning" : "info"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : action === "startBreak" ? "Start Break" : "Resume Work"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BreakTimer;
