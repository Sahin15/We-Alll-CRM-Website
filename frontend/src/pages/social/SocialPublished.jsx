import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { apiError, companyParams, socialApi } from "../../api/socialApi";
import { ClientLink, PLATFORMS, SocialPage, StatusPill, formatCount, formatWhen, platformById, useSocial } from "./socialShared";

const SocialPublished = () => {
  const { company } = useSocial();
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [posts, setPosts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      socialApi.analytics({ ...companyParams(company), days }),
      socialApi.posts({ ...companyParams(company), status: "published,failed", platform, search }),
    ]).then(([analytics, list]) => {
      if (!active) return;
      setSummary(analytics.data?.data || null);
      setPosts(list.data?.data || []);
      setError("");
    }).catch((err) => {
      if (active) setError(apiError(err, "Published posts could not be loaded"));
    });
    return () => {
      active = false;
    };
  }, [company, days, platform, search]);

  const saveMetrics = async (event) => {
    event.preventDefault();
    try {
      await socialApi.updatePost(editing.id, { metrics: editing.metrics });
      toast.success("Recorded results saved");
      setEditing(null);
      setPosts((current) => current.map((post) => (post.id === editing.id ? { ...post, metrics: editing.metrics } : post)));
    } catch (err) {
      toast.error(apiError(err, "Results could not be saved"));
    }
  };

  const counts = summary?.counts || {};
  const recorded = summary?.recorded || {};

  return (
    <SocialPage
      title="Published Posts"
      subtitle="Posts marked published in the CRM. Reach is shown only after someone records it."
      actions={<Link className="social-btn" to="/social/composer">Create post</Link>}
    >
      <div className="social-filters">
        <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
          <option value="">All platforms</option>
          {PLATFORMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search posts" />
      </div>
      {error ? <p className="text-danger">{error}</p> : null}
      <div className="social-stats">
        <article className="social-stat"><div><span>Published</span><strong>{formatCount(counts.published || 0)}</strong></div></article>
        <article className="social-stat"><div><span>Scheduled</span><strong>{formatCount(counts.scheduled || 0)}</strong></div></article>
        <article className="social-stat"><div><span>Failed</span><strong>{formatCount(counts.failed || 0)}</strong></div></article>
        <article className="social-stat"><div><span>Recorded reach</span><strong>{formatCount(recorded.reach)}</strong></div></article>
      </div>
      <article className="social-card">
        <table className="social-table">
          <thead>
            <tr><th>Post</th><th>Client</th><th>Platform</th><th>When</th><th>Status</th><th>Reach</th><th></th></tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr><td colSpan={7} className="social-muted">No published posts match these filters.</td></tr>
            ) : posts.map((post) => (
              <tr key={post.id}>
                <td>{post.title}</td>
                <td><ClientLink id={post.clientId}>{post.clientName}</ClientLink></td>
                <td>{post.platforms.map((id) => platformById(id).label).join(", ")}</td>
                <td>{formatWhen(post.publishedAt)}</td>
                <td><StatusPill status={post.status} /></td>
                <td>{formatCount(post.metrics?.reach)}</td>
                <td><button type="button" className="social-link" onClick={() => setEditing({ id: post.id, metrics: { ...post.metrics } })}>Record results</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
      {editing ? (
        <div className="social-modal-backdrop" onClick={() => setEditing(null)}>
          <form className="social-modal social-form" onClick={(event) => event.stopPropagation()} onSubmit={saveMetrics}>
            <h2 className="h5">Record results</h2>
            <p className="social-muted">Enter numbers you already have. Blank fields stay empty.</p>
            <label>Reach
              <input value={editing.metrics.reach ?? ""} onChange={(event) => setEditing({ ...editing, metrics: { ...editing.metrics, reach: event.target.value } })} />
            </label>
            <label>Clicks
              <input value={editing.metrics.clicks ?? ""} onChange={(event) => setEditing({ ...editing, metrics: { ...editing.metrics, clicks: event.target.value } })} />
            </label>
            <label>Engagement rate %
              <input value={editing.metrics.engagementRate ?? ""} onChange={(event) => setEditing({ ...editing, metrics: { ...editing.metrics, engagementRate: event.target.value } })} />
            </label>
            <div className="d-flex gap-2">
              <button className="social-btn" type="submit">Save</button>
              <button className="social-btn secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}
    </SocialPage>
  );
};

export default SocialPublished;
