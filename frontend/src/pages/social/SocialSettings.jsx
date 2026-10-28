import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { PAGE_ACCESS, checkPageAccess } from "../../constants/pageAccess";
import { apiError, socialApi } from "../../api/socialApi";
import { PLATFORMS, SocialPage } from "./socialShared";

const SocialSettings = () => {
  const { canAccess } = useAuth();
  const canMeta = PAGE_ACCESS.crmMetaView
    ? checkPageAccess(canAccess, PAGE_ACCESS.crmMetaView)
    : false;
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    socialApi.settings()
      .then((response) => setForm(response.data?.data || null))
      .catch((err) => setError(apiError(err, "Settings could not be loaded")));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    try {
      const response = await socialApi.saveSettings(form);
      setForm(response.data?.data || form);
      toast.success("Social settings saved");
    } catch (err) {
      toast.error(apiError(err, "Settings could not be saved"));
    }
  };

  if (!form) {
    return <SocialPage title="Settings" showCompany={false}>{error ? <p className="text-danger">{error}</p> : <p>Loading settings…</p>}</SocialPage>;
  }

  return (
    <SocialPage title="Settings" subtitle="Workspace defaults for social planning. Passwords and network tokens are not stored on this page." showCompany={false}>
      <div className="social-grid-2">
        <form className="social-card social-form" onSubmit={save}>
          <h2>Publishing defaults</h2>
          <label>Timezone
            <select value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })}>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
          <label>Content queue
            <select value={form.contentQueue} onChange={(event) => setForm({ ...form, contentQueue: event.target.value })}>
              <option value="general">General</option>
              <option value="client">By client</option>
              <option value="campaign">By campaign</option>
            </select>
          </label>
          <label>Default post type
            <select value={form.defaultPostType} onChange={(event) => setForm({ ...form, defaultPostType: event.target.value })}>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="carousel">Carousel</option>
              <option value="text">Text</option>
            </select>
          </label>
          <label>Workflow
            <select value={form.workflow} onChange={(event) => setForm({ ...form, workflow: event.target.value })}>
              <option value="internal">Internal schedule</option>
              <option value="client_approval">Client approval before scheduling</option>
            </select>
          </label>
          <label className="d-flex align-items-center gap-2">
            <input type="checkbox" checked={form.autoHashtags} onChange={(event) => setForm({ ...form, autoHashtags: event.target.checked })} />
            Suggest hashtags in the composer later
          </label>
          <button className="social-btn" type="submit">Save changes</button>
        </form>
        <article className="social-card">
          <h2>Connected integrations</h2>
          <p className="social-muted">Client profiles for these networks are saved under Accounts. Live publishing is not connected yet.</p>
          {PLATFORMS.slice(0, 4).map((item) => (
            <div key={item.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
              <div>
                <strong>{item.label}</strong>
                <div className="social-muted">{item.id === "facebook" || item.id === "instagram" ? "Lead import is separate" : "Profiles saved per client"}</div>
              </div>
              {item.id === "facebook" || item.id === "instagram" ? (
                canMeta ? <Link className="social-btn secondary" to="/leads/meta-ads">Meta Lead Ads</Link> : <span className="social-muted">Ask an admin</span>
              ) : (
                <Link className="social-btn secondary" to="/social/accounts">Accounts</Link>
              )}
            </div>
          ))}
          <p className="social-muted mt-3 mb-0">Facebook and Instagram credentials stay in the Meta Lead Ads connection. This page never asks for a social password.</p>
        </article>
      </div>
    </SocialPage>
  );
};

export default SocialSettings;
