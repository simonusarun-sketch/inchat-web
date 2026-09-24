"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  name: string;
  inchat_id: string;
};

type Request = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: Profile;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
};

export default function Home() {
  const [screen, setScreen] = useState<
    "welcome" | "register" | "login" | "app"
  >("welcome");

  const [tab, setTab] = useState<
    "Chats" | "Nearby" | "Contacts" | "Cloud" | "Privacy"
  >("Chats");

  const [me, setMe] = useState<Profile | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  function toast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2600);
  }

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id,name,inchat_id")
      .eq("id", user.id)
      .single();

    if (profile) {
      setMe(profile);
      setScreen("app");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setMe(null);
    setScreen("welcome");
    toast("Logged out");
  }

  return (
    <div className="wrap">
      <div className="brand">
        IN<span>CHAT</span>
      </div>

      <div className="tag">
        Connect privately. Anywhere. Even offline.
      </div>

      {screen === "welcome" && (
        <Welcome
          onRegister={() => setScreen("register")}
          onLogin={() => setScreen("login")}
        />
      )}

      {screen === "register" && (
        <Register
          onBack={() => setScreen("welcome")}
          onDone={(p) => {
            setMe(p);
            setScreen("app");
            toast(`Account created — welcome, ${p.name}!`);
          }}
        />
      )}

      {screen === "login" && (
        <Login
          onBack={() => setScreen("welcome")}
          onDone={(p) => {
            setMe(p);
            setScreen("app");
            toast(`Logged in as ${p.name}`);
          }}
        />
      )}

      {screen === "app" && me && (
        <AppShell
          tab={tab}
          setTab={setTab}
          me={me}
          onLogout={logout}
          toast={toast}
        />
      )}

      <div className={`toast ${toastMsg ? "show" : ""}`}>
        {toastMsg}
      </div>
    </div>
  );
}

/* =========================
   WELCOME
========================= */

function Welcome({
  onRegister,
  onLogin,
}: {
  onRegister: () => void;
  onLogin: () => void;
}) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="dim" style={{ marginBottom: 24 }}>
        Private · Secure · Offline
      </p>

      <button className="btn primary" onClick={onRegister}>
        Create Account
      </button>

      <button className="btn ghost" onClick={onLogin}>
        Log In
      </button>
    </div>
  );
}

/* =========================
   REGISTER
========================= */

function Register({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: (p: Profile) => void;
}) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");

    const cleanId = id.trim().toLowerCase().replace(/^@/, "");

    if (
      !name.trim() ||
      !cleanId ||
      !email.trim() ||
      password.length < 6
    ) {
      setErr("Fill in every field (password: 6+ characters).");
      return;
    }

    if (!/^[a-z0-9_]{3,24}$/.test(cleanId)) {
      setErr("InChat ID: 3-24 letters, numbers or _");
      return;
    }

    setBusy(true);

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("inchat_id", cleanId)
      .maybeSingle();

    if (existing) {
      setErr("That InChat ID is already taken.");
      setBusy(false);
      return;
    }

    const { data: signUp, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    const user = signUp.user;

    if (!user) {
      setErr("Account could not be created.");
      setBusy(false);
      return;
    }

    /*
      If email confirmation is enabled, Supabase may not create
      a session immediately. In that case don't try to insert
      the profile because RLS will reject it.
    */
    if (!signUp.session) {
      setErr(
        "Account created. Please confirm your email, then log in."
      );
      setBusy(false);
      return;
    }

    const { error: profErr } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        name: name.trim(),
        inchat_id: cleanId,
      });

    if (profErr) {
      setErr(profErr.message);
      setBusy(false);
      return;
    }

    setBusy(false);

    onDone({
      id: user.id,
      name: name.trim(),
      inchat_id: cleanId,
    });
  }

  return (
    <div className="card">
      <input
        className="field"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="field"
        placeholder="Choose an InChat ID (e.g. bhargav_27)"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />

      <input
        className="field"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="field"
        type="password"
        placeholder="Password (6+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="err">{err}</div>

      <button
        className="btn primary"
        disabled={busy}
        onClick={submit}
      >
        {busy ? "Creating…" : "Create Account"}
      </button>

      <div className="link" onClick={onBack}>
        ← Back
      </div>
    </div>
  );
}

