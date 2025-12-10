import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Dropdown, Spinner } from 'react-bootstrap';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { toast } from 'react-toastify';
import calendarApi from '../../api/calendarApi';
import departmentApi from '../../api/departmentApi';
import projectApi from '../../api/projectApi';
import { useAuth } from '../../context/AuthContext';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

/**
 * Comprehensive workflow analytics dashboard for admins
 */
const WorkflowAnalyticsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30days');
  const [selectedView, setSelectedView] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedDepartment, selectedTimeRange]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await departmentApi.getAllDepartments();
      setDepartments(Array.isArray(response) ? response : response.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedTimeRange) {
        case '7days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Load workflow analytics
      const analyticsParams = {
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      };

      if (selectedDepartment !== 'all') {
        analyticsParams.department = selectedDepartment;
      }

      const analyticsResponse = await calendarApi.getWorkflowAnalytics(analyticsParams);
      setAnalytics(analyticsResponse.data);
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const getWorkflowTypeChartData = () => {
    if (!analytics) return null;

    const allDepartments = selectedDepartment === 'all' ? Object.keys(analytics) : [selectedDepartment];
    const workflowTypes = {};

    allDepartments.forEach(deptName => {
      const deptData = analytics[deptName];
      if (deptData?.byWorkflowType) {
        Object.entries(deptData.byWorkflowType).forEach(([type, count]) => {
          workflowTypes[type] = (workflowTypes[type] || 0) + count;
        });
      }
    });

    return {
      labels: Object.keys(workflowTypes),
      datasets: [
        {
          label: 'Work Items by Workflow Type',
          data: Object.values(workflowTypes),
          backgroundColor: [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#06B6D4',
          ],
        },
      ],
    };
  };

  const getStageDistributionChartData = () => {
    if (!analytics) return null;

    const allDepartments = selectedDepartment === 'all' ? Object.keys(analytics) : [selectedDepartment];
    const stages = {};

    allDepartments.forEach(deptName => {
      const deptData = analytics[deptName];
      if (deptData?.byStage) {
        Object.entries(deptData.byStage).forEach(([stage, count]) => {
          stages[stage] = (stages[stage] || 0) + count;
        });
      }
    });

    return {
      labels: Object.keys(stages),
      datasets: [
        {
          label: 'Work Items by Stage',
          data: Object.values(stages),
          backgroundColor: '#3B82F6',
          borderColor: '#1D4ED8',
          borderWidth: 1,
        },
      ],
    };
  };

  const getAssigneeWorkloadChartData = () => {
    if (!analytics) return null;

    const allDepartments = selectedDepartment === 'all' ? Object.keys(analytics) : [selectedDepartment];
    const assignees = {};

    allDepartments.forEach(deptName => {
      const deptData = analytics[deptName];
      if (deptData?.byAssignee) {
        Object.entries(deptData.byAssignee).forEach(([assignee, count]) => {
          assignees[assignee] = (assignees[assignee] || 0) + count;
        });
      }
    });

    // Sort by workload and take top 10
    const sortedAssignees = Object.entries(assignees)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      labels: sortedAssignees.map(([name]) => name),
      datasets: [
        {
          label: 'Work Items Assigned',
          data: sortedAssignees.map(([, count]) => count),
          backgroundColor: '#10B981',
          borderColor: '#059669',
          borderWidth: 1,
        },
      ],
    };
  };

  // Calculate summary statistics
  const getSummaryStats = () => {
    if (!analytics) return {};

    const allDepartments = selectedDepartment === 'all' ? Object.keys(analytics) : [selectedDepartment];
    let totalWorkItems = 0;
    let totalCompleted = 0;
    let totalOverdue = 0;
    let departmentCount = 0;

    allDepartments.forEach(deptName => {
      const deptData = analytics[deptName];
      if (deptData) {
        totalWorkItems += deptData.totalWorkItems || 0;
        departmentCount++;
      }
    });

    return {
      totalWorkItems,
      totalCompleted,
      totalOverdue,
      departmentCount,
      averageItemsPerDepartment: departmentCount > 0 ? Math.round(totalWorkItems / departmentCount) : 0,
    };
  };

  const handleExportData = () => {
    if (!analytics) return;

    const exportData = {
      generatedAt: new Date().toISOString(),
      timeRange: selectedTimeRange,
      department: selectedDepartment,
      analytics: analytics,
      summary: getSummaryStats(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `workflow-analytics-${selectedTimeRange}-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading analytics...</span>
        </Spinner>
      </div>
    );
  }

  const summaryStats = getSummaryStats();
  const workflowTypeData = getWorkflowTypeChartData();
  const stageDistributionData = getStageDistributionChartData();
  const assigneeWorkloadData = getAssigneeWorkloadChartData();

  return (
    <Container fluid className="workflow-analytics-dashboard">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Workflow Analytics Dashboard</h2>
              <p className="text-muted mb-0">
                Comprehensive workflow and productivity insights
              </p>
            </div>
            
            <div className="d-flex gap-2">
              {/* Time Range Filter */}
              <Dropdown>
                <Dropdown.Toggle variant="outline-primary" size="sm">
                  {selectedTimeRange === '7days' ? 'Last 7 Days' :
                   selectedTimeRange === '30days' ? 'Last 30 Days' :
                   selectedTimeRange === '90days' ? 'Last 90 Days' : 'Last 30 Days'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setSelectedTimeRange('7days')}>
                    Last 7 Days
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setSelectedTimeRange('30days')}>
                    Last 30 Days
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setSelectedTimeRange('90days')}>
                    Last 90 Days
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              {/* Department Filter */}
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  {selectedDepartment === 'all' ? 'All Departments' : 
                   departments.find(d => d._id === selectedDepartment)?.name || 'Department'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setSelectedDepartment('all')}>
                    All Departments
                  </Dropdown.Item>
                  {departments.map(dept => (
                    <Dropdown.Item 
                      key={dept._id}
                      onClick={() => setSelectedDepartment(dept._id)}
                    >
                      {dept.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>

              {/* Export Options */}
              <Dropdown>
                <Dropdown.Toggle variant="success" size="sm">
                  Export
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={handleExportData}>
                    Export Data (JSON)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={handlePrintReport}>
                    Print Report
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Button 
                variant="primary" 
                size="sm"
                onClick={loadAnalyticsData}
              >
                Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="text-primary mb-1">{summaryStats.totalWorkItems}</h3>
              <p className="text-muted mb-0">Total Work Items</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="text-success mb-1">{summaryStats.totalCompleted}</h3>
              <p className="text-muted mb-0">Completed Items</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="text-danger mb-1">{summaryStats.totalOverdue}</h3>
              <p className="text-muted mb-0">Overdue Items</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="text-info mb-1">{summaryStats.averageItemsPerDepartment}</h3>
              <p className="text-muted mb-0">Avg Items/Dept</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row className="mb-4">
        {/* Workflow Type Distribution */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Work Items by Workflow Type</h6>
            </Card.Header>
            <Card.Body>
              {workflowTypeData ? (
                <Pie 
                  data={workflowTypeData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                  height={300}
                />
              ) : (
                <div className="text-center py-5 text-muted">
                  No data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Stage Distribution */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Work Items by Current Stage</h6>
            </Card.Header>
            <Card.Body>
              {stageDistributionData ? (
                <Bar 
                  data={stageDistributionData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                  height={300}
                />
              ) : (
                <div className="text-center py-5 text-muted">
                  No data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Assignee Workload */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">Top 10 Assignees by Workload</h6>
            </Card.Header>
            <Card.Body>
              {assigneeWorkloadData ? (
                <Bar 
                  data={assigneeWorkloadData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                  height={300}
                />
              ) : (
                <div className="text-center py-5 text-muted">
                  No data available
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Department Breakdown Table */}
      {selectedDepartment === 'all' && analytics && (
        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-light">
                <h6 className="mb-0">Department Breakdown</h6>
              </Card.Header>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Total Items</th>
                      <th>Workflow Types</th>
                      <th>Active Stages</th>
                      <th>Top Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analytics).map(([deptName, deptData]) => {
                      const topAssignee = Object.entries(deptData.byAssignee || {})
                        .sort(([,a], [,b]) => b - a)[0];
                      
                      return (
                        <tr key={deptName}>
                          <td>
                            <strong>{deptName}</strong>
                          </td>
                          <td>
                            <Badge bg="primary">{deptData.totalWorkItems || 0}</Badge>
                          </td>
                          <td>
                            {Object.keys(deptData.byWorkflowType || {}).map(type => (
                              <Badge key={type} bg="secondary" className="me-1">
                                {type}
                              </Badge>
                            ))}
                          </td>
                          <td>
                            {Object.keys(deptData.byStage || {}).length} stages
                          </td>
                          <td>
                            {topAssignee ? (
                              <span>
                                {topAssignee[0]} 
                                <Badge bg="info" className="ms-1">
                                  {topAssignee[1]}
                                </Badge>
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default WorkflowAnalyticsDashboard;