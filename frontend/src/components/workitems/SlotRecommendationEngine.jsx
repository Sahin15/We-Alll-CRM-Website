import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { 
  FaLightbulb, 
  FaCheckCircle, 
  FaClock, 
  FaExclamationTriangle,
  FaArrowRight,
  FaSync,
  FaStar
} from 'react-icons/fa';
import SlotOptionCard from './SlotOptionCard';

/**
 * SlotRecommendationEngine Component
 * 
 * Intelligent slot suggestion system based on work item characteristics
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1
 */
const SlotRecommendationEngine = ({
  projectId,
  workItemData = {},
  availableSlots = [],
  onSlotSelect,
  maxRecommendations = 3,
  showReasoningDetails = true,
  autoRefresh = true,
  className = ''
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  useEffect(() => {
    if (projectId && (availableSlots.length > 0 || workItemData)) {
      generateRecommendations();
    }
  }, [projectId, availableSlots, workItemData, maxRecommendations]);

  const generateRecommendations = async () => {
    setLoading(true);
    setError(null);
    setAnalysisComplete(false);

    try {
      // Simulate API delay for recommendation engine
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get available slots (mock data if not provided)
      let slots = availableSlots;
      if (slots.length === 0) {
        slots = await fetchAvailableSlots();
      }

      // Filter only truly available slots
      const availableSlots_filtered = slots.filter(slot => 
        slot.assignmentStatus === 'available'
      );

      if (availableSlots_filtered.length === 0) {
        setRecommendations([]);
        setAnalysisComplete(true);
        return;
      }

      // Analyze work item and generate recommendations
      const analysisResults = analyzeWorkItem(workItemData);
      const scoredSlots = scoreSlots(availableSlots_filtered, analysisResults);
      
      // Sort by score and take top recommendations
      const topRecommendations = scoredSlots
        .sort((a, b) => b.score - a.score)
        .slice(0, maxRecommendations)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
          confidence: calculateConfidence(item.score, scoredSlots)
        }));

      setRecommendations(topRecommendations);
      setAnalysisComplete(true);

    } catch (err) {
      console.error('Error generating recommendations:', err);
      setError('Failed to generate slot recommendations');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    // Mock available slots
    return [
      {
        _id: 'slot1',
        slotNumber: 1,
        slotIdentifier: 'Slot 1',
        title: 'Initial Setup',
        description: 'Project setup and configuration',
        assignmentStatus: 'available',
        priority: 'High',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedEffort: 8,
        slotType: 'work',
        dependencies: [],
        slotConfiguration: {
          isRequired: true,
          canBeSkipped: false,
          requiresApproval: false
        },
        slotMetadata: {
          tags: ['setup', 'configuration', 'initial'],
          deliverables: ['Environment setup', 'Basic configuration']
        }
      },
      {
        _id: 'slot3',
        slotNumber: 3,
        slotIdentifier: 'Slot 3',
        title: 'Testing Phase',
        description: 'Quality assurance and testing',
        assignmentStatus: 'available',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedEffort: 12,
        slotType: 'review',
        dependencies: ['slot2'],
        slotConfiguration: {
          isRequired: false,
          canBeSkipped: true,
          requiresApproval: false
        },
        slotMetadata: {
          tags: ['testing', 'qa', 'validation'],
          deliverables: ['Test results', 'Bug reports']
        }
      },
      {
        _id: 'slot4',
        slotNumber: 4,
        slotIdentifier: 'Slot 4',
        title: 'Documentation',
        description: 'Project documentation and user guides',
        assignmentStatus: 'available',
        priority: 'Low',
        dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedEffort: 6,
        slotType: 'deliverable',
        dependencies: [],
        slotConfiguration: {
          isRequired: false,
          canBeSkipped: true,
          requiresApproval: false
        },
        slotMetadata: {
          tags: ['documentation', 'guides', 'content'],
          deliverables: ['User manual', 'API documentation']
        }
      }
    ];
  };

  const analyzeWorkItem = (workItem) => {
    const analysis = {
      workType: workItem.type || workItem.workItemType || 'task',
      priority: workItem.priority || 'medium',
      estimatedHours: parseFloat(workItem.estimatedHours) || 0,
      dueDate: workItem.dueDate ? new Date(workItem.dueDate) : null,
      tags: workItem.tags || [],
      title: workItem.title || '',
      description: workItem.description || '',
      platform: workItem.platform || null,
      postType: workItem.postType || null
    };

    // Extract keywords from title and description
    const text = `${analysis.title} ${analysis.description}`.toLowerCase();
    analysis.keywords = extractKeywords(text);

    return analysis;
  };

  const extractKeywords = (text) => {
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    const words = text.split(/\s+/).filter(word => 
      word.length > 2 && !commonWords.includes(word)
    );
    return [...new Set(words)]; // Remove duplicates
  };

  const scoreSlots = (slots, analysis) => {
    return slots.map(slot => {
      let score = 0;
      const reasons = [];

      // Priority matching (20 points max)
      const priorityScore = calculatePriorityScore(slot.priority, analysis.priority);
      score += priorityScore;
      if (priorityScore > 0) {
        reasons.push(`Priority alignment (${priorityScore} pts)`);
      }

      // Effort matching (15 points max)
      const effortScore = calculateEffortScore(slot.estimatedEffort, analysis.estimatedHours);
      score += effortScore;
      if (effortScore > 0) {
        reasons.push(`Effort match (${effortScore} pts)`);
      }

      // Due date compatibility (15 points max)
      const dueDateScore = calculateDueDateScore(slot.dueDate, analysis.dueDate);
      score += dueDateScore;
      if (dueDateScore > 0) {
        reasons.push(`Timeline compatibility (${dueDateScore} pts)`);
      }

      // Keyword/tag matching (25 points max)
      const keywordScore = calculateKeywordScore(slot, analysis);
      score += keywordScore;
      if (keywordScore > 0) {
        reasons.push(`Content relevance (${keywordScore} pts)`);
      }

      // Work type matching (15 points max)
      const typeScore = calculateTypeScore(slot, analysis);
      score += typeScore;
      if (typeScore > 0) {
        reasons.push(`Work type match (${typeScore} pts)`);
      }

      // Dependency consideration (10 points max)
      const dependencyScore = calculateDependencyScore(slot);
      score += dependencyScore;
      if (dependencyScore > 0) {
        reasons.push(`No blocking dependencies (${dependencyScore} pts)`);
      }

      return {
        slot,
        score: Math.round(score),
        reasons,
        maxPossibleScore: 100
      };
    });
  };

  const calculatePriorityScore = (slotPriority, workPriority) => {
    const priorityValues = { 'Low': 1, 'Medium': 2, 'High': 3, 'Urgent': 4 };
    const slotVal = priorityValues[slotPriority] || 2;
    const workVal = priorityValues[workPriority] || 2;
    
    if (slotVal === workVal) return 20;
    if (Math.abs(slotVal - workVal) === 1) return 10;
    return 0;
  };

  const calculateEffortScore = (slotEffort, workEffort) => {
    if (!slotEffort || !workEffort) return 5; // Neutral score if no data
    
    const ratio = Math.min(slotEffort, workEffort) / Math.max(slotEffort, workEffort);
    return Math.round(ratio * 15);
  };

  const calculateDueDateScore = (slotDueDate, workDueDate) => {
    if (!slotDueDate || !workDueDate) return 5; // Neutral score if no data
    
    const slotDate = new Date(slotDueDate);
    const workDate = new Date(workDueDate);
    const diffDays = Math.abs((slotDate - workDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 15;
    if (diffDays <= 3) return 10;
    if (diffDays <= 7) return 5;
    return 0;
  };

  const calculateKeywordScore = (slot, analysis) => {
    const slotText = `${slot.title} ${slot.description} ${slot.slotMetadata?.tags?.join(' ') || ''}`.toLowerCase();
    const matches = analysis.keywords.filter(keyword => slotText.includes(keyword));
    return Math.min(matches.length * 5, 25);
  };

  const calculateTypeScore = (slot, analysis) => {
    // Content work items match better with deliverable slots
    if (analysis.workType === 'content' && slot.slotType === 'deliverable') return 15;
    
    // Task work items match better with work slots
    if (analysis.workType === 'task' && slot.slotType === 'work') return 15;
    
    // Review/testing work matches review slots
    if (analysis.keywords.some(k => ['test', 'review', 'qa'].includes(k)) && slot.slotType === 'review') return 15;
    
    return 5; // Default neutral score
  };

  const calculateDependencyScore = (slot) => {
    return (slot.dependencies && slot.dependencies.length > 0) ? 0 : 10;
  };

  const calculateConfidence = (score, allScores) => {
    const maxScore = Math.max(...allScores.map(s => s.score));
    const minScore = Math.min(...allScores.map(s => s.score));
    
    if (maxScore === minScore) return 'Medium';
    
    const normalizedScore = (score - minScore) / (maxScore - minScore);
    
    if (normalizedScore >= 0.8) return 'High';
    if (normalizedScore >= 0.5) return 'Medium';
    return 'Low';
  };

  const getConfidenceBadge = (confidence) => {
    const configs = {
      'High': { bg: 'success', icon: FaCheckCircle },
      'Medium': { bg: 'warning', icon: FaClock },
      'Low': { bg: 'secondary', icon: FaExclamationTriangle }
    };
    
    const config = configs[confidence] || configs['Medium'];
    const IconComponent = config.icon;
    
    return (
      <Badge bg={config.bg} className="d-flex align-items-center">
        <IconComponent className="me-1" size={10} />
        {confidence} Confidence
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className={`slot-recommendation-engine ${className}`}>
        <Card.Header>
          <div className="d-flex align-items-center">
            <FaLightbulb className="me-2" />
            <h6 className="mb-0">Analyzing Slot Recommendations</h6>
          </div>
        </Card.Header>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" className="mb-3" />
          <p className="text-muted mb-0">
            Analyzing work item characteristics and matching with available slots...
          </p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className={className}>
        <FaExclamationTriangle className="me-2" />
        {error}
        <Button 
          variant="outline-danger" 
          size="sm" 
          className="ms-2"
          onClick={generateRecommendations}
        >
          <FaSync className="me-1" />
          Retry
        </Button>
      </Alert>
    );
  }

  if (recommendations.length === 0 && analysisComplete) {
    return (
      <Alert variant="info" className={className}>
        <FaLightbulb className="me-2" />
        No slot recommendations available. All slots may be assigned or there might be no suitable matches.
      </Alert>
    );
  }

  return (
    <Card className={`slot-recommendation-engine ${className}`}>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaLightbulb className="me-2 text-warning" />
            <h6 className="mb-0">Recommended Slots</h6>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Badge bg="info" size="sm">
              {recommendations.length} of {maxRecommendations}
            </Badge>
            {autoRefresh && (
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={generateRecommendations}
                disabled={loading}
              >
                <FaSync className={loading ? 'fa-spin' : ''} />
              </Button>
            )}
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        <Row className="g-3">
          {recommendations.map((recommendation, index) => (
            <Col key={recommendation.slot._id} lg={12}>
              <div className="position-relative">
                {/* Rank Badge */}
                <Badge 
                  bg="primary" 
                  className="position-absolute top-0 start-0 translate-middle z-index-1"
                  style={{ zIndex: 10 }}
                >
                  <FaStar className="me-1" />
                  #{recommendation.rank}
                </Badge>

                <SlotOptionCard
                  slot={recommendation.slot}
                  onSelect={onSlotSelect}
                  showDetails={true}
                  compact={false}
                  className="border-primary"
                />

                {/* Recommendation Details */}
                <div className="mt-2 p-2 bg-light rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <strong className="text-primary">
                        Match Score: {recommendation.score}/{recommendation.maxPossibleScore}
                      </strong>
                      {getConfidenceBadge(recommendation.confidence)}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onSlotSelect && onSlotSelect(recommendation.slot)}
                    >
                      Select This Slot
                      <FaArrowRight className="ms-1" />
                    </Button>
                  </div>

                  {showReasoningDetails && recommendation.reasons.length > 0 && (
                    <div>
                      <small className="text-muted d-block mb-1">
                        <strong>Why this slot is recommended:</strong>
                      </small>
                      <div className="d-flex flex-wrap gap-1">
                        {recommendation.reasons.map((reason, idx) => (
                          <Badge key={idx} bg="light" text="dark" size="sm">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {recommendations.length > 0 && (
          <div className="mt-3 pt-3 border-top">
            <small className="text-muted">
              <FaLightbulb className="me-1" />
              Recommendations are based on priority, effort, timeline, content relevance, and dependencies.
              Higher scores indicate better matches for your work item.
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default SlotRecommendationEngine;