"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Profile = { id: string; name: string; inchat_id: string };

export default function Home() {
  const [screen, setScreen] = useState<"welcome" | "register" | "login" | "app">("welcome");
  const [tab, setTab] = useState<"Chats" | "Nearby" | "Contacts" | "Cloud" | "Privacy">("Chats");
  const [me, setMe] = useState<Profile | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  function toast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2600);
  }

  // restore session on load (works even if the network is briefly unavailable,
  // since Supabase caches the last session in localStorage)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,name,inchat_id")
        .eq("id", user.id)
        .single();
      if (profile) {
        setMe({ id: profile.id, name: profile.name, inchat_id: profile.inchat_id });
        setScreen("app");
      }
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setMe(null);
    setScreen("welcome");
    toast("Logged out");
  }

  return (
    <div className="wrap">
      <div className="brand">IN<span>CHAT</span></div>
      <div className="tag">Connect privately. Anywhere. Even offline.</div>

      {screen === "welcome" && <Welcome onRegister={() => setScreen("register")} onLogin={() => setScreen("login")} />}
      {screen === "register" && (
        <Register
          onBack={() => setScreen("welcome")}
          onDone={(p) => { setMe(p); setScreen("app"); toast(`Account created — welcome, ${p.name}!`); }}
        />
      )}
      {screen === "login" && (
        <Login
          onBack={() => setScreen("welcome")}
          onDone={(p) => { setMe(p); setScreen("app"); toast(`Logged in as ${p.name}`); }}
        />
      )}
      {screen === "app" && me && (
        <AppShell tab={tab} setTab={setTab} me={me} onLogout={logout} toast={toast} />
      )}

      <div className={`toast ${toastMsg ? "show" : ""}`}>{toastMsg}</div>
    </div>
  );
}

function Welcome({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="dim" style={{ marginBottom: 24 }}>Private · Secure · Offline</p>
      <button className="btn primary" onClick={onRegister}>Create Account</button>
      <button className="btn ghost" onClick={onLogin}>Log In</button>
    </div>
  );
}

function Register({ onBack, onDone }: { onBack: () => void; onDone: (p: Profile) => void }) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    const cleanId = id.trim().toLowerCase().replace(/^@/, "");
    if (!name.trim() || !cleanId || !email.trim() || password.length < 6) {
      setErr("Fill in every field (password: 6+ characters).");
      return;
    }
    if (!/^[a-z0-9_]{3,24}$/.test(cleanId)) {
      setErr("InChat ID: 3-24 letters, numbers or _");
      return;
    }
    setBusy(true);
    // Is the ID already taken?
    const { data: existing } = await supabase.from("profiles").select("id").eq("inchat_id", cleanId).maybeSingle();
    if (existing) { setErr("That InChat ID is already taken."); setBusy(false); return; }

    const { data: signUp, error } = await supabase.auth.signUp({ email, password });
    if (error) { setErr(error.message); setBusy(false); return; }
    const user = signUp.user;
    if (!user) { setErr("Check your email to confirm your account, then log in."); setBusy(false); return; }

    const { error: profErr } = await supabase.from("profiles").insert({ id: user.id, name: name.trim(), inchat_id: cleanId });
    if (profErr) { setErr(profErr.message); setBusy(false); return; }

    onDone({ id: user.id, name: name.trim(), inchat_id: cleanId });
  }

  return (
    <div className="card">
      <input className="field" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
      <input className="field" placeholder="Choose an InChat ID (e.g. bhargav_27)" value={id} onChange={e => setId(e.target.value)} />
      <input className="field" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="field" type="password" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} />
      <div className="err">{err}</div>
      <button className="btn primary" disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create Account"}</button>
      <div className="link" onClick={onBack}>← Back</div>
    </div>
  );
}

function Login({ onBack, onDone }: { onBack: () => void; onDone: (p: Profile) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setBusy(false); return; }
    const { data: profile, error: profErr } = await supabase
      .from("profiles").select("id,name,inchat_id").eq("id", data.user.id).single();
    setBusy(false);
    if (profErr || !profile) { setErr("No profile found for this account."); return; }
    onDone(profile);
  }

  return (
    <div className="card">
      <input className="field" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      <div className="err">{err}</div>
      <button className="btn primary" disabled={busy} onClick={submit}>{busy ? "Logging in…" : "Log In"}</button>
      <div className="link" onClick={onBack}>← Back</div>
    </div>
  );
}

