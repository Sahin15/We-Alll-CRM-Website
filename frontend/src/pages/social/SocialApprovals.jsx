import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { apiError, companyParams, socialApi } from "../../api/socialApi";
import { ClientLink, SocialPage, formatWhen, useSocial } from "./socialShared";

const SocialApprovals = () => {
  const { company } = useSocial();
  const [posts, setPosts] = useState([]);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");

  const load = () => {
    socialApi.posts({ ...companyParams(company), status: "pending,changes_requested" })
      .then((response) => {
        setPosts(response.data?.data || []);
        setError("");
      })
      .catch((err) => setError(apiError(err, "Approvals could not be loaded")));
  };

  useEffect(() => {
    load();
  }, [company]);

  const act = async (id, action) => {
    try {
      await socialApi.act(id, action, action === "request-changes" ? { note: notes[id] || "" } : {});
      toast.success(action === "approve" ? "Post approved and scheduled" : "Changes requested");
      load();
    } catch (err) {
      toast.error(apiError(err, "The post could not be updated"));
    }
  };

  return (
    <SocialPage
      title="Approvals"
      subtitle="Review posts before they are marked ready. Approving schedules the post in the CRM."
      actions={<Link className="social-btn" to="/social/composer">Create post</Link>}
    >
      {error ? <p className="text-danger">{error}</p> : null}
      <article className="social-card">
        {posts.length === 0 ? <p className="social-muted mb-0">Nothing is waiting for approval.</p> : posts.map((post) => (
          <div key={post.id} className="post-row">
            {post.mediaUrl ? <img src={post.mediaUrl} alt="" /> : <div className="thumb" />}
            <div>
              <strong>{post.title}</strong>
              <div className="social-muted">
                <ClientLink id={post.clientId}>{post.clientName}</ClientLink>
                {" · "}{formatWhen(post.scheduledAt || post.createdAt)}
              </div>
              <p className="mb-2">{post.content}</p>
              {post.approvalNote ? <p className="social-muted">Note: {post.approvalNote}</p> : null}
              <input
                value={notes[post.id] || ""}
                placeholder="What should change?"
                onChange={(event) => setNotes({ ...notes, [post.id]: event.target.value })}
              />
            </div>
            <div className="d-flex flex-column gap-2">
              <button type="button" className="social-btn" onClick={() => act(post.id, "approve")}>Approve</button>
              <button type="button" className="social-btn secondary" onClick={() => act(post.id, "request-changes")}>Request changes</button>
            </div>
          </div>
        ))}
      </article>
    </SocialPage>
  );
};

export default SocialApprovals;
