import { Row, Col } from 'react-bootstrap';
import { 
  FaUserCheck, 
  FaTasks, 
  FaClipboardCheck, 
  FaChartLine,
  FaUserPlus,
  FaProjectDiagram,
  FaClock,
  FaBriefcase
} from 'react-icons/fa';
import QuickStatsWidget from './QuickStatsWidget';

const AdminQuickStats = ({ stats, onWidgetClick }) => {
  // Calculate attendance percentage
  const attendancePercentage = stats.employees > 0 
    ? Math.round((stats.presentToday / stats.employees) * 100) 
    : 0;

  // Calculate project completion rate
  const projectCompletionRate = stats.projects > 0
    ? Math.round((stats.completedProjects / stats.projects) * 100)
    : 0;

  // Calculate active rate
  const activeProjectRate = stats.projects > 0
    ? Math.round((stats.activeProjects / stats.projects) * 100)
    : 0;

  // Mock trend data (in real app, compare with last week's data)
  const attendanceTrend = attendancePercentage >= 85 ? 'up' : attendancePercentage >= 70 ? 'neutral' : 'down';
  const projectTrend = stats.activeProjects > 5 ? 'up' : 'neutral';
  const clientTrend = stats.clients > 10 ? 'up' : 'neutral';

  return (
    <Row className="g-3 mb-4">
      <Col lg={3} md={6}>
        <QuickStatsWidget
          title="Today's Attendance"
          value={`${attendancePercentage}%`}
          subtitle={`${stats.presentToday} of ${stats.employees} present`}
          trend={attendanceTrend}
          trendValue={attendancePercentage >= 85 ? '+5%' : attendancePercentage >= 70 ? '0%' : '-3%'}
          icon={<FaUserCheck />}
          color="success"
          onClick={() => onWidgetClick && onWidgetClick('attendance')}
        />
      </Col>

      <Col lg={3} md={6}>
        <QuickStatsWidget
          title="Active Projects"
          value={stats.activeProjects}
          subtitle={`${activeProjectRate}% of total projects`}
          trend={projectTrend}
          trendValue={stats.activeProjects > 5 ? '+2' : '0'}
          icon={<FaProjectDiagram />}
          color="primary"
          onClick={() => onWidgetClick && onWidgetClick('projects')}
        />
      </Col>

      <Col lg={3} md={6}>
        <QuickStatsWidget
          title="Pending Approvals"
          value={stats.pendingLeaves}
          subtitle="Leave requests awaiting"
          trend={stats.pendingLeaves > 5 ? 'up' : 'neutral'}
          trendValue={stats.pendingLeaves > 5 ? `+${stats.pendingLeaves - 5}` : '0'}
          icon={<FaClipboardCheck />}
          color="warning"
          onClick={() => onWidgetClick && onWidgetClick('approvals')}
        />
      </Col>

      <Col lg={3} md={6}>
        <QuickStatsWidget
          title="Project Completion"
          value={`${projectCompletionRate}%`}
          subtitle={`${stats.completedProjects} completed`}
          trend={projectCompletionRate >= 50 ? 'up' : 'neutral'}
          trendValue={projectCompletionRate >= 50 ? '+8%' : '+2%'}
          icon={<FaTasks />}
          color="info"
          onClick={() => onWidgetClick && onWidgetClick('completion')}
        />
      </Col>

      <Col lg={3} md={6}>
        <QuickStatsWidget
          title="New Clients"
          value={stats.clients}
          subtitle="Total active clients"
          trend={clientTrend}
          trendValue={stats.clients > 10 ? '+3' : '+1'}
          icon={<FaUserPlus />}
          color="success"
          onClick={() => onWidgetClick && onWidgetClick('clients')}
        />
      </Col>

      <Col lg={3} md={6}>
        <QuickStatsWidget
          title="Hot Leads"
          value={stats.leads}
          subtitle="Potential conversions"
          trend="up"
          trendValue="+5"
          icon={<FaChartLine />}
          color="danger"
          onClick={() => onWidgetClick && onWidgetClick('leads')}
        />
      </Col>

      <Col lg={3} md={6}>
        <QuickStatsWidget
          title="Late Arrivals"
          value={stats.lateToday}
          subtitle="Today's late check-ins"
          trend={stats.lateToday > 2 ? 'up' : stats.lateToday === 0 ? 'down' : 'neutral'}
          trendValue={stats.lateToday > 2 ? `+${stats.lateToday}` : stats.lateToday === 0 ? '-2' : '0'}
          icon={<FaClock />}
          color={stats.lateToday > 2 ? 'danger' : 'success'}
          onClick={() => onWidgetClick && onWidgetClick('late')}
        />
      </Col>

      <Col lg={3} md={6}>
        <QuickStatsWidget
          title="Office Health"
          value={`${stats.officeHealth}%`}
          subtitle="HR & Operations"
          trend={stats.officeHealth >= 90 ? 'up' : stats.officeHealth >= 70 ? 'neutral' : 'down'}
          trendValue={stats.officeHealth >= 90 ? '+2%' : stats.officeHealth >= 70 ? '0%' : '-5%'}
          icon={<FaBriefcase />}
          color={stats.officeHealth >= 90 ? 'success' : stats.officeHealth >= 70 ? 'warning' : 'danger'}
          onClick={() => onWidgetClick && onWidgetClick('officeHealth')}
        />
      </Col>
    </Row>
  );
};

export default AdminQuickStats;
