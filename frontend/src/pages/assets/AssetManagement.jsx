import React, { useState, useEffect } from 'react';
import { Container, Tabs, Tab, Card } from 'react-bootstrap';
import { 
  FaChartBar, FaBoxes, FaPlus, FaClipboardList, 
  FaCalendarAlt, FaLaptop, FaTools, FaHistory
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import useScrollToTop from '../../hooks/useScrollToTop';
import AssetDashboard from './AssetDashboard';
import AssetList from './AssetList';
import AddAsset from './AddAsset';
import AssignmentHistory from './AssignmentHistory';
import RepairLog from './RepairLog';
import WarrantyTracker from './WarrantyTracker';
import MyAssets from './MyAssets';
import '../../styles/profile-tabs.css';

const AssetManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  useScrollToTop();

  const isHROrAdmin = ['hr', 'admin', 'superadmin', 'manager'].includes(user?.role);
  const isEmployee = user?.role === 'employee';

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
                <AssetDashboard />
              </div>
            </Tab>

            {/* All Assets Tab - HR/Admin/Manager only */}
            {isHROrAdmin && (
              <Tab 
                eventKey="all-assets" 
                title={
                  <span>
                    <FaBoxes className="me-2" />
                    All Assets
                  </span>
                }
              >
                <div className="p-4">
                  <AssetList />
                </div>
              </Tab>
            )}

            {/* Add Asset Tab - HR/Admin/Manager only */}
            {isHROrAdmin && (
              <Tab 
                eventKey="add-asset" 
                title={
                  <span>
                    <FaPlus className="me-2" />
                    Add Asset
                  </span>
                }
              >
                <div className="p-4">
                  <AddAsset />
                </div>
              </Tab>
            )}

            {/* Assignment History Tab */}
            <Tab 
              eventKey="assignment-history" 
              title={
                <span>
                  <FaHistory className="me-2" />
                  Assignments
                </span>
              }
            >
              <div className="p-4">
                <AssignmentHistory />
              </div>
            </Tab>

            {/* Repair Log Tab */}
            <Tab 
              eventKey="repair-log" 
              title={
                <span>
                  <FaTools className="me-2" />
                  Repairs
                </span>
              }
            >
              <div className="p-4">
                <RepairLog />
              </div>
            </Tab>

            {/* Warranty Tracker Tab */}
            <Tab 
              eventKey="warranty" 
              title={
                <span>
                  <FaCalendarAlt className="me-2" />
                  Warranty
                </span>
              }
            >
              <div className="p-4">
                <WarrantyTracker />
              </div>
            </Tab>

            {/* My Assets Tab */}
            <Tab 
              eventKey="my-assets" 
              title={
                <span>
                  <FaLaptop className="me-2" />
                  My Assets
                </span>
              }
            >
              <div className="p-4">
                <MyAssets />
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AssetManagement;
