import { useState, useEffect } from 'react';
import { Button, Card, Modal, Form, Spinner, Tabs, Tab } from 'react-bootstrap';
import { FaClock, FaPlay, FaStop, FaEdit } from 'react-icons/fa';
import toast from '../../utils/toast';
import {
  startOvertimeTimer,
  stopOvertimeTimer,
  getActiveOvertimeTimer,
  addOvertimeEntry,
} from '../../api/overtimeApi';

const OvertimeTimer = ({ variant = 'primary', size = 'md', showLabel = true }) => {
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' or 'manual'
  const [formData, setFormData] = useState({
    reason: '',
    taskReference: '',
  });
  const [manualFormData, setManualFormData] = useState({
    startTime: '',
    endTime: '',
    reason: '',
    taskReference: '',
  });

  useEffect(() => {
    fetchActiveTimer();
  }, []);

  useEffect(() => {
    let interval;
    if (activeTimer) {
      interval = setInterval(() => {
        const start = new Date(activeTimer.startTime);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000); // seconds
        setElapsedTime(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const fetchActiveTimer = async () => {
    try {
      const response = await getActiveOvertimeTimer();
      setActiveTimer(response.activeTimer);
      if (response.activeTimer) {
        const start = new Date(response.activeTimer.startTime);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        setElapsedTime(diff);
      }
    } catch (error) {
      console.error('Error fetching active timer:', error);
    }
  };

  const handleStartTimer = async () => {
    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for overtime');
      return;
    }

    setLoading(true);
    try {
      const response = await startOvertimeTimer(formData.reason, formData.taskReference);
      setActiveTimer(response.entry);
      setElapsedTime(0);
      setShowStartModal(false);
      setFormData({ reason: '', taskReference: '' });
      toast.success('Overtime timer started!');
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error(error.response?.data?.message || 'Failed to start overtime timer');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTimer = async () => {
    setLoading(true);
    try {
      const response = await stopOvertimeTimer(activeTimer._id);
      toast.success(`Overtime stopped: ${response.entry.duration} hours logged`);
      setActiveTimer(null);
      setElapsedTime(0);
      setShowStopModal(false);
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error(error.response?.data?.message || 'Failed to stop overtime timer');
    } finally {
      setLoading(false);
    }
  };

  const calculateManualDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = (end - start) / (1000 * 60 * 60);
    return hours > 0 ? hours.toFixed(2) : 0;
  };

  const setQuickManualTime = (hoursAgo) => {
    const now = new Date();
    const endTime = formatDateTimeLocal(now);
    
    const startDate = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const startTime = formatDateTimeLocal(startDate);
    
    setManualFormData({
      ...manualFormData,
      startTime,
      endTime,
    });
  };

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleManualEntry = async () => {
    if (!manualFormData.reason.trim() || !manualFormData.startTime || !manualFormData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    const duration = calculateManualDuration(manualFormData.startTime, manualFormData.endTime);
    if (duration <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    if (duration > 12) {
      toast.error('Overtime duration cannot exceed 12 hours');
      return;
    }

    setLoading(true);
    try {
      // Get today's date for the attendance record
      const today = new Date().toISOString().split('T')[0];
      
      await addOvertimeEntry({
        date: today,
        startTime: manualFormData.startTime,
        endTime: manualFormData.endTime,
        reason: manualFormData.reason,
        taskReference: manualFormData.taskReference,
      });

      toast.success('Overtime logged successfully! Pending approval.');
      setManualFormData({
        startTime: '',
        endTime: '',
        reason: '',
        taskReference: '',
      });
      setShowStartModal(false);
      setActiveTab('timer'); // Reset to timer tab
    } catch (error) {
      console.error('Error logging overtime:', error);
      toast.error(error.response?.data?.message || 'Failed to log overtime');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      secs
    ).padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <>
      {activeTimer ? (
        // Timer Running - Show elapsed time and stop button
        <div className="d-flex gap-2 align-items-center">
          <Card
            className="border-0 shadow-sm mb-0"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            <Card.Body className="p-2 px-3">
              <div className="d-flex align-items-center gap-2">
                <FaClock className="text-white" style={{ fontSize: '1.2rem' }} />
                <div className="text-white">
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: 1 }}>
                    {formatTime(elapsedTime)}
                  </div>
                  <small style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                    Overtime Running
                  </small>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Button
            variant="danger"
            size={size}
            onClick={() => setShowStopModal(true)}
            disabled={loading}
            className="d-flex align-items-center"
          >
            <FaStop className={showLabel ? 'me-2' : ''} />
            {showLabel && 'Stop'}
          </Button>
        </div>
      ) : (
        // No Timer - Show start button
        <Button
          variant={variant}
          size={size}
          onClick={() => setShowStartModal(true)}
          disabled={loading}
          className="d-flex align-items-center"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          }}
        >
          <FaClock className={showLabel ? 'me-2' : ''} />
          {showLabel && 'Overtime'}
        </Button>
      )}

      {/* Start Timer Modal */}
      <Modal show={showStartModal} onHide={() => setShowStartModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaClock className="me-2 text-primary" />
            Log Overtime
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            {/* Live Timer Tab */}
            <Tab eventKey="timer" title={<><FaPlay className="me-2" />Live Timer</>}>
              <Form>
                <div className="alert alert-info mb-3">
                  <strong>Start a live timer</strong> - Perfect when you're starting work now
                </div>

                <Form.Group className="mb-3">
                  <Form.Label>
                    What are you working on? <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g., Urgent client video editing, Social media post design"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Project/Task Reference (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.taskReference}
                    onChange={(e) => setFormData({ ...formData, taskReference: e.target.value })}
                    placeholder="e.g., Project ABC, Client XYZ"
                  />
                </Form.Group>

                <div className="alert alert-success mb-0">
                  <small>
                    <strong>How it works:</strong> Timer will start immediately and track your work time. 
                    You can stop it anytime when you're done.
                  </small>
                </div>
              </Form>
            </Tab>

            {/* Manual Entry Tab */}
            <Tab eventKey="manual" title={<><FaEdit className="me-2" />Manual Entry</>}>
              <Form>
                <div className="alert alert-info mb-3">
                  <strong>Enter specific times</strong> - For work already completed
                </div>

                {/* Quick Presets for Manual Entry */}
                <div className="mb-3">
                  <Form.Label className="fw-bold">Quick Presets</Form.Label>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setQuickManualTime(0.5)}
                      type="button"
                    >
                      30 min ago
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setQuickManualTime(1)}
                      type="button"
                    >
                      1 hour ago
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setQuickManualTime(2)}
                      type="button"
                    >
                      2 hours ago
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setQuickManualTime(3)}
                      type="button"
                    >
                      3 hours ago
                    </Button>
                  </div>
                  <small className="text-muted">Or enter custom times below</small>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Start Time <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="datetime-local"
                        value={manualFormData.startTime}
                        onChange={(e) =>
                          setManualFormData({ ...manualFormData, startTime: e.target.value })
                        }
                      />
                      <Form.Text className="text-muted">
                        Select date and time when you started
                      </Form.Text>
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>
                        End Time <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="datetime-local"
                        value={manualFormData.endTime}
                        onChange={(e) =>
                          setManualFormData({ ...manualFormData, endTime: e.target.value })
                        }
                      />
                      <Form.Text className="text-muted">
                        Select date and time when you finished
                      </Form.Text>
                    </Form.Group>
                  </div>
                </div>

                {manualFormData.startTime && manualFormData.endTime && (
                  <div className="alert alert-success mb-3">
                    <strong>Duration:</strong>{' '}
                    {calculateManualDuration(manualFormData.startTime, manualFormData.endTime)} hours
                  </div>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>
                    Reason / Description <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={manualFormData.reason}
                    onChange={(e) =>
                      setManualFormData({ ...manualFormData, reason: e.target.value })
                    }
                    placeholder="e.g., Urgent social media post for client, Video editing for campaign"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Task/Project Reference (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={manualFormData.taskReference}
                    onChange={(e) =>
                      setManualFormData({ ...manualFormData, taskReference: e.target.value })
                    }
                    placeholder="e.g., Project name, client name, task ID"
                  />
                </Form.Group>
              </Form>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStartModal(false)}>
            Cancel
          </Button>
          {activeTab === 'timer' ? (
            <Button
              variant="primary"
              onClick={handleStartTimer}
              disabled={loading || !formData.reason.trim()}
            >
              {loading ? <Spinner animation="border" size="sm" /> : <><FaPlay className="me-2" />Start Timer</>}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleManualEntry}
              disabled={
                loading ||
                !manualFormData.reason.trim() ||
                !manualFormData.startTime ||
                !manualFormData.endTime
              }
            >
              {loading ? <Spinner animation="border" size="sm" /> : 'Submit Overtime'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Stop Timer Modal */}
      <Modal show={showStopModal} onHide={() => setShowStopModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaStop className="me-2 text-danger" />
            Stop Overtime Timer
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <div
              className="mb-3"
              style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: '#667eea',
              }}
            >
              {formatTime(elapsedTime)}
            </div>
            <h5>Duration: {formatDuration(elapsedTime)}</h5>
            {activeTimer && (
              <div className="mt-3">
                <p className="text-muted mb-1">
                  <strong>Task:</strong> {activeTimer.reason}
                </p>
                {activeTimer.taskReference && (
                  <p className="text-muted mb-0">
                    <strong>Reference:</strong> {activeTimer.taskReference}
                  </p>
                )}
              </div>
            )}
            <div className="alert alert-warning mt-3 mb-0">
              <small>
                This overtime will be submitted for approval. Your manager will review it.
              </small>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStopModal(false)}>
            Keep Running
          </Button>
          <Button variant="danger" onClick={handleStopTimer} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Stop & Submit'}
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(102, 126, 234, 0.8);
          }
        }
      `}</style>
    </>
  );
};

export default OvertimeTimer;
