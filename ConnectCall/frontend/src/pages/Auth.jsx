import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { api } from "../lib/api.js";

function Logo() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#1a73e8"/>
      <path d="M8 14a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H11a3 3 0 01-3-3V14z" fill="#fff"/>
      <path d="M26 17l6-4v14l-6-4V17z" fill="#fff"/>
    </svg>
  );
}

export default function Auth() {
  const { login } = useAuth();
  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lf, setLf] = useState({ username:"", password:"" });
  const [rf, setRf] = useState({ name:"", username:"", password:"" });

  const switchTab = t => { setTab(t); setErr(""); };

  const doLogin = async e => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { const d = await api.login(lf); login(d.token, lf.username, d.name); }
    catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  };

  const doRegister = async e => {
    e.preventDefault(); setErr("");
    if (rf.password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      await api.register(rf);
      const d = await api.login({ username: rf.username, password: rf.password });
      login(d.token, rf.username, rf.name);
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#202124", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center", padding:16 }}>
      <Link to="/" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32, textDecoration:"none" }}>
        <Logo />
        <span style={{ fontSize:21, color:"#e8eaed", fontFamily:"var(--font)" }}>
          Connect<span style={{ color:"#1a73e8" }}>Call</span>
        </span>
      </Link>

      <div style={{ width:"100%", maxWidth:440, background:"#2d2f31",
        border:"1px solid #444746", borderRadius:8, overflow:"hidden" }}>
        {/* tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #444746" }}>
          {["login","register"].map(t => (
            <button key={t} onClick={() => switchTab(t)} style={{
              flex:1, padding:"15px 8px",
              background:"none", border:"none", borderBottom: tab===t ? "3px solid #1a73e8" : "3px solid transparent",
              color: tab===t ? "#1a73e8" : "#9aa0a6",
              fontFamily:"var(--font)", fontSize:14, fontWeight:500,
              cursor:"pointer", marginBottom:-1, transition:"color .15s",
            }}>
              {t === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <div style={{ padding:"28px 28px 32px" }}>
          <p style={{ fontFamily:"var(--font)", fontSize:22, fontWeight:400, color:"#e8eaed", marginBottom:22 }}>
            {tab === "login" ? "Welcome back" : "Join ConnectCall"}
          </p>

          {err && (
            <div style={{ marginBottom:18, padding:"11px 14px", borderRadius:4,
              background:"rgba(234,67,53,.1)", border:"1px solid rgba(234,67,53,.3)",
              color:"#f28b82", fontSize:14 }}>{err}</div>
          )}

          {tab === "login" ? (
            <form onSubmit={doLogin} style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div>
                <label style={{ display:"block", fontSize:12, color:"#9aa0a6", marginBottom:7 }}>Username</label>
                <input className="gm-input" autoComplete="username" placeholder="Enter your username"
                  value={lf.username} onChange={e => setLf({...lf, username:e.target.value})} required />
              </div>
              <div>
                <label style={{ display:"block", fontSize:12, color:"#9aa0a6", marginBottom:7 }}>Password</label>
                <input className="gm-input" type="password" autoComplete="current-password" placeholder="Enter your password"
                  value={lf.password} onChange={e => setLf({...lf, password:e.target.value})} required />
              </div>
              <button type="submit" className="btn btn-blue" disabled={busy}
                style={{ padding:"13px", fontSize:15, borderRadius:4, marginTop:4 }}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={doRegister} style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div>
                <label style={{ display:"block", fontSize:12, color:"#9aa0a6", marginBottom:7 }}>Full name</label>
                <input className="gm-input" autoComplete="name" placeholder="Your name"
                  value={rf.name} onChange={e => setRf({...rf, name:e.target.value})} required />
              </div>
              <div>
                <label style={{ display:"block", fontSize:12, color:"#9aa0a6", marginBottom:7 }}>Username</label>
                <input className="gm-input" autoComplete="username" placeholder="Choose a username"
                  value={rf.username} onChange={e => setRf({...rf, username:e.target.value})} minLength={3} required />
              </div>
              <div>
                <label style={{ display:"block", fontSize:12, color:"#9aa0a6", marginBottom:7 }}>Password</label>
                <input className="gm-input" type="password" autoComplete="new-password" placeholder="At least 6 characters"
                  value={rf.password} onChange={e => setRf({...rf, password:e.target.value})} minLength={6} required />
              </div>
              <button type="submit" className="btn btn-blue" disabled={busy}
                style={{ padding:"13px", fontSize:15, borderRadius:4, marginTop:4 }}>
                {busy ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p style={{ marginTop:20, color:"#9aa0a6", fontSize:13 }}>
        {tab==="login" ? "New here? " : "Already have an account? "}
        <button onClick={() => switchTab(tab==="login"?"register":"login")}
          style={{ background:"none", border:"none", color:"#1a73e8", cursor:"pointer",
            fontFamily:"var(--font)", fontSize:13 }}>
          {tab==="login" ? "Create account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
