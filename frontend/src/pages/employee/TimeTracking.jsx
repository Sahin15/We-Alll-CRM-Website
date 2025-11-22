import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Badge, Modal } from 'react-bootstrap';
import { FaClock, FaPlay, FaStop, FaPlus } from 'react-icons/fa';
import toast from '../../utils/toast';
import api from '../../services/api';

const TimeTracking = () => {
  const [tasks, setTasks] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedTask, setSelectedTask] = useState('');
  const [manualEntry, setManualEntry] = useState({
    startTime: '',
    endTime: '',
    description: '',
  });
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    fetchTimeEntries();
  }, []);

  useEffect(() => {
    let interval;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks/my-tasks?status=in-progress');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      // Get today's time entries
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/tasks/my-tasks`);
      
      // Extract all time entries from all tasks
      const allEntries = [];
      response.data.forEach(task => {
        if (task.timeEntries && task.timeEntries.length > 0) {
          task.timeEntries.forEach(entry => {
            allEntries.push({
              ...entry,
              taskTitle: task.title,
              taskId: task._id,
            });
          });
        }
      });
      
      // Sort by date (newest first)
      allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTimeEntries(allEntries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (taskId) => {
    setActiveTimer({
      taskId,
      startTime: new Date(),
    });
    setTimerSeconds(0);
    toast.success('Timer started');
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    try {
      const endTime = new Date();
      await api.post(`/tasks/${activeTimer.taskId}/time-entries`, {
        startTime: activeTimer.startTime,
        endTime: endTime,
        description: 'Tracked time',
      });

      toast.success('Time logged successfully');
      setActiveTimer(null);
      setTimerSeconds(0);
      fetchTimeEntries();
    } catch (error) {
      console.error('Error logging time:', error);
      toast.error('Failed to log time');
    }
  };

  const handleManualEntry = async () => {
    if (!selectedTask || !manualEntry.startTime || !manualEntry.endTime) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await api.post(`/tasks/${selectedTask}/time-entries`, {
        startTime: new Date(manualEntry.startTime),
        endTime: new Date(manualEntry.endTime),
        description: manualEntry.description,
      });

      toast.success('Time entry added successfully');
      setShowManualEntry(false);
      setManualEntry({ startTime: '', endTime: '', description: '' });
      setSelectedTask('');
      fetchTimeEntries();
    } catch (error) {
      console.error('Error adding time entry:', error);
      toast.error('Failed to add time entry');
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTotalTimeToday = () => {
    const today = new Date().toDateString();
    const todayEntries = timeEntries.filter(
      entry => new Date(entry.date).toDateString() === today
    );
    const total = todayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    return formatDuration(total);
  };

  const getTotalTimeThisWeek = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weekEntries = timeEntries.filter(
      entry => new Date(entry.date) >= startOfWeek
    );
    const total = weekEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    return formatDuration(total);
  };

  const getTotalTimeThisMonth = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthEntries = timeEntries.filter(
      entry => new Date(entry.date) >= startOfMonth
    );
    const total = monthEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    return formatDuration(total);
  };

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Time Tracking</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => setShowManualEntry(true)}>
            <FaPlus className="me-2" />
            Add Manual Entry
          </Button>
        </Col>
      </Row>

      {/* Active Timer */}
      {activeTimer && (
        <Card className="mb-4 border-primary">
          <Card.Body>
            <Row className="align-items-center">
              <Col md={6}>
                <h5 className="mb-0">
                  <FaClock className="me-2 text-primary" />
                  Timer Running
                </h5>
                <p className="text-muted mb-0">
                  {tasks.find(t => t._id === activeTimer.taskId)?.title}
                </p>
              </Col>
              <Col md={4} className="text-center">
                <h2 className="mb-0 text-primary">{formatTime(timerSeconds)}</h2>
              </Col>
              <Col md={2} className="text-end">
                <Button variant="danger" onClick={stopTimer}>
                  <FaStop className="me-2" />
                  Stop
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Quick Timer Start */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Start Timer for Task</h5>
            </Card.Header>
            <Card.Body>
              {tasks.length === 0 ? (
                <p className="text-muted mb-0">No tasks in progress. Start a task to track time.</p>
              ) : (
                <Row>
                  {tasks.slice(0, 4).map(task => (
                    <Col md={6} lg={3} key={task._id} className="mb-3">
                      <Card className="h-100">
                        <Card.Body>
                          <h6 className="mb-2">{task.title}</h6>
                          <Badge bg={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info'}>
                            {task.priority}
                          </Badge>
                          <div className="mt-3">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => startTimer(task._id)}
                              disabled={activeTimer !== null}
                              className="w-100"
                            >
                              <FaPlay className="me-2" />
                              Start Timer
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Time Summary */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h6 className="text-muted">Today's Total</h6>
              <h3 className="mb-0">{getTotalTimeToday()}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h6 className="text-muted">This Week</h6>
              <h3 className="mb-0">{getTotalTimeThisWeek()}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h6 className="text-muted">This Month</h6>
              <h3 className="mb-0">{getTotalTimeThisMonth()}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Time Entries */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Recent Time Entries</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" />
            </div>
          ) : timeEntries.length === 0 ? (
            <p className="text-muted text-center py-4">No time entries yet. Start tracking your time!</p>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Task</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.slice(0, 20).map((entry, index) => (
                  <tr key={index}>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                    <td>{entry.taskTitle}</td>
                    <td>{new Date(entry.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{new Date(entry.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td><Badge bg="primary">{formatDuration(entry.duration)}</Badge></td>
                    <td>{entry.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Manual Entry Modal */}
      <Modal show={showManualEntry} onHide={() => setShowManualEntry(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Manual Time Entry</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Task</Form.Label>
              <Form.Select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
              >
                <option value="">Select a task</option>
                {tasks.map(task => (
                  <option key={task._id} value={task._id}>{task.title}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Start Time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={manualEntry.startTime}
                onChange={(e) => setManualEntry({ ...manualEntry, startTime: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>End Time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={manualEntry.endTime}
                onChange={(e) => setManualEntry({ ...manualEntry, endTime: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={manualEntry.description}
                onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
                placeholder="What did you work on?"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowManualEntry(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleManualEntry}>
            Add Entry
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TimeTracking;
