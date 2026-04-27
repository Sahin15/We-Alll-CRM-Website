import React, { useState, useEffect } from 'react';
import { Container, Tabs, Tab, Card } from 'react-bootstrap';
import { 
  FaChartBar, FaFileCode, FaPlus, FaClipboardList, 
  FaCalendarAlt, FaHistory
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import useScrollToTop from '../../hooks/useScrollToTop';
import SoftwareLicenseDashboard from './SoftwareLicenseDashboard';
import SoftwareLicenseList from './SoftwareLicenseList';
import AddSoftwareLicense from './AddSoftwareLicense';
import LicenseExpiryAlerts from './LicenseExpiryAlerts';
import LicenseHistory from './LicenseHistory';
import MyLicenses from './MyLicenses';
import '../../styles/profile-tabs.css';

const SoftwareLicenseManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  useScrollToTop();

  const isHROrAdmin = ['hr', 'admin', 'superadmin', 'manager'].includes(user?.role);

  return (
    <Container fluid className="py-4">
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="nav-tabs-custom"
            style={{ borderBottom: '2px solid #e9ecef' }}
          >
            {/* Dashboard Tab */}
            <Tab 
              eventKey="dashboard" 
              title={
                <span>
                  <FaChartBar className="me-2" />
                  Dashboard
                </span>
              }
            >
              <div className="p-4">
                <SoftwareLicenseDashboard />
              </div>
            </Tab>

            {/* All Licenses Tab - HR/Admin/Manager only */}
            {isHROrAdmin && (
              <Tab 
                eventKey="all-licenses" 
                title={
                  <span>
                    <FaFileCode className="me-2" />
                    All Licenses
                  </span>
                }
              >
                <div className="p-4">
                  <SoftwareLicenseList />
                </div>
              </Tab>
            )}

            {/* Add License Tab - HR/Admin/Manager only */}
            {isHROrAdmin && (
              <Tab 
                eventKey="add-license" 
                title={
                  <span>
                    <FaPlus className="me-2" />
                    Add License
                  </span>
                }
              >
                <div className="p-4">
                  <AddSoftwareLicense />
                </div>
              </Tab>
            )}

            {/* Expiry Alerts Tab */}
            <Tab 
              eventKey="expiry-alerts" 
              title={
                <span>
                  <FaCalendarAlt className="me-2" />
                  Expiry Alerts
                </span>
              }
            >
              <div className="p-4">
                <LicenseExpiryAlerts />
              </div>
            </Tab>

            {/* License History Tab */}
            <Tab 
              eventKey="history" 
              title={
                <span>
                  <FaHistory className="me-2" />
                  History
                </span>
              }
            >
              <div className="p-4">
                <LicenseHistory />
              </div>
            </Tab>

            {/* My Licenses Tab */}
            <Tab 
              eventKey="my-licenses" 
              title={
                <span>
                  <FaFileCode className="me-2" />
                  My Licenses
                </span>
              }
            >
              <div className="p-4">
                <MyLicenses />
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SoftwareLicenseManagement;
