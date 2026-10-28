import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { socialApi } from "../../api/socialApi";
import { SocialProvider } from "./socialShared";
import SocialOverview from "./SocialOverview";
import SocialClients from "./SocialClients";
import SocialAccounts from "./SocialAccounts";
import SocialCalendar from "./SocialCalendar";
import SocialComposer from "./SocialComposer";
import SocialApprovals from "./SocialApprovals";
import SocialPublished from "./SocialPublished";
import SocialAnalytics from "./SocialAnalytics";
import SocialSettings from "./SocialSettings";
import "./social.css";

const PAGES = {
  "/social": SocialOverview,
  "/social/clients": SocialClients,
  "/social/accounts": SocialAccounts,
  "/social/calendar": SocialCalendar,
  "/social/composer": SocialComposer,
  "/social/approvals": SocialApprovals,
  "/social/published": SocialPublished,
  "/social/analytics": SocialAnalytics,
  "/social/settings": SocialSettings,
};

const SocialWorkspace = () => {
  const { pathname } = useLocation();
  const [company, setCompany] = useState(() => sessionStorage.getItem("social-company") || "all");
  const [counts, setCounts] = useState(null);
  const path = pathname.replace(/\/$/, "") || "/social";
  const Page = PAGES[path];

  useEffect(() => {
    sessionStorage.setItem("social-company", company);
  }, [company]);

  useEffect(() => {
    let active = true;
    socialApi.clients({ countsOnly: "1" })
      .then((response) => {
        if (active) setCounts(response.data?.companyCounts || null);
      })
      .catch(() => {
        if (active) setCounts(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ company, setCompany, counts }), [company, counts]);

  return (
    <SocialProvider value={value}>
      <div className="social-app">
        {Page ? <Page /> : <p>That social page is not available.</p>}
      </div>
    </SocialProvider>
  );
};

export default SocialWorkspace;
