import { useState, useEffect, useCallback } from 'react';
import { cachedApiCall, invalidateResource } from '../api/cachedApi';
import { userApi } from '../api/userApi';
import { projectApi } from '../api/projectApi';
import { clientApi } from '../api/clientApi';
import { departmentApi } from '../api/departmentApi';
import { leadApi } from '../api/leadApi';
import { attendanceApi } from '../api/attendanceApi';
import { leaveApi } from '../api/leaveApi';
import { announcementApi } from '../api/announcementApi';
import { documentApi } from '../api/documentApi';
import { policyApi } from '../api/policyApi';
import { meetingApi } from '../api/meetingApi';

/**
 * Custom hook for Admin Dashboard data with caching
 * Reduces redundant API calls and improves performance
 */
export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    employees: 0,
    projects: 0,
    clients: 0,
    activeProjects: 0,
    pendingLeaves: 0,
    presentToday: 0,
    systemHealth: 100,
    officeHealth: 95,
    departments: 0,
    leads: 0,
    lateToday: 0,
    onLeaveToday: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    cancelledProjects: 0,
    adminCount: 0,
    hrCount: 0,
    employeeCount: 0,
    managerCount: 0,
    departmentNames: [],
    departmentEmployees: [],
    departmentProjects: [],
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);

      // Fetch all data with caching (5 minute TTL)
      const [
        usersRes,
        projectRes,
        clientRes,
        departmentRes,
        leadsRes,
        announcementsRes,
        documentsRes,
        policiesRes,
        meetingsRes,
      ] = await Promise.all([
        cachedApiCall('dashboard_users', () => userApi.getAllUsers(), { 
          ttl: 5 * 60 * 1000, 
          forceRefresh 
        }),
        cachedApiCall('dashboard_projects', () => projectApi.getAllProjects(), { 
          ttl: 5 * 60 * 1000, 
          forceRefresh 
        }),
        cachedApiCall('dashboard_clients', () => clientApi.getAllClients(), { 
          ttl: 5 * 60 * 1000, 
          forceRefresh 
        }),
        cachedApiCall('dashboard_departments', () => departmentApi.getAllDepartments(), { 
          ttl: 5 * 60 * 1000, 
          forceRefresh 
        }).catch(() => ({ data: [] })),
        cachedApiCall('dashboard_leads', () => leadApi.getAllLeads(), { 
          ttl: 5 * 60 * 1000, 
          forceRefresh 
        }).catch(() => ({ data: [] })),
        cachedApiCall('dashboard_announcements', () => announcementApi.getAllAnnouncements(), { 
          ttl: 2 * 60 * 1000, // 2 minutes for announcements
          forceRefresh 
        }).catch(() => ({ data: [] })),
        cachedApiCall('dashboard_documents', () => documentApi.getAllDocuments(), { 
          ttl: 10 * 60 * 1000, // 10 minutes for documents
          forceRefresh 
        }).catch(() => ({ data: [] })),
        cachedApiCall('dashboard_policies', () => policyApi.getAllPolicies(), { 
          ttl: 10 * 60 * 1000, // 10 minutes for policies
          forceRefresh 
        }).catch(() => ({ data: [] })),
        cachedApiCall('dashboard_meetings', () => meetingApi.getAllMeetings(), { 
          ttl: 5 * 60 * 1000, 
          forceRefresh 
        }).catch(() => ({ data: [] })),
      ]);

      const users = usersRes.data || [];
      const projects = projectRes.data || [];
      const departments = departmentRes.data || [];

      const employees = users.filter((u) => u.role === 'employee');
      const activeProjects = projects.filter(
        (p) => p.status === 'active' || p.status === 'in-progress'
      );
      const completedProjects = projects.filter((p) => p.status === 'completed');
      const onHoldProjects = projects.filter((p) => p.status === 'on-hold');
      const cancelledProjects = projects.filter((p) => p.status === 'cancelled');

      // User role counts
      const adminCount = users.filter((u) => u.role === 'admin').length;
      const hrCount = users.filter((u) => u.role === 'hr').length;
      const employeeCount = employees.length;
      const managerCount = users.filter((u) => u.role === 'manager').length;

      // Department analytics
      const departmentNames = departments.map((d) => d.name);
      const departmentEmployees = departments.map((d) => d.employeeCount || 0);
      const departmentProjects = departments.map((d) => {
        return projects.filter(
          (p) => p.department?._id === d._id || p.department === d._id
        ).length;
      });

      const today = new Date().toISOString().split('T')[0];
      let presentToday = 0;
      let lateToday = 0;
      let onLeaveToday = 0;

      try {
        const attendanceRes = await cachedApiCall(
          `dashboard_attendance_${today}`,
          () => attendanceApi.getAllAttendance({ date: today }),
          { ttl: 2 * 60 * 1000, forceRefresh } // 2 minutes for attendance
        );
        presentToday = attendanceRes.data?.filter((a) => a.status === 'present').length || 0;
        lateToday = attendanceRes.data?.filter((a) => a.status === 'late').length || 0;

        const allLeavesRes = await cachedApiCall(
          'dashboard_approved_leaves',
          () => leaveApi.getAllLeaves('approved'),
          { ttl: 5 * 60 * 1000, forceRefresh }
        );
        const todayDate = new Date(today);
        onLeaveToday =
          allLeavesRes.data?.filter((leave) => {
            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);
            return todayDate >= startDate && todayDate <= endDate;
          }).length || 0;
      } catch (err) {
        console.log('Attendance/Leave data not available');
      }

      let pendingLeaves = 0;
      try {
        const leavesRes = await cachedApiCall(
          'dashboard_pending_leaves',
          () => leaveApi.getAllLeaves('pending'),
          { ttl: 2 * 60 * 1000, forceRefresh } // 2 minutes for pending leaves
        );
        pendingLeaves = leavesRes.data?.length || 0;
      } catch (err) {
        console.log('Leave data not available');
      }

      // Calculate OFFICE health
      let officeHealth = 100;
      const attendanceRate = employees.length > 0 ? (presentToday / employees.length) * 100 : 100;
      if (attendanceRate < 70) officeHealth -= 15;
      else if (attendanceRate < 85) officeHealth -= 5;
      if (pendingLeaves > 10) officeHealth -= 10;
      else if (pendingLeaves > 5) officeHealth -= 5;
      if (lateToday > 5) officeHealth -= 10;
      else if (lateToday > 2) officeHealth -= 5;
      const totalProjects = projects.length;
      const completionRate = totalProjects > 0 ? (completedProjects.length / totalProjects) * 100 : 100;
      if (completionRate < 30) officeHealth -= 10;
      officeHealth = Math.max(0, Math.min(100, officeHealth));

      // Calculate SYSTEM health
      let systemHealth = 100;
      let apiErrors = 0;
      let apiResponseTime = 0;
      const apiStartTime = Date.now();
      try {
        await Promise.all([
          userApi.getAllUsers().catch(() => { apiErrors++; }),
          projectApi.getAllProjects().catch(() => { apiErrors++; }),
          clientApi.getAllClients().catch(() => { apiErrors++; }),
        ]);
        apiResponseTime = Date.now() - apiStartTime;
      } catch (err) {
        apiErrors++;
      }
      if (apiErrors > 2) systemHealth -= 30;
      else if (apiErrors > 0) systemHealth -= 15;
      if (apiResponseTime > 3000) systemHealth -= 20;
      else if (apiResponseTime > 1500) systemHealth -= 10;
      systemHealth = Math.max(0, Math.min(100, systemHealth));

      setStats({
        users: users.length,
        employees: employees.length,
        projects: projects.length,
        clients: clientRes.data?.length || 0,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        onHoldProjects: onHoldProjects.length,
        cancelledProjects: cancelledProjects.length,
        pendingLeaves,
        presentToday,
        lateToday,
        onLeaveToday,
        systemHealth: Math.round(systemHealth),
        officeHealth: Math.round(officeHealth),
        departments: departments.length,
        leads: leadsRes.data?.length || 0,
        adminCount,
        hrCount,
        employeeCount,
        managerCount,
        departmentNames,
        departmentEmployees,
        departmentProjects,
      });

      // System alerts
      const alerts = [];
      if (pendingLeaves > 5) {
        alerts.push({
          type: 'warning',
          message: `${pendingLeaves} pending leave requests need attention`,
        });
      }
      if (lateToday > 0) {
        alerts.push({
          type: 'danger',
          message: `${lateToday} employees arrived late today`,
        });
      }
      if (presentToday < employees.length * 0.7) {
        alerts.push({
          type: 'info',
          message: 'Attendance is below 70% today',
        });
      }
      setSystemAlerts(alerts);

      // Generate recent activities
      const activities = [];
      let activityId = 1;

      users.slice(-5).reverse().forEach((user) => {
        activities.push({
          id: activityId++,
          type: 'user',
          message: `New user ${user.name} registered as ${user.role}`,
          time: user.createdAt ? new Date(user.createdAt) : new Date(Date.now() - Math.random() * 86400000),
        });
      });

      projects.slice(-5).reverse().forEach((project) => {
        const statusText =
          project.status === 'completed'
            ? 'completed'
            : project.status === 'active'
            ? 'started'
            : `marked as ${project.status}`;
        activities.push({
          id: activityId++,
          type: 'project',
          message: `Project "${project.name}" ${statusText}`,
          time: project.updatedAt ? new Date(project.updatedAt) : new Date(Date.now() - Math.random() * 86400000),
        });
      });

      (clientRes.data || []).slice(-3).reverse().forEach((client) => {
        activities.push({
          id: activityId++,
          type: 'employee',
          message: `New client ${client.name} added to system`,
          time: client.createdAt ? new Date(client.createdAt) : new Date(Date.now() - Math.random() * 86400000),
        });
      });

      activities.sort((a, b) => b.time - a.time);
      setRecentActivities(activities.slice(0, 15));

      setAnnouncements(announcementsRes.data || []);
      setDocuments(documentsRes.data || []);
      setPolicies(policiesRes.data || []);

      const now = new Date();
      const upcoming = (meetingsRes.data || [])
        .filter((meeting) => new Date(meeting.date || meeting.startTime) >= now)
        .sort((a, b) => new Date(a.date || a.startTime) - new Date(b.date || b.startTime))
        .slice(0, 6);
      setUpcomingEvents(upcoming);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refetch = useCallback(() => {
    return fetchDashboardData(true);
  }, [fetchDashboardData]);

  const invalidateCache = useCallback((resource) => {
    invalidateResource(resource);
  }, []);

  return {
    loading,
    stats,
    recentActivities,
    systemAlerts,
    announcements,
    documents,
    policies,
    upcomingEvents,
    refetch,
    invalidateCache,
  };
};

export default useDashboardData;
