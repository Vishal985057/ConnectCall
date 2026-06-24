import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { api } from "../lib/api.js";

export default function History() {
  const { token } = useAuth();
  const [rows, setRows]     = useState([]);
  const [loading, setLoad]  = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (token) api.history(token).then(setRows).catch(()=>{}).finally(()=>setLoad(false));
  }, [token]);

  const copy = (code, i) => {
    navigator.clipboard.writeText(`${window.location.origin}/meet/${code}`).catch(()=>{});
    setCopied(i); setTimeout(()=>setCopied(null), 2000);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#202124" }}>
      <header style={{ height:60, display:"flex", alignItems:"center", gap:14,
        padding:"0 20px", borderBottom:"1px solid #3c4043",
        position:"sticky", top:0, background:"#202124", zIndex:10 }}>
        <Link to="/home" style={{ width:36, height:36, display:"flex",
          alignItems:"center", justifyContent:"center", borderRadius:"50%",
          border:"1px solid #444746", textDecoration:"none",
          color:"#9aa0a6", fontSize:18, lineHeight:1 }}>←</Link>
        <span style={{ fontFamily:"var(--font)", fontSize:18, color:"#e8eaed" }}>
          Meeting history
        </span>
      </header>

      <main style={{ maxWidth:800, margin:"0 auto", padding:"36px 20px" }}>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}>
            <div className="spin"/>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign:"center", paddingTop:80 }}>
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none"
              stroke="#444746" strokeWidth="1" style={{ margin:"0 auto 16px", display:"block" }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <h3 style={{ fontFamily:"var(--font)", fontSize:20, fontWeight:400,
              color:"#e8eaed", marginBottom:10 }}>No meetings yet</h3>
            <p style={{ color:"#9aa0a6", fontSize:14, marginBottom:24 }}>
              Your past meetings will appear here.
            </p>
            <Link to="/home" className="btn btn-blue"
              style={{ padding:"10px 24px", borderRadius:4, fontSize:14 }}>
              Go to dashboard
            </Link>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
            {rows.map((m, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14,
                padding:"14px 16px", borderRadius:8, transition:"background .12s" }}
                onMouseOver={e=>e.currentTarget.style.background="#2d2f31"}
                onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:40, height:40, borderRadius:"50%",
                  background:"rgba(26,115,232,.12)", display:"flex",
                  alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="#1a73e8" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:500, color:"#e8eaed",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.meetingCode}
                  </p>
                  <p style={{ fontSize:12, color:"#9aa0a6", marginTop:3 }}>
                    {new Date(m.date).toLocaleDateString("en-US",{
                      weekday:"short", month:"short", day:"numeric",
                      year:"numeric", hour:"2-digit", minute:"2-digit" })}
                  </p>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>copy(m.meetingCode,i)}
                    style={{ background:"none", border:"none",
                      cursor:"pointer", color:"#1a73e8",
                      fontFamily:"var(--font)", fontSize:13,
                      padding:"6px 10px", borderRadius:4 }}>
                    {copied===i ? "✓ Copied" : "Copy link"}
                  </button>
                  <Link to={`/meet/${m.meetingCode}`} className="btn btn-outline"
                    style={{ padding:"7px 16px", borderRadius:4, fontSize:13 }}>
                    Rejoin
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
