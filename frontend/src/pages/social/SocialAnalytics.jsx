import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiError, companyParams, socialApi } from "../../api/socialApi";
import { ClientLink, SocialPage, formatCount, platformById, useSocial } from "./socialShared";

const SocialAnalytics = () => {
  const { company } = useSocial();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    socialApi.analytics({ ...companyParams(company), days })
      .then((response) => {
        if (active) setData(response.data?.data || null);
      })
      .catch((err) => {
        if (active) setError(apiError(err, "Analytics could not be loaded"));
      });
    return () => {
      active = false;
    };
  }, [company, days]);

  const recorded = data?.recorded || {};
  const counts = data?.counts || {};

  return (
    <SocialPage
      title="Analytics"
      subtitle="Post activity from the CRM. Follower, reach, and engagement figures appear only when they were recorded on an account or post."
      actions={(
        <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      )}
    >
      {error ? <p className="text-danger">{error}</p> : null}
      <div className="social-stats">
        <article className="social-stat"><div><span>Recorded reach</span><strong>{formatCount(recorded.reach)}</strong></div></article>
        <article className="social-stat"><div><span>Engagement rate</span><strong>{recorded.engagementRate == null ? "—" : `${recorded.engagementRate}%`}</strong></div></article>
        <article className="social-stat"><div><span>Recorded clicks</span><strong>{formatCount(recorded.clicks)}</strong></div></article>
        <article className="social-stat"><div><span>Recorded followers</span><strong>{formatCount(recorded.followers)}</strong><span>{recorded.followerAccounts ? `${recorded.followerAccounts} accounts` : "Not recorded"}</span></div></article>
      </div>
      <div className="social-grid-2">
        <article className="social-card">
          <h2>Posts by day</h2>
          <p className="social-muted">{counts.posts || 0} posts created in this range. Published {counts.published || 0}, scheduled {counts.scheduled || 0}.</p>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.publishing || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Bar dataKey="published" fill="#16a34a" name="Published" />
                <Bar dataKey="scheduled" fill="#2563eb" name="Scheduled" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="social-card">
          <h2>Posts by platform</h2>
          {(data?.byPlatform || []).map((item) => (
            <div key={item.id} className="d-flex justify-content-between py-2 border-bottom">
              <span>{platformById(item.id).label}</span>
              <strong>{item.posts}</strong>
            </div>
          ))}
        </article>
      </div>
      <article className="social-card">
        <h2>Published posts</h2>
        {(data?.topPosts || []).length === 0 ? <p className="social-muted mb-0">No published posts in this range.</p> : (
          <table className="social-table">
            <thead>
              <tr><th>Post</th><th>Client</th><th>Reach</th><th>Engagement</th></tr>
            </thead>
            <tbody>
              {data.topPosts.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td><ClientLink id={post.clientId}>{post.clientName}</ClientLink></td>
                  <td>{formatCount(post.metrics?.reach)}</td>
                  <td>{post.metrics?.engagementRate == null ? "—" : `${post.metrics.engagementRate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </SocialPage>
  );
};

export default SocialAnalytics;