function AppShell({ tab, setTab, me, onLogout, toast }: {
  tab: string; setTab: (t: any) => void; me: Profile; onLogout: () => void; toast: (m: string) => void;
}) {
  const tabs = ["Chats", "Nearby", "Contacts", "Cloud", "Privacy"];
  return (
    <div>
      <div className="tabs">
        {tabs.map(t => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "Chats" && <Chats toast={toast} />}
      {tab === "Nearby" && <Nearby toast={toast} />}
      {tab === "Contacts" && <Contacts me={me} toast={toast} />}
      {tab === "Cloud" && <Cloud toast={toast} />}
      {tab === "Privacy" && <Privacy me={me} onLogout={onLogout} />}
    </div>
  );
}

function Chats({ toast }: { toast: (m: string) => void }) {
  const rows = [
    ["R", "Rahul", "See you at 6, campus gate"],
    ["👥", "Friends Group", "Kiran: sent a photo"],
    ["A", "Anil", "Message deleted"],
    ["F", "Family", "👻 Disappearing · 1h"],
  ];
  return (
    <div className="card">
      {rows.map(([a, n, p]) => (
        <div className="row" key={n} style={{ cursor: "pointer" }}
          onClick={() => toast("Full messaging is the next build milestone.")}>
          <div className="avatar">{a}</div>
          <div style={{ flex: 1 }}><div className="name">{n}</div><div className="dim">{p}</div></div>
        </div>
      ))}
    </div>
  );
}

function Nearby({ toast }: { toast: (m: string) => void }) {
  const rows = ["Rahul", "Anil", "Kiran"];
  return (
    <div className="card">
      <p className="dim" style={{ marginBottom: 14 }}>No internet — nearby scan (simulated on web)</p>
      {rows.map(n => (
        <div className="row" key={n}>
          <div className="avatar">{n[0]}</div>
          <div style={{ flex: 1 }}><div className="name">{n}</div></div>
          <button className="btn primary" style={{ width: "auto", padding: "8px 14px", marginBottom: 0 }}
            onClick={() => toast("Bluetooth/Wi-Fi Direct nearby connect only works in the native mobile app.")}>
            Connect
          </button>
        </div>
      ))}
    </div>
  );
}

function Contacts({ me, toast }: { me: Profile; toast: (m: string) => void }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Profile | null | "notfound">(null);
  const [busy, setBusy] = useState(false);

  async function search() {
    const id = q.trim().toLowerCase().replace(/^@/, "");
    if (!id) return;
    setBusy(true);
    const { data } = await supabase.from("profiles").select("id,name,inchat_id").eq("inchat_id", id).maybeSingle();
    setBusy(false);
    setResult(data ?? "notfound");
  }

  async function addContact(contact: Profile) {
    const { error } = await supabase.from("contacts").insert({ owner_id: me.id, contact_id: contact.id });
    if (error && !error.message.includes("duplicate")) { toast("Couldn't add contact."); return; }
    toast(`Contact request sent to @${contact.inchat_id}`);
  }

  return (
    <div className="card">
      <div className="searchrow">
        <input className="field" placeholder="Search by InChat ID" value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} />
        <button className="btn primary" onClick={search} disabled={busy}>{busy ? "…" : "Search"}</button>
      </div>
      {result === "notfound" && <div className="notfound">No user found for "@{q.trim().replace(/^@/, "")}".</div>}
      {result && result !== "notfound" && (
        <div className="result">
          <div className="avatar">{result.name.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div className="name">{result.name}</div>
            <div className="dim">@{result.inchat_id}</div>
          </div>
          {result.id === me.id
            ? <span className="dim">This is you</span>
            : <button className="btn primary" style={{ width: "auto", padding: "8px 14px", marginBottom: 0 }}
                onClick={() => addContact(result)}>Add</button>}
        </div>
      )}
    </div>
  );
}

function Cloud({ toast }: { toast: (m: string) => void }) {
  const tiles = ["📷 Photos", "🎥 Videos", "📄 Documents", "💬 Chat Backups"];
  return (
    <div className="card">
      <p className="dim" style={{ marginBottom: 14 }}>Storage: 7.2 GB / 15 GB</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {tiles.map(t => (
          <div key={t} style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, cursor: "pointer" }}
            onClick={() => toast("File storage is the next build milestone.")}>{t}</div>
        ))}
        <div style={{ gridColumn: "1/3", background: "var(--panel2)", border: "1px solid var(--signal-dim)", borderRadius: 12, padding: 14, color: "var(--signal)", cursor: "pointer" }}
          onClick={() => toast("Vault unlock (PIN/biometrics) ships with the mobile app.")}>🔐 Private Vault — locked</div>
      </div>
    </div>
  );
}

function Privacy({ me, onLogout }: { me: Profile; onLogout: () => void }) {
  const [state, setState] = useState({ enc: true, lock: true, bio: true, disap: true, qr: true });
  const items: [keyof typeof state, string][] = [
    ["enc", "End-to-End Encryption"], ["lock", "App Lock"], ["bio", "Biometric Lock"],
    ["disap", "Disappearing Messages"], ["qr", "QR Contact Verification"],
  ];
  return (
    <div className="card">
      {items.map(([k, label]) => (
        <div key={k} className="row" style={{ cursor: "pointer" }} onClick={() => setState(s => ({ ...s, [k]: !s[k] }))}>
          <div style={{ flex: 1 }}>{label}</div>
          <div style={{ color: state[k] ? "var(--signal)" : "var(--paper-dim)" }}>{state[k] ? "✓ On" : "Off"}</div>
        </div>
      ))}
      <p style={{ marginTop: 16, fontSize: 12.5 }}>Signed in as <b style={{ color: "var(--signal)" }}>{me.name}</b> · @{me.inchat_id}</p>
      <button className="btn danger" onClick={onLogout}>Log Out</button>
    </div>
  );
}
