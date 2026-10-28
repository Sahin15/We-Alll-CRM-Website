import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiError, companyParams, socialApi } from "../../api/socialApi";
import {
  PlatformBadge,
  SocialPage,
  StatusPill,
  avatarColor,
  initials,
  useSocial,
} from "./socialShared";

const SocialClients = () => {
  const { company } = useSocial();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState([]);
  const [clients, setClients] = useState([]);
  const [limited, setLimited] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const handle = setTimeout(() => {
      socialApi.clients({
        ...companyParams(company),
        search,
        status,
        department,
      }).then((response) => {
        if (!active) return;
        setClients(response.data?.data || []);
        setDepartments(response.data?.departments || []);
        setLimited(Boolean(response.data?.limited));
        setError("");
      }).catch((err) => {
        if (active) setError(apiError(err, "Clients could not be loaded"));
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [company, search, status, department]);

  return (
    <SocialPage
      title="Clients"
      subtitle="These are the same client records used in Business Management. Social accounts and posts are attached to them."
      actions={<Link className="social-btn" to="/clients">Add client</Link>}
    >
      <div className="social-filters">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients by name, email or industry" />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option>Active</option>
          <option>On Hold</option>
          <option>Lost</option>
        </select>
        <select value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="">All departments</option>
          {departments.map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>
      {error ? <p className="text-danger">{error}</p> : null}
      {limited ? <p className="social-muted">Showing the first 200 matches. Search to narrow the list.</p> : null}
      {clients.length === 0 ? <p className="social-muted">No clients match these filters.</p> : (
        <div className="client-grid">
          {clients.map((client) => (
            <article key={client.id} className="client-card">
              <div className="d-flex justify-content-between gap-2">
                <div className="person">
                  <span className="avatar" style={{ background: avatarColor(client.name) }}>{initials(client.name)}</span>
                  <div>
                    <strong>{client.name}</strong>
                    <div className="social-muted">{client.company || client.industry || "No company on file"}</div>
                  </div>
                </div>
                <StatusPill status={client.status} />
              </div>
              <div className="platform-row my-3">
                {client.platforms.length === 0 ? <span className="social-muted">No social accounts yet</span> : client.platforms.map((id) => (
                  <PlatformBadge key={id} id={id} />
                ))}
              </div>
              <div className="metric-row">
                <div><strong>{client.counts.total}</strong><span>Posts</span></div>
                <div><strong>{client.counts.scheduled}</strong><span>Scheduled</span></div>
                <div><strong>{client.counts.pending}</strong><span>Pending</span></div>
              </div>
              <div className="d-flex gap-2">
                <Link className="social-btn secondary" to={`/clients/${client.id}`}>View client</Link>
                <Link className="social-link align-self-center" to={`/social/accounts?client=${client.id}`}>Accounts</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </SocialPage>
  );
};

export default SocialClients;
