import { createContext, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { socialApi } from "../../api/socialApi";

const SocialContext = createContext(null);

export const PLATFORMS = [
  { id: "instagram", label: "Instagram", color: "#E1306C", letter: "Ig" },
  { id: "facebook", label: "Facebook", color: "#1877F2", letter: "Fb" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2", letter: "in" },
  { id: "youtube", label: "YouTube", color: "#FF0000", letter: "Yt" },
  { id: "tiktok", label: "TikTok", color: "#111111", letter: "Tk" },
  { id: "x", label: "X (Twitter)", color: "#111111", letter: "X" },
  { id: "google_business", label: "Google Business", color: "#4285F4", letter: "G" },
  { id: "pinterest", label: "Pinterest", color: "#E60023", letter: "P" },
  { id: "threads", label: "Threads", color: "#111111", letter: "@" },
];

const STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending approval",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
  changes_requested: "Changes requested",
  connected: "Connected",
  disconnected: "Not connected",
  Active: "Active",
  "On Hold": "On hold",
  Lost: "Lost",
};

/**
 * @param {{ value: { company: string, setCompany: (value: string) => void }, children: import("react").ReactNode }} props
 */
export function SocialProvider({ value, children }) {
  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const value = useContext(SocialContext);
  if (!value) throw new Error("Social pages must render inside the social workspace");
  return value;
}

export function platformById(id) {
  return PLATFORMS.find((item) => item.id === id) || { id, label: id, color: "#667085", letter: "?" };
}

export function PlatformBadge({ id }) {
  const platform = platformById(id);
  return (
    <span className="social-icon" style={{ background: platform.color, color: "#fff" }} title={platform.label}>
      {platform.letter}
    </span>
  );
}

export function StatusPill({ status }) {
  return <span className={`pill ${String(status || "").replace(/\s/g, "")}`}>{STATUS_LABELS[status] || status}</span>;
}

export function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function avatarColor(name) {
  const colors = ["#7c3aed", "#0f766e", "#b45309", "#1d4ed8", "#be185d", "#047857"];
  const total = String(name || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[total % colors.length];
}

export function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCount(value) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN").format(value);
}

export function dayKey(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

/**
 * @param {{ title: string, subtitle?: string, actions?: import("react").ReactNode, showCompany?: boolean, children: import("react").ReactNode }} props
 */
export function SocialPage({ title, subtitle, actions, showCompany = true, children }) {
  const { company, setCompany, counts } = useSocial();
  return (
    <section>
      <div className="social-page-head">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="social-page-actions">{actions}</div>
      </div>
      {showCompany ? (
        <div className="social-chips">
          {[
            ["all", "All clients", counts?.all],
            ["we-alll", "We Alll", counts?.weAlll],
            ["kolkata-digital", "Kolkata Digital", counts?.kolkataDigital],
          ].map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              className={`social-chip ${id === "we-alll" ? "wealll" : ""} ${id === "kolkata-digital" ? "kolkata" : ""} ${company === id ? "active" : ""}`}
              onClick={() => setCompany(id)}
            >
              {label} {count != null ? count : ""}
            </button>
          ))}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Delta({ value }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className={`social-delta ${up ? "up" : "down"}`}>
      {up ? "↑" : "↓"} {Math.abs(value)}% from the previous 30 days
    </span>
  );
}

export function EmptyState({ children }) {
  return <p className="social-muted mb-0">{children}</p>;
}

export function ClientLink({ id, children }) {
  return <Link className="social-link" to={`/clients/${id}`}>{children}</Link>;
}

export function useSocialClients(company) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    socialApi.clients(company && company !== "all" ? { company } : {})
      .then((response) => {
        if (active) setClients(response.data?.data || []);
      })
      .catch(() => {
        if (active) setClients([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [company]);
  return { clients, loading };
}
