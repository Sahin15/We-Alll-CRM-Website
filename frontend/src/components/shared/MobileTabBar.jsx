/**
 * Horizontal scrollable pill tabs on mobile; renders desktop children on larger screens.
 */
const MobileTabBar = ({ tabs, activeKey, onSelect, desktopChildren }) => {
  return (
    <>
      <div className="mobile-tab-bar" role="tablist" aria-label="Section tabs">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeKey === key}
            className={`mobile-tab-bar__pill touch-target ${
              activeKey === key ? "mobile-tab-bar__pill--active" : ""
            }`}
            onClick={() => onSelect(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="desktop-tab-nav">{desktopChildren}</div>
    </>
  );
};

export default MobileTabBar;
