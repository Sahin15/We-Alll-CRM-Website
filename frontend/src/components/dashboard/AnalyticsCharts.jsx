import { Card, Row, Col } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsCharts = ({ stats, onChartClick }) => {
  // Project Status Distribution
  const projectStatusData = {
    labels: ['Active', 'Completed', 'On Hold', 'Cancelled'],
    datasets: [
      {
        label: 'Projects',
        data: [
          stats.activeProjects || 0,
          stats.completedProjects || 0,
          stats.onHoldProjects || 0,
          stats.cancelledProjects || 0
        ],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(0, 123, 255, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(220, 53, 69, 0.8)'
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(0, 123, 255, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(220, 53, 69, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  // User Roles Distribution
  const userRolesData = {
    labels: ['Admin', 'HR', 'Employee', 'Manager'],
    datasets: [
      {
        label: 'Users',
        data: [
          stats.adminCount || 0,
          stats.hrCount || 0,
          stats.employeeCount || 0,
          stats.managerCount || 0
        ],
        backgroundColor: [
          'rgba(220, 53, 69, 0.8)',
          'rgba(23, 162, 184, 0.8)',
          'rgba(40, 167, 69, 0.8)',
          'rgba(255, 193, 7, 0.8)'
        ],
        borderColor: [
          'rgba(220, 53, 69, 1)',
          'rgba(23, 162, 184, 1)',
          'rgba(40, 167, 69, 1)',
          'rgba(255, 193, 7, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  // Monthly Attendance Trend
  const attendanceTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Present',
        data: stats.monthlyAttendance?.present || [85, 88, 90, 87, 92, 89, 91, 93, 88, 90, 92, 94],
        borderColor: 'rgba(40, 167, 69, 1)',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Late',
        data: stats.monthlyAttendance?.late || [8, 7, 5, 9, 4, 6, 5, 4, 7, 6, 5, 3],
        borderColor: 'rgba(255, 193, 7, 1)',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Absent',
        data: stats.monthlyAttendance?.absent || [7, 5, 5, 4, 4, 5, 4, 3, 5, 4, 3, 3],
        borderColor: 'rgba(220, 53, 69, 1)',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Department Performance
  const hasDepartmentData = stats.departmentNames?.length > 0;
  const departmentData = {
    labels: hasDepartmentData ? stats.departmentNames : ['IT', 'HR', 'Sales', 'Marketing', 'Finance'],
    datasets: [
      {
        label: 'Employees',
        data: hasDepartmentData ? stats.departmentEmployees : [25, 8, 15, 12, 10],
        backgroundColor: 'rgba(0, 123, 255, 0.8)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 2
      },
      {
        label: 'Active Projects',
        data: hasDepartmentData ? stats.departmentProjects : [12, 3, 8, 6, 4],
        backgroundColor: 'rgba(40, 167, 69, 0.8)',
        borderColor: 'rgba(40, 167, 69, 1)',
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onChartClick) {
        const index = elements[0].index;
        onChartClick('chart', index);
      }
    }
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 10
        }
      }
    }
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onChartClick) {
        const index = elements[0].index;
        const departmentName = hasDepartmentData 
          ? stats.departmentNames[index] 
          : ['IT', 'HR', 'Sales', 'Marketing', 'Finance'][index];
        onChartClick('departments', departmentName, index);
      }
    }
  };

  const projectChartOptions = {
    ...chartOptions,
    onClick: (event, elements) => {
      if (elements.length > 0 && onChartClick) {
        const index = elements[0].index;
        const labels = ['active', 'completed', 'on-hold', 'cancelled'];
        onChartClick('projects', labels[index]);
      }
    }
  };

  const userChartOptions = {
    ...chartOptions,
    onClick: (event, elements) => {
      if (elements.length > 0 && onChartClick) {
        const index = elements[0].index;
        const labels = ['admin', 'hr', 'employee', 'manager'];
        onChartClick('users', labels[index]);
      }
    }
  };

  return (
    <Row className="g-4 mb-4">
      <Col lg={6}>
        <Card className="border-0 shadow-sm h-100 cursor-pointer dashboard-card">
          <Card.Body>
            <h5 className="mb-4">
              Project Status Distribution
              <small className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>(Click segments for details)</small>
            </h5>
            <div style={{ height: '300px' }}>
              <Doughnut data={projectStatusData} options={projectChartOptions} />
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6}>
        <Card className="border-0 shadow-sm h-100 cursor-pointer dashboard-card">
          <Card.Body>
            <h5 className="mb-4">
              User Roles Distribution
              <small className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>(Click segments for details)</small>
            </h5>
            <div style={{ height: '300px' }}>
              <Doughnut data={userRolesData} options={userChartOptions} />
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={12}>
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <h5 className="mb-4">Monthly Attendance Trend</h5>
            <div style={{ height: '300px' }}>
              <Line data={attendanceTrendData} options={lineChartOptions} />
            </div>
            <small className="text-muted">Note: Showing sample data for monthly trends</small>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={12}>
        <Card className="border-0 shadow-sm cursor-pointer dashboard-card">
          <Card.Body>
            <h5 className="mb-4">
              Department Overview
              <small className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>(Click bars for details)</small>
            </h5>
            <div style={{ height: '300px' }}>
              <Bar data={departmentData} options={barChartOptions} />
            </div>
            {!hasDepartmentData && (
              <small className="text-muted">Note: Showing sample data. Add departments to see real data.</small>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default AnalyticsCharts;
