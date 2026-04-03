import { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Row, Col, Badge, Alert } from 'react-bootstrap';
import { FaVolumeUp, FaPlay, FaCheck, FaBell } from 'react-icons/fa';
import api from '../../services/api';
import toast from '../../utils/toast';
import './NotificationSettings.css';

// Define 25 notification sounds with their configurations
const NOTIFICATION_SOUNDS = {
  bell_chime: {
    name: 'Bell Chime',
    description: 'Soft two-tone bell sound',
    tones: [
      { freq: 523, duration: 0.25, delay: 0 },
      { freq: 659, duration: 0.25, delay: 0.15 }
    ]
  },
  digital_ping: {
    name: 'Digital Ping',
    description: 'Quick digital notification sound',
    tones: [
      { freq: 800, duration: 0.15, delay: 0 },
      { freq: 1000, duration: 0.15, delay: 0.1 }
    ]
  },
  soft_chime: {
    name: 'Soft Chime',
    description: 'Gentle single tone',
    tones: [
      { freq: 440, duration: 0.4, delay: 0 }
    ]
  },
  ascending_tones: {
    name: 'Ascending Tones',
    description: 'Three ascending notes',
    tones: [
      { freq: 440, duration: 0.15, delay: 0 },
      { freq: 523, duration: 0.15, delay: 0.12 },
      { freq: 659, duration: 0.15, delay: 0.24 }
    ]
  },
  melodic_alert: {
    name: 'Melodic Alert',
    description: 'Pleasant melodic notification',
    tones: [
      { freq: 659, duration: 0.2, delay: 0 },
      { freq: 523, duration: 0.2, delay: 0.15 },
      { freq: 659, duration: 0.25, delay: 0.3 }
    ]
  },
  bright_ding: {
    name: 'Bright Ding',
    description: 'Bright and clear notification',
    tones: [
      { freq: 1046, duration: 0.2, delay: 0 },
      { freq: 784, duration: 0.2, delay: 0.15 }
    ]
  },
  subtle_beep: {
    name: 'Subtle Beep',
    description: 'Minimal and unobtrusive',
    tones: [
      { freq: 600, duration: 0.1, delay: 0 }
    ]
  },
  chirp: {
    name: 'Chirp',
    description: 'Quick chirping sound',
    tones: [
      { freq: 800, duration: 0.08, delay: 0 },
      { freq: 900, duration: 0.08, delay: 0.06 },
      { freq: 1000, duration: 0.08, delay: 0.12 }
    ]
  },
  ding_dong: {
    name: 'Ding Dong',
    description: 'Classic ding-dong sound',
    tones: [
      { freq: 659, duration: 0.3, delay: 0 },
      { freq: 494, duration: 0.3, delay: 0.25 }
    ]
  },
  sparkle: {
    name: 'Sparkle',
    description: 'Magical sparkle effect',
    tones: [
      { freq: 1200, duration: 0.1, delay: 0 },
      { freq: 1400, duration: 0.1, delay: 0.08 },
      { freq: 1600, duration: 0.1, delay: 0.16 }
    ]
  },
  gentle_bell: {
    name: 'Gentle Bell',
    description: 'Soft bell with decay',
    tones: [
      { freq: 587, duration: 0.5, delay: 0 }
    ]
  },
  notification_pop: {
    name: 'Pop',
    description: 'Short pop sound',
    tones: [
      { freq: 1200, duration: 0.12, delay: 0 }
    ]
  },
  three_notes: {
    name: 'Three Notes',
    description: 'Three descending notes',
    tones: [
      { freq: 784, duration: 0.15, delay: 0 },
      { freq: 659, duration: 0.15, delay: 0.12 },
      { freq: 587, duration: 0.15, delay: 0.24 }
    ]
  },
  xylophone: {
    name: 'Xylophone',
    description: 'Xylophone-like sound',
    tones: [
      { freq: 1046, duration: 0.1, delay: 0 },
      { freq: 1175, duration: 0.1, delay: 0.08 },
      { freq: 1319, duration: 0.1, delay: 0.16 }
    ]
  },
  soft_alert: {
    name: 'Soft Alert',
    description: 'Gentle alert tone',
    tones: [
      { freq: 523, duration: 0.2, delay: 0 },
      { freq: 523, duration: 0.2, delay: 0.15 }
    ]
  },
  saranai: {
    name: 'Saranai',
    description: 'Traditional Indian saranai sound',
    tones: [
      { freq: 440, duration: 0.3, delay: 0 },
      { freq: 495, duration: 0.25, delay: 0.25 },
      { freq: 550, duration: 0.3, delay: 0.45 }
    ]
  },
  temple_bell: {
    name: 'Temple Bell',
    description: 'Deep temple bell sound',
    tones: [
      { freq: 330, duration: 0.6, delay: 0 }
    ]
  },
  wind_chime: {
    name: 'Wind Chime',
    description: 'Gentle wind chime',
    tones: [
      { freq: 1046, duration: 0.15, delay: 0 },
      { freq: 1319, duration: 0.15, delay: 0.12 },
      { freq: 1568, duration: 0.15, delay: 0.24 }
    ]
  },
  crystal_tone: {
    name: 'Crystal Tone',
    description: 'Clear crystal-like sound',
    tones: [
      { freq: 1500, duration: 0.2, delay: 0 },
      { freq: 1200, duration: 0.15, delay: 0.15 }
    ]
  },
  harmony: {
    name: 'Harmony',
    description: 'Two harmonious tones',
    tones: [
      { freq: 523, duration: 0.25, delay: 0 },
      { freq: 784, duration: 0.25, delay: 0 }
    ]
  },
  forest_bird: {
    name: 'Forest Bird',
    description: 'Chirping forest bird',
    tones: [
      { freq: 1200, duration: 0.1, delay: 0 },
      { freq: 1400, duration: 0.08, delay: 0.08 },
      { freq: 1100, duration: 0.1, delay: 0.15 }
    ]
  },
  ocean_wave: {
    name: 'Ocean Wave',
    description: 'Gentle ocean wave sound',
    tones: [
      { freq: 200, duration: 0.5, delay: 0 },
      { freq: 250, duration: 0.4, delay: 0.4 }
    ]
  },
  morning_dew: {
    name: 'Morning Dew',
    description: 'Fresh morning notification',
    tones: [
      { freq: 880, duration: 0.15, delay: 0 },
      { freq: 1046, duration: 0.15, delay: 0.12 },
      { freq: 1175, duration: 0.15, delay: 0.24 }
    ]
  },
  cosmic_ping: {
    name: 'Cosmic Ping',
    description: 'Futuristic cosmic sound',
    tones: [
      { freq: 1600, duration: 0.1, delay: 0 },
      { freq: 1200, duration: 0.1, delay: 0.08 }
    ]
  },
  zen_bell: {
    name: 'Zen Bell',
    description: 'Peaceful zen meditation bell',
    tones: [
      { freq: 432, duration: 0.7, delay: 0 }
    ]
  },
  shehnai: {
    name: 'Shehnai',
    description: 'Traditional Indian shehnai music',
    tones: [
      // Opening phrase - warm nasal tone characteristic of shehnai
      { freq: 392, duration: 0.5, delay: 0, waveform: 'sawtooth' },
      { freq: 415, duration: 0.3, delay: 0.45, waveform: 'sawtooth' },
      { freq: 440, duration: 0.4, delay: 0.7, waveform: 'sawtooth' },
      
      // First ascending melodic phrase
      { freq: 466, duration: 0.35, delay: 1.05, waveform: 'sawtooth' },
      { freq: 494, duration: 0.4, delay: 1.35, waveform: 'sawtooth' },
      { freq: 523, duration: 0.35, delay: 1.7, waveform: 'sawtooth' },
      { freq: 554, duration: 0.3, delay: 2.0, waveform: 'sawtooth' },
      
      // Main melodic peak
      { freq: 587, duration: 0.5, delay: 2.25, waveform: 'sawtooth' },
      { freq: 622, duration: 0.4, delay: 2.7, waveform: 'sawtooth' },
      { freq: 659, duration: 0.5, delay: 3.05, waveform: 'sawtooth' },
      
      // Ornamental flourish (characteristic shehnai ornamentation)
      { freq: 698, duration: 0.3, delay: 3.5, waveform: 'sawtooth' },
      { freq: 659, duration: 0.25, delay: 3.75, waveform: 'sawtooth' },
      { freq: 622, duration: 0.3, delay: 3.95, waveform: 'sawtooth' },
      
      // Descending phrase
      { freq: 587, duration: 0.35, delay: 4.2, waveform: 'sawtooth' },
      { freq: 554, duration: 0.3, delay: 4.5, waveform: 'sawtooth' },
      { freq: 523, duration: 0.35, delay: 4.75, waveform: 'sawtooth' },
      { freq: 494, duration: 0.3, delay: 5.05, waveform: 'sawtooth' },
      
      // Second ascending phrase (repetition with variation)
      { freq: 466, duration: 0.35, delay: 5.3, waveform: 'sawtooth' },
      { freq: 494, duration: 0.4, delay: 5.6, waveform: 'sawtooth' },
      { freq: 523, duration: 0.35, delay: 5.95, waveform: 'sawtooth' },
      { freq: 587, duration: 0.4, delay: 6.25, waveform: 'sawtooth' },
      
      // Peak repetition with longer hold
      { freq: 659, duration: 0.6, delay: 6.6, waveform: 'sawtooth' },
      
      // Final descending resolution
      { freq: 622, duration: 0.3, delay: 7.15, waveform: 'sawtooth' },
      { freq: 587, duration: 0.35, delay: 7.4, waveform: 'sawtooth' },
      { freq: 554, duration: 0.3, delay: 7.7, waveform: 'sawtooth' },
      { freq: 523, duration: 0.35, delay: 7.95, waveform: 'sawtooth' },
      { freq: 494, duration: 0.3, delay: 8.25, waveform: 'sawtooth' },
      { freq: 466, duration: 0.35, delay: 8.5, waveform: 'sawtooth' },
      
      // Closing phrase - return to home note
      { freq: 440, duration: 0.5, delay: 8.8, waveform: 'sawtooth' },
      { freq: 415, duration: 0.4, delay: 9.25, waveform: 'sawtooth' },
      { freq: 392, duration: 0.6, delay: 9.6, waveform: 'sawtooth' }
    ]
  }
};

