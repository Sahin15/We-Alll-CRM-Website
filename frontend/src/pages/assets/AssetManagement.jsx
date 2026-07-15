import React, { useState } from 'react';
import { 
  FaChartBar, FaBoxes, FaPlus, 
  FaCalendarAlt, FaLaptop, FaTools, FaHistory
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { PAGE_ACCESS, checkPageAccess } from '../../constants/pageAccess';
import useScrollToTop from '../../hooks/useScrollToTop';
import AssetDashboard from './AssetDashboard';
import AssetList from './AssetList';
import AddAsset from './AddAsset';
import AssignmentHistory from './AssignmentHistory';
import RepairLog from './RepairLog';
import WarrantyTracker from './WarrantyTracker';
import MyAssets from './MyAssets';
import './PremiumAssetManagement.css';

const AssetManagement = () => {
  const { user, canAccess } = useAuth();
  useScrollToTop();

  const isHROrAdmin = checkPageAccess(canAccess, PAGE_ACCESS.assetsManage);
  const isEmployee = user?.role === 'employee';

  // Employees cannot access the admin dashboard endpoint, so default them to My Assets
  const [activeTab, setActiveTab] = useState(isEmployee ? 'my-assets' : 'dashboard');

  const tabs = [];

  if (!isEmployee) {
    tabs.push({ id: 'dashboard', label: 'Dashboard', icon: <FaChartBar /> });
  }

  if (isHROrAdmin) {
    tabs.push({ id: 'all-assets', label: 'All Assets', icon: <FaBoxes /> });
    tabs.push({ id: 'add-asset', label: 'Add Asset', icon: <FaPlus /> });
  }

  tabs.push({ id: 'my-assets', label: 'My Assets', icon: <FaLaptop /> });

  if (!isEmployee) {
    tabs.push({ id: 'assignment-history', label: 'Assignments', icon: <FaHistory /> });
    tabs.push({ id: 'repair-log', label: 'Repairs', icon: <FaTools /> });
    tabs.push({ id: 'warranty', label: 'Warranty', icon: <FaCalendarAlt /> });
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AssetDashboard />;
      case 'all-assets': return <AssetList />;
      case 'add-asset': return <AddAsset />;
      case 'my-assets': return <MyAssets />;
      case 'assignment-history': return <AssignmentHistory />;
      case 'repair-log': return <RepairLog />;
      case 'warranty': return <WarrantyTracker />;
      default: return null;
    }
  };

  return (
    <div className="premium-asset-container">
      <div className="premium-header">
        <div>
          <h1>Asset Workspace</h1>
          <p>Manage and track all company equipment and resources efficiently.</p>
        </div>
      </div>

      <div className="premium-tabs-wrapper">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`premium-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="premium-content-area" key={activeTab}>
        {renderContent()}
      </div>
    </div>
  );
};

export default AssetManagement;