/* =========================
   LOGIN
========================= */

function Login({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: (p: Profile) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    setBusy(true);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    const { data: profile, error: profErr } =
      await supabase
        .from("profiles")
        .select("id,name,inchat_id")
        .eq("id", data.user.id)
        .single();

    setBusy(false);

    if (profErr || !profile) {
      setErr("No profile found for this account.");
      return;
    }

    onDone(profile);
  }

  return (
    <div className="card">
      <input
        className="field"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="field"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="err">{err}</div>

      <button
        className="btn primary"
        disabled={busy}
        onClick={submit}
      >
        {busy ? "Logging in…" : "Log In"}
      </button>

      <div className="link" onClick={onBack}>
        ← Back
      </div>
    </div>
  );
}

/* =========================
   APP SHELL
========================= */

function AppShell({
  tab,
  setTab,
  me,
  onLogout,
  toast,
}: {
  tab: string;
  setTab: (t: any) => void;
  me: Profile;
  onLogout: () => void;
  toast: (m: string) => void;
}) {
  const tabs = [
    "Chats",
    "Nearby",
    "Contacts",
    "Cloud",
    "Privacy",
  ];

  return (
    <div>
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Chats" && (
        <Chats me={me} toast={toast} />
      )}

      {tab === "Nearby" && (
        <Nearby toast={toast} />
      )}

      {tab === "Contacts" && (
        <Contacts me={me} toast={toast} />
      )}

      {tab === "Cloud" && (
        <Cloud toast={toast} />
      )}

      {tab === "Privacy" && (
        <Privacy me={me} onLogout={onLogout} />
      )}
    </div>
  );
}

/* =========================
   CHATS
========================= */

