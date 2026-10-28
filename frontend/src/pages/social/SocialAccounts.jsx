import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { apiError, companyParams, socialApi } from "../../api/socialApi";
import {
  ClientLink,
  PLATFORMS,
  PlatformBadge,
  SocialPage,
  StatusPill,
  formatCount,
  formatWhen,
  useSocial,
  useSocialClients,
} from "./socialShared";

const emptyForm = {
  clientId: "",
  platform: "instagram",
  accountName: "",
  handle: "",
  profileUrl: "",
  followers: "",
  notes: "",
};

const SocialAccounts = () => {
  const { company } = useSocial();
  const [params] = useSearchParams();
  const presetClient = params.get("client") || "";
  const { clients } = useSocialClients(company);
  const [clientId, setClientId] = useState(presetClient);
  const [platform, setPlatform] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...emptyForm, clientId: presetClient });
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    socialApi.accounts({ ...companyParams(company), clientId, platform })
      .then((response) => {
        setAccounts(response.data?.data || []);
        setError("");
      })
      .catch((err) => setError(apiError(err, "Accounts could not be loaded")));
  };

  useEffect(() => {
    load();
  }, [company, clientId, platform]);

  useEffect(() => {
    if (presetClient) setClientId(presetClient);
  }, [presetClient]);

  const openCreate = (nextPlatform) => {
    setEditing(null);
    setForm({ ...emptyForm, clientId: clientId || presetClient, platform: nextPlatform || "instagram" });
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      followers: form.followers === "" || form.followers == null ? null : Number(form.followers),
    };
    try {
      if (editing) await socialApi.updateAccount(editing, payload);
      else await socialApi.createAccount(payload);
      toast.success(editing ? "Account updated" : "Account saved on the client");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(apiError(err, "The account could not be saved"));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this social account from the client?")) return;
    try {
      await socialApi.deleteAccount(id);
      toast.success("Account removed");
      load();
    } catch (err) {
      toast.error(apiError(err, "The account could not be removed"));
    }
  };

  const selected = clients.find((client) => client.id === clientId);
  const cards = clientId
    ? PLATFORMS.map((item) => ({
      platform: item,
      account: accounts.find((account) => account.platform === item.id) || null,
    }))
    : accounts.map((account) => ({ platform: PLATFORMS.find((item) => item.id === account.platform), account }));

  return (
    <SocialPage
      title="Social Accounts"
      subtitle="Save each client's public profile here. Facebook and Instagram lead import stays in Meta Lead Ads."
      actions={<button type="button" className="social-btn" onClick={() => openCreate()}>Add account</button>}
    >
      <div className="social-filters">
        <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
          <option value="">All clients</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
          <option value="">All platforms</option>
          {PLATFORMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      {error ? <p className="text-danger">{error}</p> : null}
      {selected ? <p className="social-muted">Showing platforms for <ClientLink id={selected.id}>{selected.name}</ClientLink>.</p> : null}
      <div className="account-grid">
        {cards.filter((card) => !platform || card.platform?.id === platform || card.account?.platform === platform).map((card) => {
          const account = card.account;
          const item = card.platform;
          return (
            <article key={account?.id || item.id} className="account-card">
              <div className="d-flex justify-content-between">
                <PlatformBadge id={item?.id || account.platform} />
                <StatusPill status={account?.status || "disconnected"} />
              </div>
              <h3 className="h6 mt-3 mb-1">{account?.accountName || item.label}</h3>
              <div className="social-muted">{account ? `@${account.handle}` : "No profile saved"}</div>
              {account ? (
                <>
                  <div className="social-muted mt-2">{account.clientName}</div>
                  <div className="metric-row">
                    <div><strong>{formatCount(account.followers)}</strong><span>Followers</span></div>
                    <div><strong>{account.status === "connected" ? "Saved" : "Off"}</strong><span>In CRM</span></div>
                  </div>
                  <div className="social-muted">Updated {formatWhen(account.connectedAt)}</div>
                  <div className="d-flex gap-2 mt-3">
                    <button type="button" className="social-btn secondary" onClick={() => { setEditing(account.id); setForm({ ...account, followers: account.followers ?? "" }); setOpen(true); }}>Manage</button>
                    <button type="button" className="social-link" onClick={() => remove(account.id)}>Remove</button>
                  </div>
                </>
              ) : (
                <button type="button" className="social-btn mt-3" onClick={() => openCreate(item.id)}>Add {item.label}</button>
              )}
            </article>
          );
        })}
      </div>

      {open ? (
        <div className="social-modal-backdrop" onClick={() => setOpen(false)}>
          <form className="social-modal social-form" onClick={(event) => event.stopPropagation()} onSubmit={save}>
            <h2 className="h5">{editing ? "Manage account" : "Add account"}</h2>
            <p className="social-muted">This stores the client's profile in the CRM. It does not sign in to the social network.</p>
            <label>Client
              <select required value={form.clientId || ""} onChange={(event) => setForm({ ...form, clientId: event.target.value })} disabled={Boolean(editing)}>
                <option value="">Choose a client</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            <label>Platform
              <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} disabled={Boolean(editing)}>
                {PLATFORMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label>Account name
              <input required value={form.accountName || ""} onChange={(event) => setForm({ ...form, accountName: event.target.value })} />
            </label>
            <label>Handle
              <input required value={form.handle || ""} onChange={(event) => setForm({ ...form, handle: event.target.value })} />
            </label>
            <label>Profile link
              <input value={form.profileUrl || ""} placeholder="https://" onChange={(event) => setForm({ ...form, profileUrl: event.target.value })} />
            </label>
            <label>Followers, if you already know the number
              <input value={form.followers ?? ""} onChange={(event) => setForm({ ...form, followers: event.target.value })} />
            </label>
            <div className="d-flex gap-2">
              <button className="social-btn" type="submit">Save</button>
              <button className="social-btn secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}
    </SocialPage>
  );
};

export default SocialAccounts;
