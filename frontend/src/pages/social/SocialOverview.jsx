import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiError, companyParams, socialApi } from "../../api/socialApi";
import {
  ClientLink,
  Delta,
  EmptyState,
  PlatformBadge,
  SocialPage,
  StatusPill,
  formatCount,
  formatWhen,
  useSocial,
} from "./socialShared";

const SocialOverview = () => {
  const { company } = useSocial();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    socialApi.overview(companyParams(company))
      .then((response) => {
        if (active) setData(response.data?.data || null);
      })
      .catch((err) => {
        if (active) setError(apiError(err, "The social overview could not be loaded"));
      });
    return () => {
      active = false;
    };
  }, [company]);

  const counts = data?.counts || {};
  const cards = [
    ["Connected accounts", counts.connectedAccounts, data?.deltas?.connectedAccounts, "#e0f2fe"],
    ["Scheduled posts", counts.scheduledPosts, data?.deltas?.scheduledPosts, "#ede9fe"],
    ["Pending approval", counts.pendingApproval, data?.deltas?.pendingApproval, "#ffedd5"],
    ["Published posts", counts.publishedPosts, data?.deltas?.publishedPosts, "#dcfce7"],
  ];

  return (
    <SocialPage
      title="Social Media Management"
      subtitle="Plan content for the clients already in the CRM. Counts below come from saved accounts and posts."
      actions={(
        <>
          <Link className="social-btn" to="/social/composer">Create post</Link>
          <Link className="social-btn secondary" to="/social/accounts">Connect account</Link>
        </>
      )}
    >
      {error ? <p className="text-danger">{error}</p> : null}
      <div className="social-stats">
        {cards.map(([label, value, delta, color]) => (
          <article key={label} className="social-stat">
            <span className="social-icon" style={{ background: color }} />
            <div>
              <span>{label}</span>
              <strong>{formatCount(value || 0)}</strong>
              <Delta value={delta} />
            </div>
          </article>
        ))}
      </div>

      <div className="social-grid-2">
        <article className="social-card">
          <div className="social-card-head">
            <h2>Social accounts by platform</h2>
            <Link className="social-link" to="/social/accounts">View all</Link>
          </div>
          <div className="platform-row">
            {(data?.platforms || []).map((platform) => (
              <div key={platform.id} className="platform-count">
                <PlatformBadge id={platform.id} />
                <strong>{platform.accounts}</strong>
                <small>{platform.label}</small>
              </div>
            ))}
          </div>
        </article>
        <article className="social-card">
          <h2>Publishing overview</h2>
          <p className="social-muted">Posts saved in the CRM over the last 30 days. This is not ad reach.</p>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.publishing || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} hide />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Bar dataKey="published" stackId="posts" fill="#16a34a" name="Published" />
                <Bar dataKey="scheduled" stackId="posts" fill="#2563eb" name="Scheduled" />
                <Bar dataKey="failed" stackId="posts" fill="#dc2626" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="social-grid-2">
        <article className="social-card">
          <div className="social-card-head">
            <h2>Recent posts</h2>
            <Link className="social-link" to="/social/published">View all</Link>
          </div>
          {(data?.recentPosts || []).length === 0 ? <EmptyState>No posts yet. Create one for an existing client.</EmptyState> : (
            <table className="social-table">
              <thead>
                <tr><th>Content</th><th>Client</th><th>Status</th><th>When</th></tr>
              </thead>
              <tbody>
                {data.recentPosts.map((post) => (
                  <tr key={post.id}>
                    <td>{post.title}</td>
                    <td><ClientLink id={post.clientId}>{post.clientName}</ClientLink></td>
                    <td><StatusPill status={post.status} /></td>
                    <td>{formatWhen(post.scheduledAt || post.publishedAt || post.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
        <article className="social-card">
          <div className="social-card-head">
            <h2>Client overview</h2>
            <Link className="social-link" to="/clients">Open clients</Link>
          </div>
          {(data?.clients || []).length === 0 ? <EmptyState>Client totals appear after posts are saved.</EmptyState> : (
            <table className="social-table">
              <thead>
                <tr><th>Client</th><th>Accounts</th><th>Scheduled</th><th>Published</th><th>Pending</th></tr>
              </thead>
              <tbody>
                {data.clients.map((client) => (
                  <tr key={client.id}>
                    <td><ClientLink id={client.id}>{client.name}</ClientLink></td>
                    <td>{client.connected}</td>
                    <td>{client.scheduled}</td>
                    <td>{client.published}</td>
                    <td>{client.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </div>
    </SocialPage>
  );
};

export default SocialOverview;
