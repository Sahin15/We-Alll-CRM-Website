import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { apiError, socialApi } from "../../api/socialApi";
import { PLATFORMS, SocialPage, platformById, useSocial, useSocialClients } from "./socialShared";

const SocialComposer = () => {
  const { company } = useSocial();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { clients } = useSocialClients(company);
  const [form, setForm] = useState({
    clientId: params.get("client") || "",
    title: "",
    content: "",
    platforms: ["instagram"],
    mediaUrl: "",
    scheduledAt: "",
  });
  const [saving, setSaving] = useState(false);

  const toggle = (id) => {
    setForm((current) => ({
      ...current,
      platforms: current.platforms.includes(id)
        ? current.platforms.filter((item) => item !== id)
        : [...current.platforms, id],
    }));
  };

  const submit = async (action) => {
    setSaving(true);
    try {
      await socialApi.createPost({
        ...form,
        action,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      });
      toast.success(action === "publish" ? "Marked published in the CRM" : "Post saved");
      navigate(action === "submit" ? "/social/approvals" : action === "publish" ? "/social/published" : "/social/calendar");
    } catch (err) {
      toast.error(apiError(err, "The post could not be saved"));
    } finally {
      setSaving(false);
    }
  };

  const client = clients.find((item) => item.id === form.clientId);

  return (
    <SocialPage
      title="Post Composer"
      subtitle="Posts are stored against the existing client. Scheduling does not send them to the social network."
    >
      <div className="composer-layout">
        <form className="social-card social-form" onSubmit={(event) => event.preventDefault()}>
          <label>Client
            <select required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}>
              <option value="">Choose a client</option>
              {clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div>
            <strong>Platforms</strong>
            <div className="mt-2">
              {PLATFORMS.map((item) => (
                <button key={item.id} type="button" className={`platform-toggle ${form.platforms.includes(item.id) ? "on" : ""}`} onClick={() => toggle(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <label>Title
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>Post content
            <textarea rows={6} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
          </label>
          <label>Image link
            <input value={form.mediaUrl} placeholder="https://" onChange={(event) => setForm({ ...form, mediaUrl: event.target.value })} />
          </label>
          <label>Schedule
            <input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
          </label>
          <div className="d-flex gap-2 flex-wrap">
            <button type="button" className="social-btn secondary" disabled={saving} onClick={() => submit("draft")}>Save draft</button>
            <button type="button" className="social-btn secondary" disabled={saving} onClick={() => submit("submit")}>Submit for approval</button>
            <button type="button" className="social-btn" disabled={saving} onClick={() => submit("schedule")}>Schedule post</button>
          </div>
        </form>
        <aside className="preview-card">
          <div className="social-card-head px-3 pt-3">
            <strong>Post preview</strong>
            <span className="social-muted">{client?.name || "Client"}</span>
          </div>
          {form.mediaUrl ? <img src={form.mediaUrl} alt="" /> : <div className="thumb w-100" style={{ height: 180 }} />}
          <div className="copy">
            <div className="mb-2">{form.platforms.map((id) => platformById(id).label).join(" · ") || "No platform selected"}</div>
            <strong>{form.title || "Untitled post"}</strong>
            <p>{form.content || "The caption appears here."}</p>
          </div>
        </aside>
      </div>
    </SocialPage>
  );
};

export default SocialComposer;
