import { BRAND_NAME } from "../constants/branding";

const ROBOT_META_NAMES = ["robots", "googlebot", "bingbot"];

/**
 * @param {string} name
 * @param {string} content
 */
function upsertNamedMeta(name, content) {
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

/**
 * @param {string} rel
 * @param {string} href
 */
function upsertLink(rel, href) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/**
 * @param {string} rel
 */
function removeLink(rel) {
  document.querySelector(`link[rel="${rel}"]`)?.remove();
}

/**
 * Apply document title, description, robots, and optional canonical URL.
 * @param {{
 *   title?: string,
 *   description?: string,
 *   robots?: string,
 *   canonical?: boolean,
 * }} options
 */
export function applyDocumentMeta({
  title,
  description,
  robots,
  canonical = false,
}) {
  if (title) {
    document.title = title;
  }

  if (description) {
    upsertNamedMeta("description", description);
  }

  if (robots) {
    ROBOT_META_NAMES.forEach((name) => upsertNamedMeta(name, robots));
  }

  if (canonical && typeof window !== "undefined") {
    upsertLink("canonical", `${window.location.origin}${window.location.pathname}`);
  } else {
    removeLink("canonical");
  }
}

/** @type {Record<string, { title: string, description: string, robots: string, canonical?: boolean }>} */
export const PUBLIC_ROUTE_META = {
  "/login": {
    title: `Sign In | ${BRAND_NAME}`,
    description:
      "Sign in to We Alll Office — your secure digital workspace for attendance, work management, leave, and team collaboration.",
    robots: "index, follow",
    canonical: true,
  },
  "/growth-summit-2026": {
    title: `Growth Summit 2026 | ${BRAND_NAME}`,
    description:
      "Growth Summit 2026 registration and event information from We Alll Office.",
    robots: "index, follow",
    canonical: true,
  },
  "/forgot-password": {
    title: `Forgot Password | ${BRAND_NAME}`,
    description: "Request a password reset for your We Alll Office account.",
    robots: "noindex, nofollow, noarchive, nosnippet",
  },
};

/** @type {Record<string, string>} */
export const ROUTE_TITLES = {
  "/dashboard": "Dashboard",
  "/users": "User Management",
  "/employees": "Employees",
  "/employees/add": "Add Employee",
  "/departments": "Departments",
  "/leaves": "Leave Management",
  "/leaves/my-leaves": "My Leaves",
  "/leaves/requests": "Leave Requests",
  "/wfh": "Work From Home",
  "/salary-management": "Salary Management",
  "/salary-preview-management": "Salary Preview",
  "/salary-templates": "Salary Templates",
  "/attendance/my-attendance": "My Attendance",
  "/attendance/tracking": "Attendance Tracking",
  "/worklog/today": "Today's Work Log",
  "/worklog/history": "Work Log History",
  "/projects": "Projects",
  "/clients": "Clients",
  "/leads": "Leads",
  "/profile": "My Profile",
  "/my-profile": "My Profile",
  "/settings": "Settings",
  "/notifications": "Notifications",
  "/work-calendar/my-calendar": "My Work Calendar",
  "/work-calendar/admin-overview": "Work Calendar Overview",
  "/work-calendar/enhanced-admin-overview": "Work Management Dashboard",
  "/register": "Register User",
  "/app": "Mobile App",
  "/mobileapp": "Work Mobile App",
};

const INTERNAL_ROBOTS = "noindex, nofollow, noarchive, nosnippet";
const INTERNAL_DESCRIPTION =
  "We Alll Office internal management system — authorized access only.";

/**
 * Resolve a human-readable page title from the current pathname.
 * @param {string} pathname
 * @returns {string}
 */
export function getRouteTitleFromPath(pathname) {
  if (ROUTE_TITLES[pathname]) {
    return ROUTE_TITLES[pathname];
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const basePath = `/${segments[0]}`;
    if (ROUTE_TITLES[basePath]) {
      return ROUTE_TITLES[basePath];
    }
  }

  const last = segments[segments.length - 1] || "dashboard";
  if (/^[a-f0-9]{24}$/i.test(last) || /^\d+$/.test(last)) {
    const parent = segments[segments.length - 2];
    if (parent) {
      return parent
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }

  return last
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Apply SEO/meta tags for the current route.
 * Public routes (login) may be indexable; authenticated app stays noindex.
 * @param {string} pathname
 */
export function applyRouteDocumentMeta(pathname) {
  const publicMeta = PUBLIC_ROUTE_META[pathname];
  if (publicMeta) {
    applyDocumentMeta(publicMeta);
    return;
  }

  if (pathname.startsWith("/reset-password")) {
    applyDocumentMeta({
      title: `Reset Password | ${BRAND_NAME}`,
      description: "Set a new password for your We Alll Office account.",
      robots: INTERNAL_ROBOTS,
    });
    return;
  }

  const pageTitle = getRouteTitleFromPath(pathname);
  applyDocumentMeta({
    title: `${pageTitle} | ${BRAND_NAME}`,
    description: INTERNAL_DESCRIPTION,
    robots: INTERNAL_ROBOTS,
  });
}
