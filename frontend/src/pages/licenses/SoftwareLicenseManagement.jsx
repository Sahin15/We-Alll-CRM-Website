import React, { useState } from 'react';
import { Container, Tabs, Tab, Card } from 'react-bootstrap';
import { 
  FaChartBar, FaFileCode, FaPlus, FaClipboardList, 
  FaCalendarAlt, FaHistory
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { PAGE_ACCESS, checkPageAccess } from '../../constants/pageAccess';
import useScrollToTop from '../../hooks/useScrollToTop';
import SoftwareLicenseDashboard from './SoftwareLicenseDashboard';
import SoftwareLicenseList from './SoftwareLicenseList';
import AddSoftwareLicense from './AddSoftwareLicense';
import LicenseExpiryAlerts from './LicenseExpiryAlerts';
import LicenseHistory from './LicenseHistory';
import MyLicenses from './MyLicenses';
import '../../styles/profile-tabs.css';

const SoftwareLicenseManagement = () => {
  const { user, canAccess } = useAuth();
  useScrollToTop();

  const isHROrAdmin = checkPageAccess(canAccess, PAGE_ACCESS.licensesManage);
  const isEmployee = user?.role === 'employee';

  // Employees cannot access the admin dashboard endpoint, so default them to My Licenses
  const [activeTab, setActiveTab] = useState(isEmployee ? 'my-licenses' : 'dashboard');

  return (
    <Container fluid className="py-4">
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="nav-tabs-custom profile-tabs-fill"
            style={{ borderBottom: '2px solid #e9ecef' }}
          >
            {/* Dashboard Tab - HR/Admin/Manager/HoD only */}
            {!isEmployee && (
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
            )}

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

            {/* Expiry Alerts Tab - HR/Admin/Manager/HoD only */}
            {!isEmployee && (
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
            )}

            {/* License History Tab - HR/Admin/Manager/HoD only */}
            {!isEmployee && (
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
            )}
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SoftwareLicenseManagement;
