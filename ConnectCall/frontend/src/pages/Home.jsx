import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { api } from "../lib/api.js";
import GmAvatar from "../components/GmAvatar.jsx";

const mkCode = () => { const s=()=>Math.random().toString(36).slice(2,6); return `${s()}-${s()}-${s()}`; };

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#1a73e8"/>
      <path d="M8 14a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H11a3 3 0 01-3-3V14z" fill="#fff"/>
      <path d="M26 17l6-4v14l-6-4V17z" fill="#fff"/>
    </svg>
  );
}

export default function Home() {
  const { name, username, token, logout } = useAuth();
  const nav = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [modal, setModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (token) api.history(token).then(setHistory).catch(()=>{});
  }, [token]);

  const startMeeting = () => { setNewCode(mkCode()); setCopied(false); setModal(true); };

  const join = e => { e.preventDefault(); if (joinCode.trim()) nav(`/meet/${joinCode.trim()}`); };

  const copy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/meet/${newCode}`).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#202124", display:"flex", flexDirection:"column" }}>
      {/* header */}
      <header style={{ height:64, display:"flex", alignItems:"center",
        justifyContent:"space-between", padding:"0 20px",
        borderBottom:"1px solid #3c4043", position:"sticky", top:0,
        background:"#202124", zIndex:10, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Logo />
          <span style={{ fontSize:18, color:"#e8eaed", fontFamily:"var(--font)" }}>
            Connect<span style={{ color:"#1a73e8" }}>Call</span>
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Link to="/history" style={{ fontSize:14, color:"#9aa0a6", textDecoration:"none",
            padding:"7px 12px", borderRadius:4, fontFamily:"var(--font)" }}
            onMouseOver={e=>e.target.style.background="rgba(255,255,255,.06)"}
            onMouseOut={e=>e.target.style.background="none"}>
            History
          </Link>
          <GmAvatar name={name||username} size={32} />
          <button onClick={logout} style={{ background:"none", border:"1px solid #444746",
            borderRadius:4, padding:"6px 14px", color:"#9aa0a6",
            cursor:"pointer", fontFamily:"var(--font)", fontSize:13 }}>
            Sign out
          </button>
        </div>
      </header>

      {/* body */}
      <main style={{ flex:1, padding:"48px 20px", maxWidth:1100, width:"100%", margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:36, alignItems:"start" }}>
          {/* left */}
          <div>
            <h1 style={{ fontFamily:"var(--font)", fontSize:"clamp(26px,4vw,42px)",
              fontWeight:400, color:"#e8eaed", lineHeight:1.2, marginBottom:14 }}>
              Video calls and meetings for everyone
            </h1>
            <p style={{ color:"#9aa0a6", fontSize:15, lineHeight:1.65, marginBottom:32 }}>
              Start a secure HD meeting or join with a code. No downloads, no plugins.
            </p>

            <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:28 }}>
              <button onClick={startMeeting} className="btn btn-blue"
                style={{ padding:"12px 20px", fontSize:14, borderRadius:4 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                New meeting
              </button>
              <form onSubmit={join} style={{ display:"flex", gap:8, flex:1, minWidth:240 }}>
                <input className="gm-input" placeholder="Enter a code or link"
                  value={joinCode} onChange={e=>setJoinCode(e.target.value)}
                  style={{ height:44, padding:"0 12px", fontSize:14, flex:1 }} />
                <button type="submit" className="btn btn-outline" disabled={!joinCode.trim()}
                  style={{ height:44, padding:"0 16px", borderRadius:4, fontSize:14, whiteSpace:"nowrap" }}>
                  Join
                </button>
              </form>
            </div>

            <p style={{ fontSize:13, color:"#9aa0a6", paddingTop:16,
              borderTop:"1px solid #3c4043" }}>
              New to ConnectCall?{" "}
              <Link to="/auth" style={{ color:"#1a73e8", textDecoration:"none" }}>Create an account</Link>
            </p>
          </div>

          {/* right – recent */}
          <div style={{ background:"#2d2f31", border:"1px solid #444746",
            borderRadius:8, padding:22 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:18 }}>
              <span style={{ fontFamily:"var(--font)", fontSize:15, fontWeight:500, color:"#e8eaed" }}>
                Recent meetings
              </span>
              {history.length>0 && (
                <Link to="/history" style={{ fontSize:13, color:"#1a73e8", textDecoration:"none" }}>
                  View all
                </Link>
              )}
            </div>

            {history.length===0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#9aa0a6" }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                  stroke="#444746" strokeWidth="1.2" style={{ margin:"0 auto 12px", display:"block" }}>
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                <p style={{ fontSize:14 }}>No recent meetings yet</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {history.slice(0,5).map((m,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
                    padding:"11px 12px", borderRadius:8, border:"1px solid #3c4043" }}>
                    <div style={{ width:34, height:34, borderRadius:"50%",
                      background:"rgba(26,115,232,.12)", display:"flex",
                      alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#1a73e8" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                      </svg>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:500, color:"#e8eaed",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {m.meetingCode}
                      </p>
                      <p style={{ fontSize:11, color:"#9aa0a6", marginTop:2 }}>
                        {new Date(m.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                      </p>
                    </div>
                    <Link to={`/meet/${m.meetingCode}`} className="btn btn-outline"
                      style={{ padding:"5px 12px", fontSize:12, borderRadius:4, whiteSpace:"nowrap" }}>
                      Rejoin
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New meeting modal */}
      {modal && (
        <div onClick={e=>e.target===e.currentTarget&&setModal(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            zIndex:50, padding:16 }}>
          <div style={{ background:"#2d2f31", border:"1px solid #444746",
            borderRadius:8, width:"100%", maxWidth:460, padding:28 }}>
            <h2 style={{ fontFamily:"var(--font)", fontSize:22, fontWeight:400,
              color:"#e8eaed", marginBottom:6 }}>Your meeting is ready</h2>
            <p style={{ fontSize:14, color:"#9aa0a6", marginBottom:24 }}>
              Share the link below to invite participants.
            </p>

            <div style={{ background:"#202124", border:"1px solid #444746",
              borderRadius:4, padding:"12px 14px", display:"flex",
              alignItems:"center", gap:10, marginBottom:20 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#1a73e8" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              <span style={{ flex:1, fontSize:13, color:"#e8eaed",
                fontFamily:"monospace", overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {window.location.origin}/meet/{newCode}
              </span>
              <button onClick={copy} style={{ background:"none", border:"none",
                cursor:"pointer", color:"#1a73e8",
                fontFamily:"var(--font)", fontSize:13, fontWeight:500, whiteSpace:"nowrap" }}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>

            <p style={{ fontSize:12, color:"#9aa0a6", marginBottom:4 }}>Meeting code</p>
            <p style={{ fontFamily:"monospace", fontSize:22, color:"#e8eaed",
              letterSpacing:3, marginBottom:26 }}>{newCode}</p>

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={()=>setModal(false)} className="btn btn-ghost"
                style={{ padding:"10px 20px", borderRadius:4, fontSize:14 }}>
                Cancel
              </button>
              <button onClick={()=>nav(`/meet/${newCode}`)} className="btn btn-blue"
                style={{ padding:"10px 20px", borderRadius:4, fontSize:14 }}>
                Start meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