const NotificationSettings = () => {
  const [selectedSound, setSelectedSound] = useState(() => {
    const saved = localStorage.getItem('notificationSound');
    return saved || 'bell_chime';
  });

  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('notificationVolume');
    return saved ? parseFloat(saved) : 0.3;
  });

  const [notificationPreferences, setNotificationPreferences] = useState({
    leaves: true,
    tasks: true,
    meetings: true,
    attendance: true,
    projects: true,
    announcements: true,
    salary: true,
    expenses: true,
    documents: true,
    performance: true
  });

  const [playingSound, setPlayingSound] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSliding, setIsSliding] = useState(false);
  const volumeTimeoutRef = useRef(null);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/notifications/sound-settings');
        if (response.data) {
          setSelectedSound(response.data.sound || 'bell_chime');
          setVolume(response.data.volume || 0.3);
          if (response.data.preferences) {
            setNotificationPreferences(response.data.preferences);
          }
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
        // Fall back to localStorage if API fails
        const savedSound = localStorage.getItem('notificationSound') || 'bell_chime';
        const savedVolume = parseFloat(localStorage.getItem('notificationVolume') || '0.3');
        setSelectedSound(savedSound);
        setVolume(savedVolume);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
    };
  }, []);

  // Save settings to backend and localStorage
  const saveSettings = async (newSound, newVolume, newPreferences = null) => {
    try {
      setSaving(true);
      console.log('Saving settings:', { sound: newSound, volume: newVolume, preferences: newPreferences });
      
      const response = await api.put('/notifications/sound-settings', {
        sound: newSound,
        volume: newVolume,
        preferences: newPreferences || notificationPreferences
      });
      
      console.log('Settings saved successfully:', response.data);
      
      // Also save to localStorage as backup
      localStorage.setItem('notificationSound', newSound);
      localStorage.setItem('notificationVolume', newVolume.toString());
      localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences || notificationPreferences));
      
      toast.success('Notification settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Still save to localStorage as fallback
      localStorage.setItem('notificationSound', newSound);
      localStorage.setItem('notificationVolume', newVolume.toString());
      localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences || notificationPreferences));
      
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle sound selection
  const handleSoundChange = (soundKey) => {
    setSelectedSound(soundKey);
    saveSettings(soundKey, volume);
  };

  // Handle volume change with debouncing
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    setIsSliding(true);

    // Clear existing timeout
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }

    // Set new timeout - save only after user stops sliding for 500ms
    volumeTimeoutRef.current = setTimeout(() => {
      console.log('Volume slider stopped, saving:', newVolume);
      saveSettings(selectedSound, newVolume);
      setIsSliding(false);
    }, 500);
  };

  // Handle preference toggle
  const handlePreferenceToggle = (preference) => {
    const newPreferences = {
      ...notificationPreferences,
      [preference]: !notificationPreferences[preference]
    };
    setNotificationPreferences(newPreferences);
    saveSettings(selectedSound, volume, newPreferences);
  };

  // Play sound function - NO TOAST MESSAGE
  const playSound = async (soundKey) => {
    try {
      setPlayingSound(soundKey);
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      const soundConfig = NOTIFICATION_SOUNDS[soundKey];

      if (!soundConfig) return;

      const playTone = (freq, startTime, duration, gainValue, waveform = 'sine') => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = waveform; // Use specified waveform (sine, sawtooth, square, triangle)
        osc.frequency.value = freq;
        
        // Add vibrato effect for more natural sound
        if (waveform === 'sawtooth') {
          const vibrato = audioContext.createOscillator();
          const vibratoGain = audioContext.createGain();
          vibrato.frequency.value = 5; // 5Hz vibrato
          vibratoGain.gain.value = 20; // Vibrato depth in Hz
          vibrato.connect(vibratoGain);
          vibratoGain.connect(osc.frequency);
          vibrato.start(startTime);
          vibrato.stop(startTime + duration);
        }
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      soundConfig.tones.forEach(tone => {
        playTone(tone.freq, now + tone.delay, tone.duration, volume, tone.waveform || 'sine');
      });

      // Calculate total duration
      const totalDuration = Math.max(...soundConfig.tones.map(t => t.delay + t.duration)) * 1000;
      setTimeout(() => setPlayingSound(null), totalDuration);
    } catch (error) {
      console.error('Error playing sound:', error);
      setPlayingSound(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm notification-settings-card">
        <Card.Body className="p-4 text-center">
          <p className="text-muted">Loading notification settings...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm notification-settings-card">
      <Card.Header className="bg-white border-bottom">
        <h6 className="mb-0">
          <FaVolumeUp className="me-2 text-primary" />
          Notification Sound Settings
        </h6>
      </Card.Header>
      <Card.Body className="p-4">
        {/* Volume Control */}
        <div className="mb-4">
          <label className="form-label fw-600 mb-3">
            <FaVolumeUp className="me-2 text-primary" />
            Volume Level
          </label>
          <div className="d-flex align-items-center gap-3">
            <Form.Range
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              onMouseUp={() => setIsSliding(false)}
              onTouchEnd={() => setIsSliding(false)}
              className="notification-volume-slider"
              style={{ flex: 1 }}
              disabled={saving}
            />
            <span className={`badge ${isSliding ? 'bg-warning' : 'bg-primary'}`} style={{ minWidth: '50px' }}>
              {Math.round(volume * 100)}%
            </span>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => playSound(selectedSound)}
              disabled={playingSound !== null || saving || isSliding}
              title={isSliding ? 'Finish sliding to enable' : 'Test sound'}
            >
              <FaPlay className="me-1" />
              Test
            </Button>
          </div>
          <small className={`d-block mt-2 ${isSliding ? 'text-warning fw-600' : 'text-muted'}`}>
            {isSliding ? '⏳ Adjusting volume... (will save when you stop)' : 'Adjust the volume level for notification sounds'}
          </small>
        </div>

        {/* Sound Selection */}
        <div className="mb-4">
          <label className="form-label fw-600 mb-3">Select Notification Sound (26 Options)</label>
          <Row className="g-3">
            {Object.entries(NOTIFICATION_SOUNDS).map(([key, sound]) => (
              <Col xs={12} sm={6} md={4} key={key}>
                <div
                  className={`notification-sound-option p-3 rounded border-2 cursor-pointer transition ${
                    selectedSound === key
                      ? 'border-primary bg-primary bg-opacity-10'
                      : 'border-light bg-light'
                  }`}
                  onClick={() => handleSoundChange(key)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1">{sound.name}</h6>
                      <small className="text-muted d-block">{sound.description}</small>
                    </div>
                    {selectedSound === key && (
                      <Badge bg="primary">
                        <FaCheck />
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant={selectedSound === key ? 'primary' : 'outline-secondary'}
                    size="sm"
                    className="w-100 mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSound(key);
                    }}
                    disabled={playingSound !== null || saving}
                  >
                    <FaPlay className="me-1" />
                    {playingSound === key ? 'Playing...' : 'Preview'}
                  </Button>
                </div>
              </Col>
            ))}
          </Row>
        </div>

        {/* Notification Preferences */}
        <div className="mb-4">
          <hr className="my-4" />
          <label className="form-label fw-600 mb-3">
            <FaBell className="me-2 text-info" />
            Notification Preferences - Select Services
          </label>
          <p className="text-muted small mb-3">Choose which services you want to receive notifications for:</p>
          
          <Row className="g-3">
            <Col xs={12} sm={6} md={4}>
              <Form.Check
                type="switch"
                id="leaves"
                label="Leave Requests & Approvals"
                checked={notificationPreferences.leaves}
                onChange={() => handlePreferenceToggle('leaves')}
                disabled={saving}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Check
                type="switch"
                id="tasks"
                label="Task Assignments"
                checked={notificationPreferences.tasks}
                onChange={() => handlePreferenceToggle('tasks')}
                disabled={saving}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Check
                type="switch"
                id="meetings"
                label="Meeting Reminders"
                checked={notificationPreferences.meetings}
                onChange={() => handlePreferenceToggle('meetings')}
                disabled={saving}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Check
                type="switch"
                id="attendance"
                label="Attendance Alerts"
                checked={notificationPreferences.attendance}
                onChange={() => handlePreferenceToggle('attendance')}
                disabled={saving}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Check
                type="switch"
                id="projects"
                label="Project Updates"
                checked={notificationPreferences.projects}
                onChange={() => handlePreferenceToggle('projects')}
                disabled={saving}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Check
                type="switch"
                id="announcements"
                label="Announcements"
                checked={notificationPreferences.announcements}
                onChange={() => handlePreferenceToggle('announcements')}
                disabled={saving}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Check
                type="switch"
                id="salary"
                label="Salary & Payroll"
                checked={notificationPreferences.salary}
                onChange={() => handlePreferenceToggle('salary')}
                disabled={saving}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Check
                type="switch"
                id="expenses"
                label="Expense Reports"
                checked={notificationPreferences.expenses}
                onChange={() => handlePreferenceToggle('expenses')}
                disabled={saving}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Check
                type="switch"
                id="documents"
                label="Document Uploads"
                checked={notificationPreferences.documents}
                onChange={() => handlePreferenceToggle('documents')}
                disabled={saving}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Check
                type="switch"
                id="performance"
                label="Performance Reviews"
                checked={notificationPreferences.performance}
                onChange={() => handlePreferenceToggle('performance')}
                disabled={saving}
              />
            </Col>
          </Row>
        </div>

        {/* Info */}
        <Alert variant="info" className="mt-4 mb-0">
          <small>
            Your notification sound preferences and service selections are saved to your account. Changes apply immediately to new notifications.
          </small>
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default NotificationSettings;