function Chats({
  me,
  toast,
}: {
  me: Profile;
  toast: (m: string) => void;
}) {
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
    loadRequests();

    const channel = supabase
      .channel("friend-request-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `receiver_id=eq.${me.id}`,
        },
        () => {
          loadRequests();
          loadContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me.id]);

  async function loadContacts() {
    const { data: sent } = await supabase
      .from("friend_requests")
      .select("receiver_id")
      .eq("sender_id", me.id)
      .eq("status", "accepted");

    const { data: received } = await supabase
      .from("friend_requests")
      .select("sender_id")
      .eq("receiver_id", me.id)
      .eq("status", "accepted");

    const ids = [
      ...(sent || []).map((x) => x.receiver_id),
      ...(received || []).map((x) => x.sender_id),
    ];

    if (!ids.length) {
      setContacts([]);
      setLoading(false);
      return;
    }

    const uniqueIds = [...new Set(ids)];

    const { data } = await supabase
      .from("profiles")
      .select("id,name,inchat_id")
      .in("id", uniqueIds);

    setContacts(data || []);
    setLoading(false);
  }

  async function loadRequests() {
    const { data } = await supabase
      .from("friend_requests")
      .select(
        "id,sender_id,receiver_id,status,created_at"
      )
      .eq("receiver_id", me.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!data?.length) {
      setRequests([]);
      return;
    }

    const senderIds = data.map((r) => r.sender_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,name,inchat_id")
      .in("id", senderIds);

    const result = data.map((r) => ({
      ...r,
      sender: profiles?.find(
        (p) => p.id === r.sender_id
      ),
    }));

    setRequests(result);
  }

  async function acceptRequest(request: Request) {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", request.id)
      .eq("receiver_id", me.id);

    if (error) {
      toast(error.message);
      return;
    }

    toast("Friend request accepted.");

    await loadRequests();
    await loadContacts();
  }

  async function rejectRequest(request: Request) {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "rejected" })
      .eq("id", request.id)
      .eq("receiver_id", me.id);

    if (error) {
      toast(error.message);
      return;
    }

    toast("Request rejected.");
    await loadRequests();
  }

  if (selected) {
    return (
      <ChatRoom
        me={me}
        person={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div>
      {requests.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            🔔 Friend Requests
          </h3>

          {requests.map((request) => (
            <div className="row" key={request.id}>
              <div className="avatar">
                {request.sender?.name
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <div className="name">
                  {request.sender?.name}
                </div>

                <div className="dim">
                  @{request.sender?.inchat_id}
                </div>
              </div>

              <button
                className="btn primary"
                style={{
                  width: "auto",
                  padding: "7px 10px",
                  marginBottom: 0,
                }}
                onClick={() =>
                  acceptRequest(request)
                }
              >
                Accept
              </button>

              <button
                className="btn ghost"
                style={{
                  width: "auto",
                  padding: "7px 10px",
                  marginBottom: 0,
                }}
                onClick={() =>
                  rejectRequest(request)
                }
              >
                Reject
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          💬 Chats
        </h3>

        {loading && (
          <p className="dim">Loading...</p>
        )}

        {!loading && contacts.length === 0 && (
          <div>
            <p className="dim">
              No chats yet.
            </p>

            <p className="dim">
              Go to <b>Contacts</b>, search an InChat ID
              and send a friend request.
            </p>
          </div>
        )}

        {contacts.map((person) => (
          <div
            className="row"
            key={person.id}
            style={{ cursor: "pointer" }}
            onClick={() => setSelected(person)}
          >
            <div className="avatar">
              {person.name.charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div className="name">
                {person.name}
              </div>

              <div className="dim">
                @{person.inchat_id}
              </div>
            </div>

            <span className="dim">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   CHAT ROOM
========================= */

function ChatRoom({
  me,
  person,
  onBack,
}: {
  me: Profile;
  person: Profile;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat-${me.id}-${person.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const message = payload.new as Message;

          const belongsToChat =
            (message.sender_id === me.id &&
              message.receiver_id === person.id) ||
            (message.sender_id === person.id &&
              message.receiver_id === me.id);

          if (belongsToChat) {
            setMessages((old) => {
              if (
                old.some((m) => m.id === message.id)
              ) {
                return old;
              }

              return [...old, message];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me.id, person.id]);

  async function loadMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id,sender_id,receiver_id,message,created_at"
      )
      .or(
        `and(sender_id.eq.${me.id},receiver_id.eq.${person.id}),and(sender_id.eq.${person.id},receiver_id.eq.${me.id})`
      )
      .order("created_at", {
        ascending: true,
      });

    if (!error) {
      setMessages(data || []);
    }

    setLoading(false);
  }

  async function sendMessage() {
    const clean = text.trim();

    if (!clean || sending) return;

    setSending(true);

    const { error } = await supabase
      .from("messages")
      .insert({
        sender_id: me.id,
        receiver_id: person.id,
        message: clean,
      });

    setSending(false);

    if (error) {
      alert(error.message);
      return;
    }

    setText("");
  }

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 15,
          borderBottom:
            "1px solid var(--line)",
          paddingBottom: 12,
        }}
      >
        <button
          className="btn ghost"
          style={{
            width: "auto",
            marginBottom: 0,
            padding: "7px 12px",
          }}
          onClick={onBack}
        >
          ←
        </button>

        <div className="avatar">
          {person.name.charAt(0).toUpperCase()}
        </div>

        <div>
          <div className="name">
            {person.name}
          </div>

          <div className="dim">
            @{person.inchat_id}
          </div>
        </div>
      </div>

      <div
        style={{
          minHeight: 300,
          maxHeight: 430,
          overflowY: "auto",
          padding: "5px 0",
        }}
      >
        {loading && (
          <p className="dim">
            Loading messages...
          </p>
        )}

        {!loading && messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 50,
            }}
          >
            <div style={{ fontSize: 35 }}>
              💬
            </div>

            <p className="dim">
              No messages yet.
            </p>

            <p className="dim">
              Send the first message!
            </p>
          </div>
        )}

        {messages.map((m) => {
          const mine = m.sender_id === me.id;

          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: mine
                  ? "flex-end"
                  : "flex-start",
                marginBottom: 9,
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "9px 12px",
                  borderRadius: 14,
                  background: mine
                    ? "var(--signal)"
                    : "var(--panel2)",
                  color: mine
                    ? "#000"
                    : "inherit",
                  border: mine
                    ? "none"
                    : "1px solid var(--line)",
                }}
              >
                <div>{m.message}</div>

                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.65,
                    marginTop: 3,
                    textAlign: "right",
                  }}
                >
                  {new Date(
                    m.created_at
                  ).toLocaleTimeString([], {
    
