import React from "react";
import { Link } from "react-router-dom";

function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#1a73e8"/>
      <path d="M8 14a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H11a3 3 0 01-3-3V14z" fill="#fff"/>
      <path d="M26 17l6-4v14l-6-4V17z" fill="#fff"/>
    </svg>
  );
}

export default function Landing() {
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"#202124" }}>
      {/* nav */}
      <nav style={{ height:64, display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 24px", borderBottom:"1px solid #3c4043" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Logo />
          <span style={{ fontSize:20, color:"#e8eaed", fontFamily:"var(--font)", fontWeight:400 }}>
            Connect<span style={{ color:"#1a73e8" }}>Call</span>
          </span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Link to="/auth" className="btn btn-ghost" style={{ padding:"9px 20px", fontSize:14, borderRadius:4 }}>Sign in</Link>
          <Link to="/auth" className="btn btn-blue" style={{ padding:"9px 20px", fontSize:14, borderRadius:4 }}>Get started — it's free</Link>
        </div>
      </nav>

      {/* hero */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", textAlign:"center", padding:"60px 24px" }}>
        <h1 style={{ fontFamily:"var(--font)", fontWeight:400, color:"#e8eaed",
          fontSize:"clamp(32px,6vw,60px)", lineHeight:1.15, maxWidth:700, marginBottom:20 }}>
          Video calls and meetings,<br/>for everyone
        </h1>
        <p style={{ color:"#9aa0a6", fontSize:"clamp(15px,2vw,18px)", maxWidth:520,
          lineHeight:1.65, marginBottom:40 }}>
          Start a secure HD video meeting, share your screen, and collaborate — right from your browser. No downloads needed.
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:14, justifyContent:"center" }}>
          <Link to="/auth" className="btn btn-blue" style={{ padding:"14px 30px", fontSize:16, borderRadius:4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            New meeting
          </Link>
          <Link to="/auth" className="btn btn-ghost" style={{ padding:"14px 30px", fontSize:16, borderRadius:4 }}>
            Join with a code
          </Link>
        </div>

        {/* features */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
          gap:16, maxWidth:800, width:"100%", marginTop:72 }}>
          {[
            { icon:"🔒", title:"Secure by default", desc:"Encrypted in transit. No one can join without the host's permission." },
            { icon:"📹", title:"HD video & audio", desc:"Crystal-clear peer-to-peer WebRTC video — browser-native, zero plugins." },
            { icon:"🖥️", title:"Screen sharing", desc:"Present your screen, window, or tab to everyone in the call." },
            { icon:"💬", title:"Live chat & reactions", desc:"Send messages, raise your hand, and stay engaged throughout." },
          ].map(f => (
            <div key={f.title} style={{ background:"#2d2f31", border:"1px solid #444746",
              borderRadius:12, padding:"24px 20px", textAlign:"left" }}>
              <div style={{ fontSize:26, marginBottom:10 }}>{f.icon}</div>
              <div style={{ fontSize:15, fontWeight:500, color:"#e8eaed", marginBottom:6 }}>{f.title}</div>
              <div style={{ fontSize:13, color:"#9aa0a6", lineHeight:1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ textAlign:"center", padding:"18px 24px",
        borderTop:"1px solid #3c4043", color:"#9aa0a6", fontSize:13 }}>
        © {new Date().getFullYear()} ConnectCall · Secure · Free · Browser-based
      </footer>
    </div>
  );
}
