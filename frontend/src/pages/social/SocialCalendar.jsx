import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiError, companyParams, socialApi } from "../../api/socialApi";
import { SocialPage, StatusPill, dayKey, formatWhen, useSocial } from "./socialShared";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SocialCalendar = () => {
  const { company } = useSocial();
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const from = new Date(cursor.year, cursor.month, 1);
    const to = new Date(cursor.year, cursor.month + 1, 0, 23, 59, 59);
    let active = true;
    socialApi.posts({ ...companyParams(company), from: from.toISOString(), to: to.toISOString() })
      .then((response) => {
        if (active) {
          setPosts(response.data?.data || []);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(apiError(err, "The calendar could not be loaded"));
      });
    return () => {
      active = false;
    };
  }, [company, cursor]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1).getDay();
    const days = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const grid = Array.from({ length: first }, () => null);
    for (let day = 1; day <= days; day += 1) grid.push(day);
    return grid;
  }, [cursor]);

  const byDay = posts.reduce((map, post) => {
    const key = dayKey(post.scheduledAt || post.publishedAt || post.createdAt);
    map.set(key, [...(map.get(key) || []), post]);
    return map;
  }, new Map());

  const label = new Date(cursor.year, cursor.month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
  const selectedPosts = selected ? (byDay.get(selected) || []) : posts.slice(0, 8);

  const shift = (amount) => {
    const next = new Date(cursor.year, cursor.month + amount, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
    setSelected("");
  };

  return (
    <SocialPage
      title="Content Calendar"
      subtitle="Scheduled and published posts for the clients in the current company filter."
      actions={<Link className="social-btn" to="/social/composer">Create post</Link>}
    >
      {error ? <p className="text-danger">{error}</p> : null}
      <div className="social-grid-2">
        <article className="social-card">
          <div className="social-card-head">
            <button type="button" className="social-btn secondary" onClick={() => shift(-1)}>Previous</button>
            <h2>{label}</h2>
            <button type="button" className="social-btn secondary" onClick={() => shift(1)}>Next</button>
          </div>
          <div className="calendar-grid mb-2">
            {WEEKDAYS.map((day) => <strong key={day} className="social-muted">{day}</strong>)}
          </div>
          <div className="calendar-grid">
            {cells.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="calendar-cell empty" />;
              const key = dayKey(new Date(cursor.year, cursor.month, day, 12));
              const items = byDay.get(key) || [];
              return (
                <div key={key} className={`calendar-cell ${selected === key ? "selected" : ""}`}>
                  <button type="button" onClick={() => setSelected(key)}>{day}</button>
                  <div className="dots">
                    {items.slice(0, 4).map((post) => <span key={post.id} className={`dot ${post.status}`} />)}
                  </div>
                  {items.length ? <small className="social-muted">{items.length} post{items.length === 1 ? "" : "s"}</small> : null}
                </div>
              );
            })}
          </div>
        </article>
        <article className="social-card">
          <h2>{selected ? `Posts on ${selected}` : "Upcoming posts"}</h2>
          {selectedPosts.length === 0 ? <p className="social-muted">Nothing is scheduled in this view.</p> : selectedPosts.map((post) => (
            <div key={post.id} className="post-row">
              <div className="thumb" />
              <div>
                <strong>{post.title}</strong>
                <div className="social-muted">{post.clientName} · {formatWhen(post.scheduledAt || post.publishedAt)}</div>
              </div>
              <StatusPill status={post.status} />
            </div>
          ))}
        </article>
      </div>
    </SocialPage>
  );
};

export default SocialCalendar;
