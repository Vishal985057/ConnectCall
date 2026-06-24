import React, {
  useState, useEffect, useRef, useCallback, useReducer,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { api } from "../lib/api.js";
import { io } from "socket.io-client";
import GmAvatar from "../components/GmAvatar.jsx";

/* ─── constants ──────────────────────────────────────────────────── */
const SOCKET_URL = import.meta.env.VITE_API_URL || "";
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

/* ─── icons ──────────────────────────────────────────────────────── */
const I = {
  mic:    <svg w="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  micOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  cam:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  camOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34m-7.72-2.06a4 4 0 01-5.56-5.56"/></svg>,
  screen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  chat:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  people: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  hand:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path d="M18 11V6a2 2 0 00-4 0v5M14 10V4a2 2 0 00-4 0v2M10 10.5V6a2 2 0 00-4 0v8M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/></svg>,
  leave:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  grid:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  spk:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect x="2" y="7" width="12" height="10"/><polygon points="22 3 14 7 14 17 22 21 22 3"/></svg>,
  close:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  send:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  wait:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
};

/* ─── video element ──────────────────────────────────────────────── */
function Vid({ stream, muted }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    } else {
      ref.current.srcObject = null;
    }
  }, [stream]);
  return (
    <video ref={ref} autoPlay playsInline muted={muted}
      style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", background:"#000" }} />
  );
}

/* ─── timer ──────────────────────────────────────────────────────── */
function useTimer(on) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setS(v => v+1), 1000);
    return () => clearInterval(id);
  }, [on]);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return h > 0
    ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
    : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

/* ─── control button ─────────────────────────────────────────────── */
function Ctrl({ icon, label, mode="on", badge, onClick }) {
  return (
    <button className="ctrl" onClick={onClick} aria-label={label}>
      <div className={`ctrl-ring ${mode}`} style={{ color:"#fff" }}>
        {icon}
        {badge > 0 && <span className="ctrl-badge">{badge > 9 ? "9+" : badge}</span>}
      </div>
      <span className="ctrl-lbl">{label}</span>
    </button>
  );
}

