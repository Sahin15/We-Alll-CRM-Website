import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Form, Button, Badge } from 'react-bootstrap';
import { 
  FaChartLine, 
  FaCalendarAlt, 
  FaDownload, 
  FaExpand,
  FaTrendUp,
  FaTrendDown,
  FaMinus
} from 'react-icons/fa';

/**
 * ProgressTrendChart Component
 * 
 * Displays historical progress visualization with trend analysis
 * Requirements: 2.3, 2.4, 2.5
 */
const ProgressTrendChart = ({ 
  project, 
  progressHistory = [], 
  slots = [],
  showControls = true,
  height = 300 
}) => {
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, all
  const [chartType, setChartType] = useState('progress'); // progress, velocity, cumulative
  const [showGrid, setShowGrid] = useState(true);

  // Generate chart data based on progress history and current slots
  const chartData = useMemo(() => {
    if (!progressHistory || progressHistory.length === 0) {
      // Generate mock data based on current project state for demonstration
      return generateMockProgressData();
    }

    const now = new Date();
    let filteredData = [...progressHistory];

    // Filter by time range
    if (timeRange !== 'all') {
      const days = parseInt(timeRange.replace('d', ''));
      const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      filteredData = filteredData.filter(entry => new Date(entry.date) >= cutoffDate);
    }

    // Sort by date
    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

    return filteredData.map(entry => ({
      date: new Date(entry.date).toLocaleDateString(),
      progress: entry.progressPercentage || 0,
      completedSlots: entry.completedSlots || 0,
      totalSlots: entry.totalSlots || 0,
      velocity: calculateVelocity(entry, filteredData)
    }));
  }, [progressHistory, timeRange]);

  // Generate mock data for demonstration when no history exists
  const generateMockProgressData = () => {
    const data = [];
    const now = new Date();
    const days = timeRange === 'all' ? 30 : parseInt(timeRange.replace('d', ''));
    
    const currentProgress = project?.progressTracking?.progressPercentage || 0;
    const totalSlots = project?.slotConfiguration?.totalSlots || 10;
    const completedSlots = slots.filter(s => s.assignmentStatus === 'completed').length;

    for (let i = days; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const progress = Math.max(0, currentProgress - (i * 2) + Math.random() * 5);
      const completed = Math.floor((progress / 100) * totalSlots);
      
      data.push({
        date: date.toLocaleDateString(),
        progress: Math.min(100, Math.max(0, progress)),
        completedSlots: completed,
        totalSlots: totalSlots,
        velocity: i < days ? Math.random() * 3 : 0
      });
    }

    return data;
  };

  const calculateVelocity = (entry, allData) => {
    const currentIndex = allData.findIndex(d => d.date === entry.date);
    if (currentIndex === 0) return 0;
    
    const previousEntry = allData[currentIndex - 1];
    return entry.completedSlots - previousEntry.completedSlots;
  };

  const calculateTrend = () => {
    if (chartData.length < 2) return 'stable';
    
    const recent = chartData.slice(-7); // Last 7 data points
    const firstProgress = recent[0]?.progress || 0;
    const lastProgress = recent[recent.length - 1]?.progress || 0;
    
    const change = lastProgress - firstProgress;
    
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  };

  const getTrendIcon = () => {
    const trend = calculateTrend();
    switch (trend) {
      case 'up':
        return <FaTrendUp className="text-success" />;
      case 'down':
        return <FaTrendDown className="text-danger" />;
      default:
        return <FaMinus className="text-muted" />;
    }
  };

  const getChartTitle = () => {
    switch (chartType) {
      case 'velocity':
        return 'Slot Completion Velocity';
      case 'cumulative':
        return 'Cumulative Slot Progress';
      default:
        return 'Progress Trend';
    }
  };

  const renderSVGChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="d-flex align-items-center justify-content-center" style={{ height }}>
          <div className="text-center text-muted">
            <FaChartLine size={48} className="mb-3" />
            <p>No progress data available</p>
          </div>
        </div>
      );
    }

    const width = 800;
    const padding = 60;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Calculate scales
    const maxProgress = Math.max(...chartData.map(d => d.progress), 100);
    const maxVelocity = Math.max(...chartData.map(d => d.velocity), 1);
    const maxSlots = Math.max(...chartData.map(d => d.totalSlots), 1);

    const xScale = (index) => (index / (chartData.length - 1)) * chartWidth + padding;
    const yScale = (value, max) => chartHeight - ((value / max) * chartHeight) + padding;

    // Generate path data based on chart type
    const getPathData = () => {
      let pathData = `M ${xScale(0)} `;
      
      switch (chartType) {
        case 'velocity':
          pathData += `${yScale(chartData[0].velocity, maxVelocity)}`;
          chartData.forEach((d, i) => {
            if (i > 0) {
              pathData += ` L ${xScale(i)} ${yScale(d.velocity, maxVelocity)}`;
            }
          });
          break;
        case 'cumulative':
          pathData += `${yScale(chartData[0].completedSlots, maxSlots)}`;
          chartData.forEach((d, i) => {
            if (i > 0) {
              pathData += ` L ${xScale(i)} ${yScale(d.completedSlots, maxSlots)}`;
            }
          });
          break;
        default:
          pathData += `${yScale(chartData[0].progress, maxProgress)}`;
          chartData.forEach((d, i) => {
            if (i > 0) {
              pathData += ` L ${xScale(i)} ${yScale(d.progress, maxProgress)}`;
            }
          });
      }
      
      return pathData;
    };

    return (
      <div className="position-relative" style={{ height }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Grid lines */}
          {showGrid && (
            <g className="grid">
              {/* Horizontal grid lines */}
              {[0, 25, 50, 75, 100].map(value => (
                <line
                  key={`h-${value}`}
                  x1={padding}
                  y1={yScale(value, chartType === 'velocity' ? maxVelocity : chartType === 'cumulative' ? maxSlots : maxProgress)}
                  x2={width - padding}
                  y2={yScale(value, chartType === 'velocity' ? maxVelocity : chartType === 'cumulative' ? maxSlots : maxProgress)}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                />
              ))}
              {/* Vertical grid lines */}
              {chartData.map((_, i) => (
                i % Math.ceil(chartData.length / 6) === 0 && (
                  <line
                    key={`v-${i}`}
                    x1={xScale(i)}
                    y1={padding}
                    x2={xScale(i)}
                    y2={height - padding}
                    stroke="#e0e0e0"
                    strokeWidth="1"
                  />
                )
              ))}
            </g>
          )}

          {/* Chart line */}
          <path
            d={getPathData()}
            fill="none"
            stroke="#007bff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartData.map((d, i) => {
            const y = chartType === 'velocity' 
              ? yScale(d.velocity, maxVelocity)
              : chartType === 'cumulative'
              ? yScale(d.completedSlots, maxSlots)
              : yScale(d.progress, maxProgress);
            
            return (
              <circle
                key={i}
                cx={xScale(i)}
                cy={y}
                r="4"
                fill="#007bff"
                stroke="white"
                strokeWidth="2"
              />
            );
          })}

          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map(value => (
            <text
              key={`y-label-${value}`}
              x={padding - 10}
              y={yScale(value, chartType === 'velocity' ? maxVelocity : chartType === 'cumulative' ? maxSlots : maxProgress)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="12"
              fill="#666"
            >
              {chartType === 'velocity' ? Math.round((value / 100) * maxVelocity) : 
               chartType === 'cumulative' ? Math.round((value / 100) * maxSlots) : 
               `${value}%`}
            </text>
          ))}

          {/* X-axis labels */}
          {chartData.map((d, i) => (
            i % Math.ceil(chartData.length / 6) === 0 && (
              <text
                key={`x-label-${i}`}
                x={xScale(i)}
                y={height - padding + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#666"
              >
                {d.date}
              </text>
            )
          ))}
        </svg>
      </div>
    );
  };

  const handleExport = () => {
    // Simple CSV export
    const csvData = [
      ['Date', 'Progress %', 'Completed Slots', 'Total Slots', 'Velocity'],
      ...chartData.map(d => [d.date, d.progress, d.completedSlots, d.totalSlots, d.velocity])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-trend-${project?.name || 'project'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="progress-trend-chart">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <FaChartLine className="me-2" />
          <h6 className="mb-0">{getChartTitle()}</h6>
          <div className="ms-3">
            {getTrendIcon()}
          </div>
        </div>
        
        {showControls && (
          <div className="d-flex align-items-center gap-2">
            <Form.Select
              size="sm"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </Form.Select>
            
            <Form.Select
              size="sm"
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="progress">Progress %</option>
              <option value="velocity">Velocity</option>
              <option value="cumulative">Cumulative</option>
            </Form.Select>
            
            <Button variant="outline-secondary" size="sm" onClick={handleExport}>
              <FaDownload />
            </Button>
          </div>
        )}
      </Card.Header>

      <Card.Body className="p-0">
        {renderSVGChart()}
      </Card.Body>

      {/* Chart Summary */}
      <Card.Footer className="bg-light">
        <Row className="g-3">
          <Col md={3}>
            <div className="text-center">
              <div className="small text-muted">Current Progress</div>
              <div className="fw-semibold">
                {chartData.length > 0 ? `${Math.round(chartData[chartData.length - 1].progress)}%` : '0%'}
              </div>
            </div>
          </Col>
          <Col md={3}>
            <div className="text-center">
              <div className="small text-muted">Trend</div>
              <div className="fw-semibold">
                <Badge bg={calculateTrend() === 'up' ? 'success' : calculateTrend() === 'down' ? 'danger' : 'secondary'}>
                  {calculateTrend() === 'up' ? 'Improving' : calculateTrend() === 'down' ? 'Declining' : 'Stable'}
                </Badge>
              </div>
            </div>
          </Col>
          <Col md={3}>
            <div className="text-center">
              <div className="small text-muted">Avg. Velocity</div>
              <div className="fw-semibold">
                {chartData.length > 0 
                  ? `${(chartData.reduce((acc, d) => acc + d.velocity, 0) / chartData.length).toFixed(1)} slots/day`
                  : '0 slots/day'
                }
              </div>
            </div>
          </Col>
          <Col md={3}>
            <div className="text-center">
              <div className="small text-muted">Data Points</div>
              <div className="fw-semibold">{chartData.length}</div>
            </div>
          </Col>
        </Row>
      </Card.Footer>
    </Card>
  );
};

export default ProgressTrendChart;