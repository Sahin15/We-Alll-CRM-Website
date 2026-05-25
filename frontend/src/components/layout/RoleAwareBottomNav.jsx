import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBreakpoint } from "../../context/BreakpointContext";
import { getBottomNavTabs, isBottomNavActive } from "./bottomNavConfig";
import "./RoleAwareBottomNav.css";

const RoleAwareBottomNav = ({ onMore }) => {
  const { user } = useAuth();
  const { isAppMobile } = useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAppMobile || !user) return null;

  const tabs = getBottomNavTabs(user.role);

  return (
    <nav className="role-bottom-nav" aria-label="Primary mobile navigation">
      {tabs.map((tab) => {
        const { id, label, Icon } = tab;
        const isActive =
          tab.action === "sidebar"
            ? false
            : isBottomNavActive(location.pathname, tab);

        return (
          <button
            key={id}
            type="button"
            className={`role-bottom-nav__item touch-target ${isActive ? "role-bottom-nav__item--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              if (tab.action === "sidebar") {
                onMore?.();
                return;
              }
              if (tab.path) navigate(tab.path);
            }}
          >
            <Icon size={20} aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default RoleAwareBottomNav;
