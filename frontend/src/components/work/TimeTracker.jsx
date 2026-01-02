import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Badge, 
  Card, 
  Modal, 
  Form, 
  Alert,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { 
  FaPlay, 
  FaPause, 
  FaStop, 
  FaClock, 
  FaHistory,
  FaEdit,
  FaSave
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import moment from 'moment';

/**
 * Simple Time Tracking Component
 * Features:
 * - Start/stop/pause timers
 * - Manual time entry
 * - Time history tracking
 * - Local storage persistence
 * - Visual timer display
 */
const TimeTracker = ({ 
  workItemId, 
  workItemTitle = 'Work Item',
  initialTime = 0,
  onTimeUpdate,
  compact = false,
  showHistory = true
}) => {
  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(initialTime);
  const [startTime, setStartTime] = useState(null);
  const [pausedTime, setPausedTime] = useState(0);
  
  // UI state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [showHistory, setShowHistoryModal] = useState(false);
  
  // Time history
  const [timeEntries, setTimeEntries] = useState([]);

  // Storage keys
  const TIMER_KEY = `timer_${workItemId}`;
  const HISTORY_KEY = `time_history_${workItemId}`;

  // Load saved timer state on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem(TIMER_KEY);
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    
    if (savedTimer) {
      try {
        const timerData = JSON.parse(savedTimer);
        setElapsedTime(timerData.elapsedTime || 0);
        setIsRunning(timerData.isRunning || false);
        setIsPaused(timerData.isPaused || false);
        setStartTime(timerData.startTime ? new Date(timerData.startTime) : null);
        setPausedTime(timerData.pausedTime || 0);
      } catch (error) {
        console.error('Error loading timer state:', error);
      }
    }
    
    if (savedHistory) {
      try {
        setTimeEntries(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading time history:', error);
      }
    }
  }, [workItemId, TIMER_KEY, HISTORY_KEY]);

  // Save timer state to localStorage
  const saveTimerState = useCallback((state) => {
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  }, [TIMER_KEY]);

  // Save time history to localStorage
  const saveTimeHistory = useCallback((entries) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving time history:', error);
    }
  }, [HISTORY_KEY]);

  // Timer effect - runs every second when active
  useEffect(() => {
    let interval = null;
    
    if (isRunning && !isPaused && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const currentElapsed = Math.floor((now - startTime) / 1000) + pausedTime;
        setElapsedTime(currentElapsed);
        
        // Save state periodically
        saveTimerState({
          elapsedTime: currentElapsed,
          isRunning: true,
          isPaused: false,
          startTime: startTime.toISOString(),
          pausedTime
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, startTime, pausedTime, saveTimerState]);

  // Start timer
  const startTimer = useCallback(() => {
    const now = new Date();
    setStartTime(now);
    setIsRunning(true);
    setIsPaused(false);
    
    saveTimerState({
      elapsedTime,
      isRunning: true,
      isPaused: false,
      startTime: now.toISOString(),
      pausedTime: elapsedTime
    });
    
    toast.success(`⏱️ Timer started for ${workItemTitle}`);
  }, [elapsedTime, workItemTitle, saveTimerState]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (isRunning && startTime) {
      const now = new Date();
      const currentElapsed = Math.floor((now - startTime) / 1000) + pausedTime;
      
      setElapsedTime(currentElapsed);
      setPausedTime(currentElapsed);
      setIsPaused(true);
      setIsRunning(false);
      
      saveTimerState({
        elapsedTime: currentElapsed,
        isRunning: false,
        isPaused: true,
        startTime: null,
        pausedTime: currentElapsed
      });
      
      toast.info(`⏸️ Timer paused at ${formatTime(currentElapsed)}`);
    }
  }, [isRunning, startTime, pausedTime, workItemTitle, saveTimerState]);

  // Resume timer
  const resumeTimer = useCallback(() => {
    if (isPaused) {
      const now = new Date();
      setStartTime(now);
      setIsRunning(true);
      setIsPaused(false);
      
      saveTimerState({
        elapsedTime,
        isRunning: true,
        isPaused: false,
        startTime: now.toISOString(),
        pausedTime: elapsedTime
      });
      
      toast.success(`▶️ Timer resumed for ${workItemTitle}`);
    }
  }, [isPaused, elapsedTime, workItemTitle, saveTimerState]);

  // Stop timer and save entry
  const stopTimer = useCallback(() => {
    if (isRunning || isPaused) {
      const finalTime = isRunning && startTime 
        ? Math.floor((new Date() - startTime) / 1000) + pausedTime
        : elapsedTime;
      
      // Create time entry
      const timeEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        duration: finalTime,
        note: `Work session - ${formatTime(finalTime)}`,
        type: 'timer'
      };
      
      // Add to history
      const newEntries = [timeEntry, ...timeEntries];
      setTimeEntries(newEntries);
      saveTimeHistory(newEntries);
      
      // Reset timer
      setIsRunning(false);
      setIsPaused(false);
      setElapsedTime(0);
      setStartTime(null);
      setPausedTime(0);
      
      // Clear saved state
      localStorage.removeItem(TIMER_KEY);
      
      // Notify parent component
      if (onTimeUpdate) {
        onTimeUpdate(finalTime, timeEntry);
      }
      
      toast.success(`✅ Time logged: ${formatTime(finalTime)} for ${workItemTitle}`);
    }
  }, [isRunning, isPaused, startTime, pausedTime, elapsedTime, timeEntries, workItemTitle, onTimeUpdate, saveTimeHistory, TIMER_KEY]);

  // Add manual time entry
  const addManualTime = useCallback(() => {
    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const totalSeconds = (hours * 3600) + (minutes * 60);
    
    if (totalSeconds <= 0) {
      toast.error('Please enter a valid time duration');
      return;
    }
    
    const timeEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      duration: totalSeconds,
      note: manualNote || `Manual entry - ${formatTime(totalSeconds)}`,
      type: 'manual'
    };
    
    const newEntries = [timeEntry, ...timeEntries];
    setTimeEntries(newEntries);
    saveTimeHistory(newEntries);
    
    // Notify parent component
    if (onTimeUpdate) {
      onTimeUpdate(totalSeconds, timeEntry);
    }
    
    // Reset form
    setManualHours('');
    setManualMinutes('');
    setManualNote('');
    setShowManualEntry(false);
    
    toast.success(`✅ Manual time added: ${formatTime(totalSeconds)}`);
  }, [manualHours, manualMinutes, manualNote, timeEntries, onTimeUpdate, saveTimeHistory]);

  // Format time display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Get total time from history
  const getTotalTime = () => {
    return timeEntries.reduce((total, entry) => total + entry.duration, 0);
  };

  // Get timer status
  const getTimerStatus = () => {
    if (isRunning) return { text: 'Running', variant: 'success', icon: FaPlay };
    if (isPaused) return { text: 'Paused', variant: 'warning', icon: FaPause };
    return { text: 'Stopped', variant: 'secondary', icon: FaStop };
  };

  const status = getTimerStatus();

  if (compact) {
    return (
      <div className="d-flex align-items-center gap-2">
        <Badge bg={status.variant} className="d-flex align-items-center gap-1">
          <status.icon size={10} />
          {formatTime(elapsedTime)}
        </Badge>
        
        {!isRunning && !isPaused && (
          <Button variant="outline-success" size="sm" onClick={startTimer}>
            <FaPlay size={10} />
          </Button>
        )}
        
        {isRunning && (
          <Button variant="outline-warning" size="sm" onClick={pauseTimer}>
            <FaPause size={10} />
          </Button>
        )}
        
        {isPaused && (
          <Button variant="outline-success" size="sm" onClick={resumeTimer}>
            <FaPlay size={10} />
          </Button>
        )}
        
        {(isRunning || isPaused) && (
          <Button variant="outline-danger" size="sm" onClick={stopTimer}>
            <FaStop size={10} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <Card className="time-tracker-card">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaClock className="text-primary" />
            <span className="fw-bold">Time Tracker</span>
            <Badge bg={status.variant} className="d-flex align-items-center gap-1">
              <status.icon size={10} />
              {status.text}
            </Badge>
          </div>
          
          {showHistory && timeEntries.length > 0 && (
            <Button 
              variant="outline-info" 
              size="sm"
              onClick={() => setShowHistoryModal(true)}
            >
              <FaHistory /> History
            </Button>
          )}
        </Card.Header>
        
        <Card.Body>
          {/* Current Timer Display */}
          <div className="text-center mb-3">
            <div className="timer-display">
              <h2 className="mb-0 font-monospace text-primary">
                {formatTime(elapsedTime)}
              </h2>
              <small className="text-muted">Current Session</small>
            </div>
          </div>
          
          {/* Timer Controls */}
          <div className="d-flex justify-content-center gap-2 mb-3">
            {!isRunning && !isPaused && (
              <OverlayTrigger overlay={<Tooltip>Start Timer</Tooltip>}>
                <Button variant="success" onClick={startTimer}>
                  <FaPlay /> Start
                </Button>
              </OverlayTrigger>
            )}
            
            {isRunning && (
              <OverlayTrigger overlay={<Tooltip>Pause Timer</Tooltip>}>
                <Button variant="warning" onClick={pauseTimer}>
                  <FaPause /> Pause
                </Button>
              </OverlayTrigger>
            )}
            
            {isPaused && (
              <OverlayTrigger overlay={<Tooltip>Resume Timer</Tooltip>}>
                <Button variant="success" onClick={resumeTimer}>
                  <FaPlay /> Resume
                </Button>
              </OverlayTrigger>
            )}
            
            {(isRunning || isPaused) && (
              <OverlayTrigger overlay={<Tooltip>Stop and Save</Tooltip>}>
                <Button variant="danger" onClick={stopTimer}>
                  <FaStop /> Stop & Save
                </Button>
              </OverlayTrigger>
            )}
          </div>
          
          {/* Manual Time Entry */}
          <div className="text-center">
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => setShowManualEntry(true)}
            >
              <FaEdit /> Add Manual Time
            </Button>
          </div>
          
          {/* Total Time Summary */}
          {timeEntries.length > 0 && (
            <div className="mt-3 pt-3 border-top text-center">
              <small className="text-muted">Total Time Logged</small>
              <div className="fw-bold text-success">
                {formatTime(getTotalTime())}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Manual Time Entry Modal */}
      <Modal show={showManualEntry} onHide={() => setShowManualEntry(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Manual Time</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row mb-3">
              <div className="col-6">
                <Form.Label>Hours</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="24"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="col-6">
                <Form.Label>Minutes</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="59"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            
            <Form.Group className="mb-3">
              <Form.Label>Note (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Description of work done..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowManualEntry(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={addManualTime}>
            <FaSave /> Add Time
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Time History Modal */}
      <Modal show={showHistory} onHide={() => setShowHistoryModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Time History</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {timeEntries.length === 0 ? (
            <Alert variant="info">
              No time entries yet. Start tracking time to see your history here.
            </Alert>
          ) : (
            <div className="time-history">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="d-flex justify-content-between align-items-center p-2 border-bottom">
                  <div>
                    <div className="fw-bold">{formatTime(entry.duration)}</div>
                    <small className="text-muted">
                      {moment(entry.date).format('MMM DD, YYYY HH:mm')}
                    </small>
                    {entry.note && (
                      <div className="small text-secondary">{entry.note}</div>
                    )}
                  </div>
                  <Badge bg={entry.type === 'timer' ? 'primary' : 'secondary'}>
                    {entry.type}
                  </Badge>
                </div>
              ))}
              
              <div className="mt-3 pt-3 border-top text-center">
                <strong>Total: {formatTime(getTotalTime())}</strong>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default TimeTracker;