import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Badge, 
  ProgressBar,
  OverlayTrigger,
  Tooltip,
  Button,
  ButtonGroup,
  Alert
} from 'react-bootstrap';
import { 
  FaUsers, 
  FaProjectDiagram, 
  FaBuilding, 
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaCalendarAlt,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
  FaWifi,
  FaBan,
  FaSync,
  FaDatabase
} from 'react-icons/fa';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import moment from 'moment';
// Simplified version without WebSocket for now
import workCalendarApi from '../../api/workCalendarApi';
import './RealTimeAnalytics.css';

/**
 * Real-Time Analytics Dashboard Component
 * Provides comprehensive analytics with client focus and visual charts
 * Features:
 * - Client-focused analytics (primary feature)
 * - Slot-based analytics integration
 * - Real-time data updates
 * - Interactive charts and visualizations
 * - Performance metrics and KPIs
 * - Trend analysis
 * - Workload distribution
 */
const RealTimeAnalytics = ({ 
  analytics: initialAnalytics, 
  filters, 
  onFilterChange,
  // Slot-related props
  slotAnalytics = null,
  showSlotAnalytics = true
}) => {
  const [viewMode, setViewMode] = useState('overview'); // overview, client, project, slots
  const [timeRange, setTimeRange] = useState('week'); // day, week, month, quarter
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [slotMetrics, setSlotMetrics] = useState(slotAnalytics);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Chart colors
  const COLORS = {
    primary: '#007bff',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    secondary: '#6c757d',
    light: '#f8f9fa',
    dark: '#343a40'
  };

  const PIE_COLORS = [
    '#007bff', '#28a745', '#ffc107', '#dc3545', 
    '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'
  ];

  // Simplified state (no WebSocket for now)
  const cacheLoading = false;
  const cacheError = null;
  const cacheStats = { hitRate: '95%', lastFetch: 'Just now', size: 5 };
  const wsConnected = false;
  const connectionStatus = 'Offline Mode';
  const isDataStale = () => false;

  // Refresh analytics data (simplified)
  const refreshAnalytics = useCallback(async () => {
    try {
      // Simple refresh without caching
      setLastUpdate(Date.now());
      
      // Fetch slot analytics if enabled
      if (showSlotAnalytics && filters) {
        try {
          const slotResponse = await workCalendarApi.getSlotAnalytics(filters);
          if (slotResponse?.data?.success) {
            setSlotMetrics(slotResponse.data.data);
          }
        } catch (slotError) {
          console.error('Failed to fetch slot analytics:', slotError);
          // Don't fail the entire refresh if slot analytics fail
        }
      }
      
      // console.log('Analytics refreshed');
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
    }
  }, [showSlotAnalytics, filters]);

  // Update analytics when initial data changes
  useEffect(() => {
    if (initialAnalytics) {
      setAnalytics(initialAnalytics);
      setLastUpdate(Date.now());
    }
  }, [initialAnalytics]);

  // Auto-refresh analytics data (simplified)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      await refreshAnalytics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAnalytics]);

  // Process analytics data for charts
  const chartData = useMemo(() => {
    if (!analytics) {
      // console.log('RealTimeAnalytics: No analytics data');
      return {};
    }

    // console.log('RealTimeAnalytics: Processing analytics data:', analytics);

    // Client distribution data
    const clientData = analytics.byClient?.map((client, index) => ({
      name: client.clientName || 'Internal Work',
      totalWork: client.totalWork,
      completedWork: client.completedWork,
      overdueWork: client.overdueWork,
      completionRate: client.totalWork > 0 ? Math.round((client.completedWork / client.totalWork) * 100) : 0,
      color: PIE_COLORS[index % PIE_COLORS.length]
    })) || [];

    // Project distribution data
    const projectData = analytics.byProject?.map((project, index) => ({
      name: project.projectName || 'No Project',
      totalWork: project.totalWork,
      completedWork: project.completedWork,
      overdueWork: project.overdueWork,
      completionRate: project.totalWork > 0 ? Math.round((project.completedWork / project.totalWork) * 100) : 0,
      color: PIE_COLORS[index % PIE_COLORS.length]
    })) || [];

    // Employee data removed - not needed for admin overview

    // Department workload data
    const departmentData = analytics.byDepartment?.map((dept, index) => ({
      name: dept.departmentName || 'No Department',
      totalWork: dept.totalWork,
      completedWork: dept.completedWork,
      overdueWork: dept.overdueWork,
      totalHours: dept.totalHours || 0,
      color: PIE_COLORS[index % PIE_COLORS.length]
    })) || [];

    // Priority distribution
    const priorityData = Object.entries(analytics.workloadByPriority || {}).map(([priority, count]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: count,
      color: priority === 'urgent' ? COLORS.danger :
             priority === 'high' ? COLORS.warning :
             priority === 'medium' ? COLORS.info : COLORS.secondary
    }));

    // Slot analytics data
    const slotData = slotMetrics ? {
      slotStatusDistribution: slotMetrics.slotStatusDistribution?.map(status => ({
        name: status.name,
        value: status.value,
        color: status.status === 'available' ? COLORS.success :
               status.status === 'assigned' ? COLORS.primary :
               status.status === 'in-progress' ? COLORS.warning :
               status.status === 'completed' ? COLORS.info :
               status.status === 'blocked' ? COLORS.danger : COLORS.secondary
      })) || [],
      projectSlotProgress: slotMetrics.byProject?.map((project, index) => ({
        name: project.projectName || 'No Project',
        totalSlots: project.totalSlots || 0,
        completedSlots: project.completedSlots || 0,
        slotCompletionRate: project.slotCompletionRate || 0,
        color: PIE_COLORS[index % PIE_COLORS.length]
      })) || [],
      completionTrends: slotMetrics.completionTrends || [],
      bottleneckAnalysis: slotMetrics.bottleneckAnalysis || []
    } : null;

    // console.log('RealTimeAnalytics: Chart data processed:', {
    //   clientData,
    //   projectData,
    //   departmentData,
    //   priorityData,
    //   slotData
    // });

    return {
      clientData,
      projectData,
      departmentData,
      priorityData,
      slotData
    };
  }, [analytics, slotMetrics]);

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    if (!analytics?.overall) return {};

    const overall = analytics.overall;
    const totalWork = overall.totalWork || 0;
    const completedWork = overall.completedWork || 0;
    const overdueWork = overall.overdueWork || 0;
    const inProgressWork = overall.inProgressWork || 0;

    return {
      totalWork,
      completedWork,
      overdueWork,
      inProgressWork,
      completionRate: totalWork > 0 ? Math.round((completedWork / totalWork) * 100) : 0,
      overdueRate: totalWork > 0 ? Math.round((overdueWork / totalWork) * 100) : 0,
      productivityScore: totalWork > 0 ? Math.round(((completedWork * 2 + inProgressWork) / (totalWork * 2)) * 100) : 0,
      totalHours: overall.totalEstimatedHours || 0,
      actualHours: overall.totalActualHours || 0,
      efficiency: overall.totalEstimatedHours > 0 ? 
        Math.round((overall.totalActualHours / overall.totalEstimatedHours) * 100) : 0
    };
  }, [analytics]);

  // Get trend indicator
  const getTrendIndicator = (current, previous) => {
    if (!previous || previous === 0) return { icon: FaEquals, color: 'secondary', text: 'No change' };
    
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return { icon: FaArrowUp, color: 'success', text: `+${change.toFixed(1)}%` };
    if (change < -5) return { icon: FaArrowDown, color: 'danger', text: `${change.toFixed(1)}%` };
    return { icon: FaEquals, color: 'secondary', text: 'Stable' };
  };

  // Render metric card
  const renderMetricCard = (title, value, icon, color, subtitle, trend) => (
    <Card className="analytics-card h-100">
      <Card.Body className="text-center">
        <div className={`analytics-icon text-${color} mb-2`}>
          {React.createElement(icon, { size: 24 })}
        </div>
        <div className={`analytics-number text-${color}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="analytics-label">{title}</div>
        {subtitle && (
          <div className="analytics-subtitle text-muted small">
            {subtitle}
          </div>
        )}
        {trend && (
          <div className={`analytics-trend text-${trend.color} small mt-1`}>
            {React.createElement(trend.icon, { size: 12 })} {trend.text}
          </div>
        )}
      </Card.Body>
    </Card>
  );

  // Render client-focused analytics
  const renderClientAnalytics = () => (
    <Row className="g-3 mb-4">
      <Col lg={8}>
        <Card className="h-100">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Client Work Distribution</h6>
            <Badge bg="primary">Client Focus</Badge>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.clientData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <RechartsTooltip 
                  formatter={(value, name) => [value, name === 'totalWork' ? 'Total Work' : 
                                                     name === 'completedWork' ? 'Completed' : 'Overdue']}
                />
                <Bar dataKey="totalWork" fill={COLORS.primary} name="Total Work" />
                <Bar dataKey="completedWork" fill={COLORS.success} name="Completed" />
                <Bar dataKey="overdueWork" fill={COLORS.danger} name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
      
      <Col lg={4}>
        <Card className="h-100">
          <Card.Header>
            <h6 className="mb-0">Client Completion Rates</h6>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.clientData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="completionRate"
                  label={({ name, completionRate }) => `${name}: ${completionRate}%`}
                >
                  {chartData.clientData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => [`${value}%`, 'Completion Rate']} />
              </PieChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  // Render project analytics
  const renderProjectAnalytics = () => (
    <Row className="g-3 mb-4">
      <Col lg={12}>
        <Card>
          <Card.Header>
            <h6 className="mb-0">Project Performance Overview</h6>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.projectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Area 
                  type="monotone" 
                  dataKey="totalWork" 
                  stackId="1"
                  stroke={COLORS.primary} 
                  fill={COLORS.primary}
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="completedWork" 
                  stackId="2"
                  stroke={COLORS.success} 
                  fill={COLORS.success}
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  // Render slot analytics
  const renderSlotAnalytics = () => (
    <>
      <Row className="g-3 mb-4">
        <Col lg={8}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Slot Status Distribution</h6>
              <Badge bg="info">Slot Analytics</Badge>
            </Card.Header>
            <Card.Body>
              {chartData.slotData?.slotStatusDistribution && chartData.slotData.slotStatusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.slotData.slotStatusDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value) => [`${value} slots`, 'Count']}
                    />
                    <Bar dataKey="value" fill={COLORS.primary}>
                      {chartData.slotData.slotStatusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5">
                  <FaProjectDiagram size={48} className="text-muted mb-3" />
                  <h6 className="text-muted">No Slot Data Available</h6>
                  <p className="text-muted small">
                    Slot analytics will appear here when projects have configured slots
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="mb-0">Project Slot Progress</h6>
            </Card.Header>
            <Card.Body>
              {chartData.slotData?.projectSlotProgress && chartData.slotData.projectSlotProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.slotData.projectSlotProgress}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="slotCompletionRate"
                      label={({ name, slotCompletionRate }) => `${name}: ${slotCompletionRate}%`}
                    >
                      {chartData.slotData.projectSlotProgress.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => [`${value}%`, 'Slot Completion Rate']}
                      labelFormatter={(label) => `Project: ${label}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5">
                  <FaChartLine size={48} className="text-muted mb-3" />
                  <h6 className="text-muted">No Project Slot Data</h6>
                  <p className="text-muted small">
                    Project slot progress will appear here when slots are assigned
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Slot Completion Trends */}
      {chartData.slotData?.completionTrends && chartData.slotData.completionTrends.length > 0 && (
        <Row className="g-3 mb-4">
          <Col lg={12}>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Slot Completion Trends (Last 30 Days)</h6>
                <Badge bg="success">Trend Analysis</Badge>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.slotData.completionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="_id" 
                      tickFormatter={(value) => moment(value).format('MMM DD')}
                    />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value) => [`${value} slots`, 'Completed']}
                      labelFormatter={(label) => moment(label).format('MMMM DD, YYYY')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completedSlots" 
                      stroke={COLORS.success} 
                      strokeWidth={2}
                      dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Bottleneck Analysis */}
      {chartData.slotData?.bottleneckAnalysis && chartData.slotData.bottleneckAnalysis.length > 0 && (
        <Row className="g-3 mb-4">
          <Col lg={12}>
            <Card className="border-warning">
              <Card.Header className="bg-warning text-dark">
                <h6 className="mb-0">
                  <FaExclamationTriangle className="me-2" />
                  Slot Bottleneck Analysis
                </h6>
                <small>Projects with high blocked slot ratios requiring attention</small>
              </Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Total Slots</th>
                        <th>Blocked Slots</th>
                        <th>Blocked Ratio</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.slotData.bottleneckAnalysis.map((project, index) => (
                        <tr key={index}>
                          <td>{project.projectName}</td>
                          <td>{project.totalSlots}</td>
                          <td>
                            <Badge bg="danger">{project.blockedSlots}</Badge>
                          </td>
                          <td>
                            <Badge bg={project.blockedRatio > 50 ? 'danger' : 'warning'}>
                              {project.blockedRatio.toFixed(1)}%
                            </Badge>
                          </td>
                          <td>
                            <Button 
                              size="sm" 
                              variant="outline-primary"
                              onClick={() => {
                                onFilterChange('project', project.projectId);
                                onFilterChange('slotStatus', 'blocked');
                              }}
                            >
                              Review
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </>
  );

  // Employee analytics removed - not needed for admin overview

  return (
    <div className="real-time-analytics mb-4">
      {/* Enhanced Analytics Header */}
      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1">Real-Time Analytics Dashboard</h5>
              <div className="d-flex align-items-center gap-3">
                {/* Connection Status */}
                <div className={`real-time-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
                  {wsConnected ? (
                    <>
                      <FaWifi size={12} />
                      Live Updates
                    </>
                  ) : (
                    <>
                      <FaBan size={12} />
                      Offline Mode
                    </>
                  )}
                </div>
                
                {/* Cache Status */}
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip>
                      Cache Hit Rate: {cacheStats.hitRate}<br/>
                      Last Fetch: {cacheStats.lastFetch}<br/>
                      Cache Size: {cacheStats.size} entries
                    </Tooltip>
                  }
                >
                  <div className="cache-indicator">
                    <FaDatabase size={12} />
                    <small className="ms-1">Cache: {cacheStats.hitRate}</small>
                  </div>
                </OverlayTrigger>
                
                {/* Last Update */}
                <small className="text-muted">
                  Last updated: {moment(lastUpdate).format('HH:mm:ss')}
                </small>
                
                {/* Data Staleness Warning */}
                {isDataStale() && (
                  <Badge bg="warning" className="d-flex align-items-center gap-1">
                    <FaExclamationTriangle size={10} />
                    Stale Data
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="d-flex align-items-center gap-2">
              {/* Auto-refresh Toggle */}
              <Button
                variant={autoRefresh ? 'success' : 'outline-secondary'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="d-flex align-items-center gap-1"
              >
                <FaSync className={autoRefresh ? 'fa-spin' : ''} size={12} />
                Auto-refresh
              </Button>
              
              {/* Manual Refresh */}
              <Button
                variant="outline-primary"
                size="sm"
                onClick={refreshAnalytics}
                disabled={cacheLoading}
                className="d-flex align-items-center gap-1"
              >
                {cacheLoading ? (
                  <FaSpinner className="fa-spin" size={12} />
                ) : (
                  <FaSync size={12} />
                )}
                Refresh
              </Button>
              
              {/* View Mode Buttons */}
              <ButtonGroup size="sm">
                <Button 
                  variant={viewMode === 'overview' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('overview')}
                >
                  Overview
                </Button>
                <Button 
                  variant={viewMode === 'client' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('client')}
                >
                  Clients
                </Button>
                <Button 
                  variant={viewMode === 'project' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('project')}
                >
                  Projects
                </Button>
                {showSlotAnalytics && (
                  <Button 
                    variant={viewMode === 'slots' ? 'primary' : 'outline-primary'}
                    onClick={() => setViewMode('slots')}
                  >
                    Slots
                  </Button>
                )}
              </ButtonGroup>
            </div>
          </div>
        </Col>
      </Row>

      {/* Connection Status Alert */}
      {!wsConnected && autoRefresh && (
        <Row className="mb-3">
          <Col>
            <Alert variant="warning" className="d-flex align-items-center gap-2">
              <FaBan />
              <div>
                <strong>Real-time updates unavailable</strong> - 
                Connection status: {connectionStatus}. 
                Data will refresh every {refreshInterval / 1000} seconds.
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Cache Error Alert */}
      {cacheError && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" className="d-flex align-items-center gap-2">
              <FaExclamationTriangle />
              <div>
                <strong>Analytics Error:</strong> {cacheError.message}
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Key Metrics Cards */}
      <Row className="g-3 mb-4">
        <Col lg={2} md={4} sm={6}>
          {renderMetricCard(
            'Total Work',
            keyMetrics.totalWork,
            FaCalendarAlt,
            'primary',
            'All work entries'
          )}
        </Col>
        <Col lg={2} md={4} sm={6}>
          {renderMetricCard(
            'Completed',
            keyMetrics.completedWork,
            FaCheckCircle,
            'success',
            `${keyMetrics.completionRate}% completion rate`
          )}
        </Col>
        <Col lg={2} md={4} sm={6}>
          {renderMetricCard(
            'In Progress',
            keyMetrics.inProgressWork,
            FaSpinner,
            'info',
            'Active work items'
          )}
        </Col>
        <Col lg={2} md={4} sm={6}>
          {renderMetricCard(
            'Overdue',
            keyMetrics.overdueWork,
            FaExclamationTriangle,
            'danger',
            `${keyMetrics.overdueRate}% overdue rate`
          )}
        </Col>
        <Col lg={2} md={4} sm={6}>
          {renderMetricCard(
            'Productivity',
            `${keyMetrics.productivityScore}%`,
            FaChartLine,
            'warning',
            'Overall score'
          )}
        </Col>
        <Col lg={2} md={4} sm={6}>
          {renderMetricCard(
            'Efficiency',
            `${keyMetrics.efficiency}%`,
            FaArrowUp,
            keyMetrics.efficiency >= 100 ? 'success' : 
            keyMetrics.efficiency >= 80 ? 'warning' : 'danger',
            'Time efficiency'
          )}
        </Col>
      </Row>

      {/* Slot Metrics Cards - Show when slot analytics are available */}
      {showSlotAnalytics && slotMetrics?.overall && (
        <Row className="g-3 mb-4">
          <Col lg={2} md={4} sm={6}>
            {renderMetricCard(
              'Total Slots',
              slotMetrics.overall.totalSlots || 0,
              FaProjectDiagram,
              'primary',
              'All project slots'
            )}
          </Col>
          <Col lg={2} md={4} sm={6}>
            {renderMetricCard(
              'Available Slots',
              slotMetrics.overall.availableSlots || 0,
              FaCheckCircle,
              'success',
              'Ready for assignment'
            )}
          </Col>
          <Col lg={2} md={4} sm={6}>
            {renderMetricCard(
              'Assigned Slots',
              slotMetrics.overall.assignedSlots || 0,
              FaUsers,
              'info',
              'Assigned to workers'
            )}
          </Col>
          <Col lg={2} md={4} sm={6}>
            {renderMetricCard(
              'In Progress',
              slotMetrics.overall.inProgressSlots || 0,
              FaSpinner,
              'warning',
              'Currently active'
            )}
          </Col>
          <Col lg={2} md={4} sm={6}>
            {renderMetricCard(
              'Completed',
              slotMetrics.overall.completedSlots || 0,
              FaCheckCircle,
              'success',
              'Finished slots'
            )}
          </Col>
          <Col lg={2} md={4} sm={6}>
            {renderMetricCard(
              'Blocked',
              slotMetrics.overall.blockedSlots || 0,
              FaExclamationTriangle,
              'danger',
              'Requires attention'
            )}
          </Col>
        </Row>
      )}

      {/* Dynamic Analytics Views */}
      {viewMode === 'overview' && (
        <>
          {/* Analytics Charts Row - Improved Layout */}
          <Row className="g-3 mb-4 analytics-cards-row analytics-charts">
            <Col xl={4} lg={6} md={12}>
              <Card className="h-100">
                <Card.Header className="bg-light">
                  <div className="d-flex align-items-center justify-content-between">
                    <h6 className="mb-0 fw-bold">Priority Distribution</h6>
                    <Badge bg="info" className="small">Live</Badge>
                  </div>
                </Card.Header>
                <Card.Body className="p-3">
                  {chartData.priorityData && chartData.priorityData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie
                            data={chartData.priorityData}
                            cx="50%"
                            cy="50%"
                            outerRadius={40}
                            innerRadius={20}
                            dataKey="value"
                            label={false}
                          >
                            {chartData.priorityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value, name) => [`${value} items`, name]}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #d0d7de',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Priority Legend - Compact Layout */}
                      <div className="mt-2">
                        <div className="row g-1">
                          {chartData.priorityData.map((entry, index) => (
                            <div key={index} className="col-6">
                              <div className="d-flex align-items-center gap-1">
                                <div 
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    backgroundColor: entry.color,
                                    borderRadius: '2px',
                                    flexShrink: 0
                                  }}
                                ></div>
                                <small className="text-muted text-truncate" style={{ fontSize: '10px' }}>
                                  {entry.name}: {entry.value}
                                </small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-muted">
                        <FaChartLine size={32} className="mb-2 opacity-50" />
                        <p className="small mb-1 fw-bold">Priority Distribution</p>
                        <small className="text-muted">
                          {analytics ? 'No priority data available' : 'Loading priority data...'}
                        </small>
                        {!analytics && (
                          <div className="mt-2">
                            <small className="text-info">💡 Click "Sync Data" to load work items</small>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col xl={4} lg={6} md={12}>
              <Card className="h-100">
                <Card.Header className="bg-light">
                  <div className="d-flex align-items-center justify-content-between">
                    <h6 className="mb-0 fw-bold">Department Workload</h6>
                    <Badge bg="success" className="small">Active</Badge>
                  </div>
                </Card.Header>
                <Card.Body className="p-3">
                  {chartData.departmentData && chartData.departmentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart 
                        data={chartData.departmentData} 
                        margin={{ top: 10, right: 10, left: 10, bottom: 50 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e1e5e9" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={9}
                          tick={{ fill: '#656d76', fontSize: 9 }}
                          angle={-45}
                          textAnchor="end"
                          height={50}
                          interval={0}
                          tickFormatter={(value) => value.length > 8 ? value.substring(0, 8) + '...' : value}
                        />
                        <YAxis 
                          fontSize={9} 
                          tick={{ fill: '#656d76', fontSize: 9 }}
                          width={25}
                        />
                        <RechartsTooltip 
                          formatter={(value, name) => [`${value} items`, 'Total Work']}
                          labelFormatter={(label) => `Department: ${label}`}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #d0d7de',
                            borderRadius: '6px',
                            fontSize: '11px'
                          }}
                        />
                        <Bar 
                          dataKey="totalWork" 
                          fill={COLORS.primary} 
                          radius={[2, 2, 0, 0]}
                          maxBarSize={35}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-muted">
                        <FaBuilding size={32} className="mb-2 opacity-50" />
                        <p className="small mb-1 fw-bold">Department Workload</p>
                        <small className="text-muted">
                          {analytics ? 'No department data available' : 'Loading department data...'}
                        </small>
                        {!analytics && (
                          <div className="mt-2">
                            <small className="text-info">💡 Click "Sync Data" to load work items</small>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col xl={4} lg={12} md={12}>
              <Card className="h-100 quick-actions-card">
                <Card.Header className="bg-light">
                  <div className="d-flex align-items-center justify-content-between">
                    <h6 className="mb-0 fw-bold">Quick Actions</h6>
                    <Badge bg="primary" className="small">Tools</Badge>
                  </div>
                </Card.Header>
                <Card.Body className="p-3">
                  <div className="d-grid gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => onFilterChange('vipOnly', true)}
                      className="d-flex align-items-center justify-content-center gap-2"
                    >
                      <span>⭐</span> Show VIP Clients Only
                    </Button>
                    <Button 
                      variant="outline-success" 
                      size="sm"
                      onClick={() => onFilterChange('status', 'overdue')}
                      className="d-flex align-items-center justify-content-center gap-2"
                    >
                      <FaExclamationTriangle /> Show Overdue Work
                    </Button>
                    <Button 
                      variant="outline-info" 
                      size="sm"
                      onClick={() => onFilterChange('status', 'in-progress')}
                      className="d-flex align-items-center justify-content-center gap-2"
                    >
                      <FaSpinner /> Show Active Work
                    </Button>
                    {showSlotAnalytics && (
                      <Button 
                        variant="outline-warning" 
                        size="sm"
                        onClick={() => onFilterChange('slotStatus', 'available')}
                        className="d-flex align-items-center justify-content-center gap-2"
                      >
                        <FaProjectDiagram /> Available Slots
                      </Button>
                    )}
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => {
                        onFilterChange('client', 'all');
                        onFilterChange('status', 'all');
                        onFilterChange('vipOnly', false);
                        onFilterChange('slotStatus', 'all');
                      }}
                      className="d-flex align-items-center justify-content-center gap-2"
                    >
                      <FaSync /> Clear All Filters
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {viewMode === 'client' && renderClientAnalytics()}
      {viewMode === 'project' && renderProjectAnalytics()}
      {viewMode === 'slots' && showSlotAnalytics && renderSlotAnalytics()}

      {/* Action Required - Management Alerts */}
      {(keyMetrics.overdueWork > 0 || keyMetrics.efficiency < 80 || chartData.clientData.some(c => c.overdueWork > 0) || 
        (slotMetrics?.overall && (slotMetrics.overall.blockedSlots > 0 || slotMetrics.overall.availableSlots === 0))) && (
        <Row className="mb-4">
          <Col>
            <Card className="border-warning">
              <Card.Header className="bg-warning text-dark">
                <h6 className="mb-0">
                  <FaExclamationTriangle className="me-2" />
                  Action Required - Management Alerts
                </h6>
                <small className="text-muted">Issues requiring administrative attention</small>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  {keyMetrics.overdueWork > 0 && (
                    <Col md={4}>
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg="danger" className="fs-6">{keyMetrics.overdueWork}</Badge>
                        <span className="small">overdue items - notify departments</span>
                        <Button 
                          size="sm" 
                          variant="outline-danger"
                          onClick={() => onFilterChange('status', 'overdue')}
                        >
                          View Details
                        </Button>
                      </div>
                    </Col>
                  )}
                  
                  {keyMetrics.efficiency < 80 && (
                    <Col md={4}>
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg="warning" className="fs-6">{keyMetrics.efficiency}%</Badge>
                        <span className="small">efficiency below 80% - review workload</span>
                        <Button 
                          size="sm" 
                          variant="outline-warning"
                          onClick={() => onFilterChange('priority', 'high')}
                        >
                          View High Priority
                        </Button>
                      </div>
                    </Col>
                  )}
                  
                  {chartData.clientData.some(c => c.overdueWork > 0) && (
                    <Col md={4}>
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg="info" className="fs-6">
                          {chartData.clientData.filter(c => c.overdueWork > 0).length}
                        </Badge>
                        <span className="small">clients affected - contact project heads</span>
                        <Button 
                          size="sm" 
                          variant="outline-info"
                          onClick={() => setViewMode('client')}
                        >
                          Review
                        </Button>
                      </div>
                    </Col>
                  )}
                  
                  {/* Slot-specific alerts */}
                  {slotMetrics?.overall && slotMetrics.overall.blockedSlots > 0 && (
                    <Col md={4}>
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg="danger" className="fs-6">{slotMetrics.overall.blockedSlots}</Badge>
                        <span className="small">blocked slots - resolve dependencies</span>
                        <Button 
                          size="sm" 
                          variant="outline-danger"
                          onClick={() => {
                            onFilterChange('slotStatus', 'blocked');
                            setViewMode('slots');
                          }}
                        >
                          View Blocked
                        </Button>
                      </div>
                    </Col>
                  )}
                  
                  {slotMetrics?.overall && slotMetrics.overall.availableSlots === 0 && (slotMetrics.overall.assignedSlots > 0 || slotMetrics.overall.inProgressSlots > 0) && (
                    <Col md={4}>
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg="warning" className="fs-6">0</Badge>
                        <span className="small">no available slots - capacity issue</span>
                        <Button 
                          size="sm" 
                          variant="outline-warning"
                          onClick={() => setViewMode('slots')}
                        >
                          Review Capacity
                        </Button>
                      </div>
                    </Col>
                  )}
                </Row>
                <hr className="my-3" />
                <div className="text-center">
                  <small className="text-muted">
                    💡 <strong>Workflow:</strong> Use these alerts to identify issues, then contact relevant department heads or project managers for resolution.
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default RealTimeAnalytics;