/* ─── tile ───────────────────────────────────────────────────────── */
function Tile({ id, p, isLocal, isPinned, onPin }) {
  const hasVideo = !!(p.stream && p.videoOn !== false);
  return (
    <div className={`tile${isPinned ? " pinned" : ""}`}
      style={{ width:"100%", height:"100%", minHeight:120 }}
      onClick={() => onPin(id)}>
      {hasVideo
        ? <Vid stream={p.stream} muted={isLocal} />
        : (
          <div style={{ display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:10, height:"100%" }}>
            <GmAvatar name={p.name} size={isPinned ? 88 : 52} />
          </div>
        )
      }
      <div className="tile-bar">
        {p.micOn === false && (
          <span style={{ width:20, height:20, borderRadius:"50%",
            background:"#ea4335", display:"flex",
            alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="3">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M9 9v3a3 3 0 005.12 2.12"/>
            </svg>
          </span>
        )}
        <span className="tile-name">{p.name}{isLocal ? " (You)" : ""}</span>
        {p.handRaised && <span style={{ fontSize:14 }}>✋</span>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MEET PAGE
═════════════════════════════════════════════════════════════════════ */
export default function Meet() {
  const { code } = useParams();
  const nav = useNavigate();
  const { name: authName, username, token } = useAuth();

  /* phase: lobby | waiting | denied | call */
  const [phase, setPhase]       = useState("lobby");
  const [myName, setMyName]     = useState(authName || username || "");

  /* lobby preview */
  const [prevStream, setPrevStream] = useState(null);
  const [prevMic, setPrevMic]   = useState(true);
  const [prevCam, setPrevCam]   = useState(true);

  /* call state */
  const [localStream, setLocal] = useState(null);
  const [peers, setPeers]       = useState({});
  /* peers: { [id]: { name, stream, micOn, videoOn, handRaised } } */

  const [micOn, setMicOn]       = useState(true);
  const [vidOn, setVidOn]       = useState(true);
  const [sharing, setSharing]   = useState(false);
  const [handUp, setHandUp]     = useState(false);
  const [isHost, setIsHost]     = useState(false);
  const [waiting, setWaiting]   = useState([]); /* [{id,name}] */
  const [pinned, setPinned]     = useState(null);
  const [view, setView]         = useState("speaker");

  const [panel, setPanel]       = useState(null); /* null | chat | people | waiting */
  const [chatInput, setChatIn]  = useState("");
  const [messages, setMessages] = useState([]);
  const [unread, setUnread]     = useState(0);
  const chatBottom              = useRef(null);
  const timer                   = useTimer(phase === "call");

  /* refs (stable across renders) */
  const sockRef    = useRef(null);
  const myId       = useRef(null);
  const pcsRef     = useRef({});   /* id -> RTCPeerConnection */
  const iceBuf     = useRef({});   /* id -> RTCIceCandidate[] (buffered before remoteDesc) */
  const camRef     = useRef(null); /* live camera/screen stream */
  const micOnRef   = useRef(true);
  const vidOnRef   = useRef(true);

  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { vidOnRef.current = vidOn; }, [vidOn]);
  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);
  useEffect(() => { if (panel === "chat") setUnread(0); }, [panel]);

  /* ── lobby preview ─────────────────────────────────────────── */
  useEffect(() => {
    let s;
    navigator.mediaDevices.getUserMedia({ video:true, audio:true })
      .then(stream => { s = stream; setPrevStream(stream); })
      .catch(() => { setPrevMic(false); setPrevCam(false); });
    return () => { s?.getTracks().forEach(t=>t.stop()); };
  }, []);

  useEffect(() => {
    if (!prevStream) return;
    prevStream.getAudioTracks().forEach(t => { t.enabled = prevMic; });
    prevStream.getVideoTracks().forEach(t => { t.enabled = prevCam; });
  }, [prevMic, prevCam, prevStream]);

  /* ── peer helpers ──────────────────────────────────────────── */
  const updPeer = useCallback((id, patch) => {
    if (id === myId.current) return;
    setPeers(prev => ({ ...prev, [id]: { stream:null, name:`User`, micOn:true, videoOn:true, handRaised:false, ...prev[id], ...patch } }));
  }, []);

  const drainIceBuf = useCallback(async (id) => {
    const pc = pcsRef.current[id];
    if (!pc || !iceBuf.current[id]) return;
    for (const cand of iceBuf.current[id]) {
      await pc.addIceCandidate(cand).catch(() => {});
    }
    iceBuf.current[id] = [];
  }, []);

  const makePeer = useCallback((toId, polite) => {
    if (toId === myId.current) return null;
    pcsRef.current[toId]?.close();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcsRef.current[toId] = pc;
    iceBuf.current[toId] = [];

    /* add local tracks */
    if (camRef.current) {
      camRef.current.getTracks().forEach(t => pc.addTrack(t, camRef.current));
    }

    /* receive remote tracks */
    pc.ontrack = ev => {
      const stream = ev.streams?.[0] || new MediaStream([ev.track]);
      updPeer(toId, { stream });
    };

    /* send ICE candidates */
    pc.onicecandidate = ev => {
      if (ev.candidate)
        sockRef.current?.emit("signal", toId, { type:"candidate", candidate: ev.candidate });
    };

    pc.onconnectionstatechange = () => {
      if (["failed","disconnected"].includes(pc.connectionState)) pc.restartIce?.();
    };

    return pc;
  }, [updPeer]);

  /* ── socket wiring ─────────────────────────────────────────── */
  const wireSocket = useCallback((sock, name) => {

    sock.on("connect", () => {
      myId.current = sock.id;
      sock.emit("join-call", code, name);
    });

    sock.on("you-are-host", () => setIsHost(true));

    sock.on("existing-users", async (ids, nameMap) => {
      setPhase("call");
      /* for each existing user: create PC and send offer */
      for (const id of ids) {
        if (id === myId.current) continue;
        updPeer(id, { name: nameMap[id] || `User ${id.slice(0,4)}` });
        const pc = makePeer(id, false);
        if (!pc) continue;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sock.emit("signal", id, { type:"offer", offer, name });
        } catch {}
      }
      sock.emit("user-name", name);
      sock.emit("mute-status", micOnRef.current, vidOnRef.current);
    });

    sock.on("user-joined", id => {
      if (id === myId.current) return;
      updPeer(id, { name: `User ${id.slice(0,4)}` });
    });

    sock.on("signal", async (fromId, msg) => {
      if (fromId === myId.current) return;

      if (msg.type === "offer") {
        let pc = pcsRef.current[fromId] || makePeer(fromId, true);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
          await drainIceBuf(fromId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sock.emit("signal", fromId, { type:"answer", answer, name });
          if (msg.name) updPeer(fromId, { name: msg.name });
        } catch {}

      } else if (msg.type === "answer") {
        const pc = pcsRef.current[fromId];
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
          await drainIceBuf(fromId);
          if (msg.name) updPeer(fromId, { name: msg.name });
        } catch {}

      } else if (msg.type === "candidate") {
        const pc = pcsRef.current[fromId];
        if (!pc) return;
        const cand = new RTCIceCandidate(msg.candidate);
        if (pc.remoteDescription) {
          await pc.addIceCandidate(cand).catch(() => {});
        } else {
          iceBuf.current[fromId] = iceBuf.current[fromId] || [];
          iceBuf.current[fromId].push(cand);
        }
      }
    });

    sock.on("user-left", id => {
      pcsRef.current[id]?.close();
      delete pcsRef.current[id];
      delete iceBuf.current[id];
      setPeers(prev => { const n={...prev}; delete n[id]; return n; });
      setPinned(p => p === id ? null : p);
    });

    sock.on("peer-name",    (id, n) => updPeer(id, { name: n }));
    sock.on("mute-status",  (id, m, v) => updPeer(id, { micOn: m, videoOn: v }));
    sock.on("hand-raised",  id => updPeer(id, { handRaised: true }));
    sock.on("hand-lowered", id => updPeer(id, { handRaised: false }));
    sock.on("waiting-for-host", () => setPhase("waiting"));
    sock.on("join-denied",      () => setPhase("denied"));

    sock.on("user-waiting", user => {
      setWaiting(q => {
        const next = [...q.filter(u => u.id !== user.id), user];
        if (next.length) setPanel("waiting");
        return next;
      });
    });

    sock.on("chat-message", (text, sender, sid) => {
      if (sid === myId.current) return;
      setMessages(prev => [...prev, { sender, text, self:false }]);
      setPanel(p => { if (p !== "chat") setUnread(c => c+1); return p; });
    });

  }, [code, makePeer, updPeer, drainIceBuf]);

  /* ── join ──────────────────────────────────────────────────── */
  const join = () => {
    if (!myName.trim()) return;
    prevStream?.getTracks().forEach(t => t.stop());

    const boot = stream => {
      camRef.current = stream;
      stream.getAudioTracks().forEach(t => { t.enabled = prevMic; });
      stream.getVideoTracks().forEach(t => { t.enabled = prevCam; });
      setLocal(stream);
      setMicOn(prevMic);
      setVidOn(prevCam);
      if (token) api.addHistory({ token, meeting_code: code }).catch(() => {});
      const sock = io(SOCKET_URL, {
        path: "/socket.io",
        transports: ["websocket","polling"],
      });
      sockRef.current = sock;
      wireSocket(sock, myName.trim());
    };

    navigator.mediaDevices
      .getUserMedia({ video: prevCam, audio: prevMic })
      .then(boot)
      .catch(() => boot(new MediaStream()));
  };

  /* ── leave ─────────────────────────────────────────────────── */
  const leave = () => {
    sockRef.current?.disconnect();
    localStream?.getTracks().forEach(t => t.stop());
    camRef.current?.getTracks().forEach(t => t.stop());
    Object.values(pcsRef.current).forEach(pc => pc.close());
    pcsRef.current = {};
    nav("/home");
  };

  /* ── mute/unmute live ──────────────────────────────────────── */
  useEffect(() => {
    if (!localStream || phase !== "call") return;
    localStream.getAudioTracks().forEach(t => { t.enabled = micOn; });
    if (!sharing) localStream.getVideoTracks().forEach(t => { t.enabled = vidOn; });
    sockRef.current?.emit("mute-status", micOn, vidOn);
  }, [micOn, vidOn, localStream, sharing, phase]);

  /* ── screen share ──────────────────────────────────────────── */
  const stopShare = useCallback(async () => {
    setSharing(false);
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      cam.getAudioTracks().forEach(t => { t.enabled = micOnRef.current; });
      cam.getVideoTracks().forEach(t => { t.enabled = vidOnRef.current; });
      camRef.current = cam;
      setLocal(cam);
      const vt = cam.getVideoTracks()[0];
      if (vt) Object.values(pcsRef.current).forEach(pc =>
        pc.getSenders().find(s => s.track?.kind === "video")?.replaceTrack(vt));
    } catch {}
  }, []);

  const toggleShare = async () => {
    if (sharing) { stopShare(); return; }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video:{ cursor:"always" }, audio:false });
      const vt = screen.getVideoTracks()[0];
      Object.values(pcsRef.current).forEach(pc =>
        pc.getSenders().find(s => s.track?.kind === "video")?.replaceTrack(vt));
      const audio = camRef.current?.getAudioTracks() ?? [];
      setLocal(new MediaStream([vt, ...audio]));
      setSharing(true);
      vt.onended = () => stopShare();
    } catch {}
  };

  /* ── hand ──────────────────────────────────────────────────── */
  const toggleHand = () => {
    const next = !handUp;
    setHandUp(next);
    sockRef.current?.emit(next ? "raise-hand" : "lower-hand");
  };

  /* ── chat ──────────────────────────────────────────────────── */
  const sendChat = e => {
    e.preventDefault();
    const txt = chatInput.trim();
    if (!txt || !sockRef.current) return;
    sockRef.current.emit("chat-message", txt, myName);
    setMessages(prev => [...prev, { sender:"You", text:txt, self:true }]);
    setChatIn("");
  };

  /* ── waiting ───────────────────────────────────────────────── */
  const admit = id => { sockRef.current?.emit("admit-user", id); setWaiting(q => q.filter(u => u.id !== id)); };
  const deny  = id => { sockRef.current?.emit("deny-user",  id); setWaiting(q => q.filter(u => u.id !== id)); };

  /* ── layout ────────────────────────────────────────────────── */
  const togglePin  = id => setPinned(p => p === id ? null : p === "local" && id === "local" ? null : id);
  const togglePanel = name => setPanel(p => p === name ? null : name);

  const localP = { stream:localStream, name:myName, micOn, videoOn:vidOn, handRaised:handUp };
  const peerArr = Object.entries(peers); /* [[id, p], ...] */
  const allArr  = [["local", localP], ...peerArr];
  const handsCount = ([handUp, ...peerArr.map(([,p])=>p.handRaised)]).filter(Boolean).length;

  /* featured in speaker mode */
  const effectivePinned = pinned ?? (peerArr.length > 0 ? peerArr[0][0] : "local");
  const featuredId   = effectivePinned;
  const featuredIsLocal = featuredId === "local";
  const featuredP    = featuredIsLocal ? localP : (peers[featuredId] || localP);
  const filmstrip    = allArr.filter(([id]) => id !== featuredId);

  /* grid columns */
  const n = allArr.length;
  const gridCols = n <= 1 ? "1fr" : n <= 4 ? "repeat(2,1fr)" : "repeat(3,1fr)";

  /* ════════════════════════════════════════════════════════════
     LOBBY
  ═══════════════════════════════════════════════════════════════ */
  if (phase === "lobby") return (
    <div style={{ minHeight:"100dvh", background:"#202124",
      display:"flex", flexDirection:"column" }}>
      <header style={{ height:56, display:"flex", alignItems:"center", gap:10,
        padding:"0 20px", borderBottom:"1px solid #3c4043" }}>
        <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#1a73e8"/>
          <path d="M8 14a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H11a3 3 0 01-3-3V14z" fill="#fff"/>
          <path d="M26 17l6-4v14l-6-4V17z" fill="#fff"/>
        </svg>
        <span style={{ fontSize:17, color:"#e8eaed", fontFamily:"var(--font)" }}>
          Connect<span style={{ color:"#1a73e8" }}>Call</span>
        </span>
      </header>

      <div style={{ flex:1, display:"flex", alignItems:"center",
        justifyContent:"center", padding:"24px 16px" }}>
        <div style={{ width:"100%", maxWidth:820 }}>
          <h1 style={{ fontFamily:"var(--font)", fontSize:"clamp(22px,4vw,30px)",
            fontWeight:400, color:"#e8eaed", textAlign:"center", marginBottom:6 }}>
            Ready to join?
          </h1>
          <p style={{ textAlign:"center", color:"#9aa0a6", fontSize:14, marginBottom:32 }}>
            Code: <code style={{ background:"#2d2f31", padding:"2px 10px",
              borderRadius:4, color:"#e8eaed", border:"1px solid #444746",
              fontFamily:"monospace" }}>{code}</code>
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
            gap:24, alignItems:"start" }}>
            {/* preview */}
            <div>
              <div style={{ aspectRatio:"16/9", background:"#1a1a1a",
                borderRadius:12, overflow:"hidden", position:"relative",
                display:"flex", alignItems:"center", justifyContent:"center",
                border:"1px solid #3c4043" }}>
                {prevStream && prevCam
                  ? <Vid stream={prevStream} muted />
                  : (
                    <div style={{ display:"flex", flexDirection:"column",
                      alignItems:"center", gap:12 }}>
                      <GmAvatar name={myName||"?"} size={72} />
                      <span style={{ color:"#9aa0a6", fontSize:13 }}>Camera off</span>
                    </div>
                  )
                }
                {/* mic / cam toggles */}
                <div style={{ position:"absolute", bottom:12, left:"50%",
                  transform:"translateX(-50%)", display:"flex", gap:10 }}>
                  {[
                    { on:prevMic, onIcon:I.mic,    offIcon:I.micOff, toggle:()=>setPrevMic(v=>!v) },
                    { on:prevCam, onIcon:I.cam,    offIcon:I.camOff, toggle:()=>setPrevCam(v=>!v) },
                  ].map((b,i) => (
                    <button key={i} onClick={b.toggle}
                      style={{ width:42, height:42, borderRadius:"50%", border:"none",
                        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                        background: b.on ? "rgba(0,0,0,.55)" : "#ea4335",
                        color:"#fff", backdropFilter:"blur(4px)", transition:"background .15s" }}>
                      {b.on ? b.onIcon : b.offIcon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* form */}
            <div style={{ display:"flex", flexDirection:"column", gap:18, paddingTop:4 }}>
              <div>
                <label style={{ display:"block", fontSize:12,
                  color:"#9aa0a6", marginBottom:7 }}>Your name</label>
                <input className="gm-input" value={myName}
                  onChange={e=>setMyName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&join()}
                  placeholder="Enter your name"
                  autoFocus
                  style={{ height:50, fontSize:16 }} />
              </div>
              <button onClick={join} disabled={!myName.trim()}
                className="btn btn-blue"
                style={{ padding:"14px", fontSize:16, borderRadius:4 }}>
                Join now
              </button>
              <button onClick={()=>nav("/home")}
                style={{ background:"none", border:"none", cursor:"pointer",
                  color:"#1a73e8", fontFamily:"var(--font)", fontSize:14 }}>
                ← Return to home
              </button>
              <div style={{ background:"#2d2f31", border:"1px solid #444746",
                borderRadius:8, padding:"13px 15px" }}>
                <p style={{ fontSize:13, color:"#9aa0a6", lineHeight:1.6 }}>
                  🔒 Encrypted. Only the host can admit participants.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     WAITING
  ═══════════════════════════════════════════════════════════════ */
  if (phase === "waiting") return (
    <div style={{ minHeight:"100dvh", background:"#202124",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ textAlign:"center", maxWidth:380 }}>
        <div style={{ width:80, height:80, borderRadius:"50%",
          background:"rgba(26,115,232,.1)", border:"1px solid rgba(26,115,232,.25)",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 24px", fontSize:36 }}>🚪</div>
        <h2 style={{ fontFamily:"var(--font)", fontSize:24, fontWeight:400,
          color:"#e8eaed", marginBottom:10 }}>Waiting to be admitted</h2>
        <p style={{ color:"#9aa0a6", fontSize:15, lineHeight:1.65, marginBottom:28 }}>
          The host will let you in shortly.
        </p>
        <div className="spin" style={{ margin:"0 auto 28px" }}/>
        <button onClick={()=>{ sockRef.current?.disconnect(); setPhase("lobby"); }}
          className="btn btn-ghost"
          style={{ padding:"10px 24px", borderRadius:4, fontSize:14 }}>
          Cancel
        </button>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     DENIED
  ═══════════════════════════════════════════════════════════════ */
  if (phase === "denied") return (
    <div style={{ minHeight:"100dvh", background:"#202124",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ textAlign:"center", maxWidth:380 }}>
        <div style={{ width:80, height:80, borderRadius:"50%",
          background:"rgba(234,67,53,.1)", border:"1px solid rgba(234,67,53,.25)",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 24px", fontSize:36 }}>🚫</div>
        <h2 style={{ fontFamily:"var(--font)", fontSize:24, fontWeight:400,
          color:"#e8eaed", marginBottom:10 }}>Entry denied</h2>
        <p style={{ color:"#9aa0a6", fontSize:15, lineHeight:1.65, marginBottom:32 }}>
          The host didn't let you in. Contact the meeting organizer.
        </p>
        <button onClick={()=>nav("/home")} className="btn btn-blue"
          style={{ padding:"12px 28px", borderRadius:4, fontSize:15 }}>
          Return to home
        </button>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     IN CALL
  ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ height:"100dvh", background:"#1e1e1e",
      display:"flex", flexDirection:"column", overflow:"hidden",
      fontFamily:"var(--font)" }}>

      {/* ── top bar ─────────────────────────────────────────── */}
      <div style={{ height:54, display:"flex", alignItems:"center",
        justifyContent:"space-between", padding:"0 16px",
        background:"#202124", borderBottom:"1px solid rgba(255,255,255,.06)",
        flexShrink:0, gap:8, zIndex:10 }}>
        {/* left */}
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#1a73e8"/>
            <path d="M8 14a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H11a3 3 0 01-3-3V14z" fill="#fff"/>
            <path d="M26 17l6-4v14l-6-4V17z" fill="#fff"/>
          </svg>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:500, color:"rgba(255,255,255,.85)" }}>ConnectCall</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.38)",
              fontFamily:"monospace", overflow:"hidden",
              textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>{code}</div>
          </div>
          {isHost && (
            <span style={{ fontSize:11, background:"rgba(26,115,232,.18)",
              color:"#8ab4f8", padding:"2px 9px", borderRadius:10, fontWeight:600 }}>
              HOST
            </span>
          )}
        </div>
        {/* right */}
        <div style={{ display:"flex", alignItems:"center", gap:14,
          color:"rgba(255,255,255,.5)", fontSize:13, flexShrink:0 }}>
          {handsCount > 0 && <span style={{ color:"#fdd663" }}>✋ {handsCount}</span>}
          <span>⏱ {timer}</span>
          <span style={{ background:"rgba(255,255,255,.08)",
            padding:"3px 8px", borderRadius:10 }}>👥 {allArr.length}</span>
          <button onClick={()=>setView(v=>v==="speaker"?"grid":"speaker")}
            title={view==="speaker"?"Grid view":"Speaker view"}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:"rgba(255,255,255,.6)", display:"flex",
              alignItems:"center", padding:4, borderRadius:6 }}>
            {view === "speaker" ? I.grid : I.spk}
          </button>
        </div>
      </div>

      {/* ── body ────────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", minHeight:0 }}>

        {/* video area */}
        <div style={{ flex:1, display:"flex", flexDirection:"column",
          minWidth:0, overflow:"hidden" }}>

          {view === "speaker" ? (
            <>
              {/* main speaker */}
              <div style={{ flex:1, padding:"8px 8px 0 8px", minHeight:0 }}>
                <div style={{ width:"100%", height:"100%",
                  borderRadius:10, overflow:"hidden" }}>
                  <Tile id={featuredId} p={featuredP}
                    isLocal={featuredIsLocal}
                    isPinned={!!pinned && pinned === featuredId}
                    onPin={togglePin} />
                </div>
              </div>
              {/* filmstrip */}
              {filmstrip.length > 0 && (
                <div style={{ padding:"6px 8px 4px",
                  display:"flex", gap:5,
                  overflowX:"auto", flexShrink:0, minHeight:100 }}>
                  {filmstrip.map(([id, p]) => (
                    <div key={id} style={{ width:148, minWidth:148, height:92,
                      borderRadius:8, overflow:"hidden", flexShrink:0 }}>
                      <Tile id={id} p={p}
                        isLocal={id==="local"}
                        isPinned={id===pinned}
                        onPin={togglePin} />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* grid */
            <div style={{ flex:1, padding:8, overflow:"auto",
              display:"grid", gap:6,
              gridTemplateColumns: gridCols,
              alignContent:"start" }}>
              {allArr.map(([id, p]) => (
                <div key={id} style={{ borderRadius:8, overflow:"hidden", minHeight:130 }}>
                  <Tile id={id} p={p}
                    isLocal={id==="local"}
                    isPinned={id===pinned}
                    onPin={togglePin} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── side panel ──────────────────────────────────────── */}
        {panel && (
          <div className="panel"
            style={{ width:"clamp(260px,30vw,340px)", flexShrink:0 }}>
            {/* header */}
            <div style={{ height:52, display:"flex", alignItems:"center",
              justifyContent:"space-between", padding:"0 16px",
              borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
              <span style={{ fontSize:15, fontWeight:500, color:"#e8eaed" }}>
                { panel==="chat"    && "In-call messages" }
                { panel==="people"  && `People (${allArr.length})` }
                { panel==="waiting" && `Waiting room (${waiting.length})` }
              </span>
              <button onClick={()=>setPanel(null)}
                style={{ background:"none", border:"none", cursor:"pointer",
                  color:"rgba(255,255,255,.5)", display:"flex",
                  padding:4, borderRadius:"50%" }}>
                {I.close}
              </button>
            </div>

            {/* ── CHAT ── */}
            {panel === "chat" && (
              <>
                <div style={{ flex:1, overflowY:"auto",
                  padding:"12px 14px", display:"flex",
                  flexDirection:"column", gap:12 }}>
                  {messages.length === 0 && (
                    <p style={{ textAlign:"center", color:"rgba(255,255,255,.28)",
                      fontSize:13, marginTop:32, lineHeight:1.7 }}>
                      Messages are only visible to people in this call and are not saved after it ends.
                    </p>
                  )}
                  {messages.map((m,i) => (
                    <div key={i} style={{ display:"flex", flexDirection:"column",
                      alignItems: m.self ? "flex-end" : "flex-start", gap:3 }}>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,.38)" }}>
                        {m.sender}
                      </span>
                      <div style={{
                        background: m.self ? "#1a73e8" : "#3c4043",
                        padding:"8px 12px",
                        borderRadius: m.self ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                        maxWidth:"88%",
                      }}>
                        <p style={{ fontSize:14, color:"#e8eaed",
                          wordBreak:"break-word", lineHeight:1.5 }}>
                          {m.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottom}/>
                </div>
                <form onSubmit={sendChat}
                  style={{ padding:"10px 12px",
                    borderTop:"1px solid rgba(255,255,255,.07)",
                    display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                  <input value={chatInput} onChange={e=>setChatIn(e.target.value)}
                    placeholder="Send a message to everyone…"
                    style={{ flex:1, background:"#3c4043",
                      border:"1px solid rgba(255,255,255,.08)",
                      borderRadius:22, padding:"9px 14px",
                      color:"#e8eaed", fontSize:14, outline:"none",
                      fontFamily:"var(--font)" }} />
                  <button type="submit" disabled={!chatInput.trim()}
                    style={{ width:38, height:38, borderRadius:"50%",
                      border:"none", display:"flex", alignItems:"center",
                      justifyContent:"center", flexShrink:0,
                      background: chatInput.trim() ? "#1a73e8" : "#3c4043",
                      color:"#fff", cursor: chatInput.trim() ? "pointer" : "default",
                      transition:"background .15s" }}>
                    {I.send}
                  </button>
                </form>
              </>
            )}

            {/* ── PEOPLE ── */}
            {panel === "people" && (
              <div style={{ flex:1, overflowY:"auto", padding:"6px 0" }}>
                {allArr.map(([id, p]) => (
                  <div key={id}
                    style={{ display:"flex", alignItems:"center",
                      gap:12, padding:"10px 16px", borderRadius:8,
                      transition:"background .12s" }}
                    onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
                    onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    <GmAvatar name={p.name} size={36} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, color:"#e8eaed",
                        overflow:"hidden", textOverflow:"ellipsis",
                        whiteSpace:"nowrap" }}>
                        {p.name}
                      </p>
                      { id==="local" && (
                        <p style={{ fontSize:11, color: isHost ? "#8ab4f8" : "rgba(255,255,255,.38)", marginTop:2 }}>
                          {isHost ? "You · Host" : "You"}
                        </p>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:6, color:"rgba(255,255,255,.38)" }}>
                      {p.micOn === false && I.micOff}
                      {p.handRaised && <span>✋</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── WAITING ROOM ── */}
            {panel === "waiting" && (
              <div style={{ flex:1, overflowY:"auto", padding:14 }}>
                {waiting.length === 0 && (
                  <p style={{ textAlign:"center", color:"rgba(255,255,255,.3)",
                    fontSize:14, marginTop:32 }}>
                    Nobody is waiting
                  </p>
                )}
                {waiting.map(u => (
                  <div key={u.id}
                    style={{ background:"#2d2f31",
                      border:"1px solid rgba(255,255,255,.07)",
                      borderRadius:10, padding:"14px 14px",
                      marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center",
                      gap:10, marginBottom:12 }}>
                      <GmAvatar name={u.name} size={34} />
                      <span style={{ fontSize:14, fontWeight:500, color:"#e8eaed" }}>
                        {u.name}
                      </span>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>admit(u.id)}
                        className="btn btn-blue"
                        style={{ flex:1, padding:"8px", fontSize:13, borderRadius:4 }}>
                        Admit
                      </button>
                      <button onClick={()=>deny(u.id)}
                        style={{ flex:1, padding:"8px", fontSize:13, borderRadius:4,
                          background:"transparent",
                          border:"1px solid #444746",
                          color:"#9aa0a6", cursor:"pointer",
                          fontFamily:"var(--font)" }}>
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── bottom toolbar ───────────────────────────────────── */}
      <div style={{ height:76, background:"#202124",
        borderTop:"1px solid rgba(255,255,255,.06)",
        display:"flex", alignItems:"center",
        justifyContent:"space-between",
        padding:"0 16px", flexShrink:0, gap:4 }}>

        {/* left — mic + cam */}
        <div style={{ display:"flex", gap:4 }}>
          <Ctrl icon={micOn ? I.mic : I.micOff}
            label={micOn ? "Mute" : "Unmute"}
            mode={micOn ? "on" : "off"}
            onClick={()=>setMicOn(v=>!v)} />
          <Ctrl icon={vidOn ? I.cam : I.camOff}
            label={vidOn ? "Stop video" : "Start video"}
            mode={vidOn ? "on" : "off"}
            onClick={()=>setVidOn(v=>!v)} />
        </div>

        {/* center */}
        <div style={{ display:"flex", gap:4 }}>
          <Ctrl icon={I.screen}
            label={sharing ? "Stop sharing" : "Present"}
            mode={sharing ? "hi" : "on"}
            onClick={toggleShare} />
          <Ctrl icon={I.hand}
            label={handUp ? "Lower hand" : "Raise hand"}
            mode={handUp ? "hi" : "on"}
            onClick={toggleHand} />
          <Ctrl icon={I.chat}
            label="Chat"
            mode={panel==="chat" ? "hi" : "on"}
            badge={unread}
            onClick={()=>togglePanel("chat")} />
          <Ctrl icon={I.people}
            label="People"
            mode={panel==="people" ? "hi" : "on"}
            onClick={()=>togglePanel("people")} />
          {isHost && (
            <Ctrl icon={I.wait}
              label="Waiting"
              mode={panel==="waiting" ? "hi" : "on"}
              badge={waiting.length}
              onClick={()=>togglePanel("waiting")} />
          )}
        </div>

        {/* right — leave */}
        <Ctrl icon={I.leave} label="Leave" mode="end" onClick={leave} />
      </div>
    </div>
  );
}
