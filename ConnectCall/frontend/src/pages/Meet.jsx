import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { api } from "../lib/api.js";
import { io } from "socket.io-client";
import GmAvatar from "../components/GmAvatar.jsx";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";
const ICE = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

/* ─── ICONS ────────────────────────────────────────────────────── */
const Ic = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const ICONS = {
  mic:    <Ic d={<><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>} />,
  micOff: <Ic d={<><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>} />,
  cam:    <Ic d={<><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></>} />,
  camOff: <Ic d={<><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"/><path d="M7 11v0a4 4 0 0 0 5.56 5.56"/></>} />,
  screen: <Ic d={<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>} />,
  chat:   <Ic d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} />,
  people: <Ic d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />,
  hand:   <Ic d={<><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></>} />,
  leave:  <Ic d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>} />,
  grid:   <Ic d={<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>} size={20} />,
  spk:    <Ic d={<><rect x="2" y="7" width="12" height="10"/><polygon points="22 3 14 7 14 17 22 21 22 3"/></>} size={20} />,
  close:  <Ic d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={20} />,
  send:   <Ic d={<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>} size={18} />,
  lock:   <Ic d={<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />,
};

/* ─── VIDEO ELEMENT ─────────────────────────────────────────────
   FIX: muted must be set via ref (React bug with muted attribute)
   FIX: re-attach on addtrack events (screen share / late tracks)
   FIX: play on loadedmetadata not just on mount
──────────────────────────────────────────────────────────────── */
function Vid({ stream, muted }) {
  const ref = useRef(null);
  const mutedRef = useRef(muted);

  // FIX: muted prop doesn't work reliably in React — always use ref
  useEffect(() => {
    mutedRef.current = muted;
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!stream || stream.getTracks().length === 0) {
      el.srcObject = null;
      return;
    }

    el.srcObject = stream;
    el.muted = mutedRef.current; // Always re-apply (React muted bug)

    const tryPlay = () => {
      el.play().catch(() => {
        // Fallback: mute and retry (autoplay policy)
        el.muted = true;
        el.play().catch(() => {});
      });
    };

    // Play now or when metadata loaded
    if (el.readyState >= 2) tryPlay();
    else el.addEventListener("loadedmetadata", tryPlay, { once: true });

    // FIX: re-attach when new tracks arrive (screen share replacement)
    const onAddTrack = () => {
      el.srcObject = null;
      el.srcObject = stream;
      el.muted = mutedRef.current;
      tryPlay();
    };
    stream.addEventListener("addtrack", onAddTrack);

    return () => {
      stream.removeEventListener("addtrack", onAddTrack);
      el.removeEventListener("loadedmetadata", tryPlay);
    };
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}

/* ─── TIMER ─────────────────────────────────────────────────── */
function useTimer(active) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
    : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

/* ─── CTRL BUTTON ───────────────────────────────────────────── */
function Ctrl({ icon, label, mode = "on", badge, onClick }) {
  const colors = {
    on:  { bg: "#3c4043", hover: "#4a4d50" },
    off: { bg: "#ea4335", hover: "#c5221f" },
    hi:  { bg: "#1a73e8", hover: "#1557b0" },
    end: { bg: "#ea4335", hover: "#c5221f", w: 68, r: 28 },
  };
  const c = colors[mode] || colors.on;
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{ display:"flex", flexDirection:"column", alignItems:"center",
        gap:4, background:"none", border:"none", cursor:"pointer",
        padding:"0 2px", minWidth: 52 }}
    >
      <div style={{
        width: c.w || 48, height: 48,
        borderRadius: c.r || "50%",
        background: c.bg,
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"#fff", position:"relative",
        transition:"background .15s",
        flexShrink: 0,
      }}
        onMouseOver={e => e.currentTarget.style.background = c.hover}
        onMouseOut={e => e.currentTarget.style.background = c.bg}
      >
        {icon}
        {badge > 0 && (
          <span style={{
            position:"absolute", top:-3, right:-3,
            minWidth:18, height:18, borderRadius:9,
            background:"#1a73e8", color:"#fff",
            fontSize:10, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:"0 4px",
          }}>{badge > 9 ? "9+" : badge}</span>
        )}
      </div>
      <span style={{ fontSize:11, color:"#9aa0a6", whiteSpace:"nowrap",
        fontFamily:"var(--font)", lineHeight:1 }}>{label}</span>
    </button>
  );
}

/* ─── TILE ──────────────────────────────────────────────────── */
function Tile({ id, p, isLocal, isPinned, onPin }) {
  // FIX: show video if stream exists, regardless of videoOn for remote
  // (videoOn controls track.enabled, but stream still exists)
  const hasCamStream = !!(p.stream && p.stream.getVideoTracks().length > 0);
  const showVideo = hasCamStream && (isLocal ? p.videoOn !== false : true);

  return (
    <div
      onClick={() => onPin && onPin(id)}
      style={{
        position:"relative", borderRadius:8, overflow:"hidden",
        background:"#1e2428", display:"flex", alignItems:"center",
        justifyContent:"center", width:"100%", height:"100%",
        minHeight:120, cursor:"pointer",
        outline: isPinned ? "3px solid #1a73e8" : "none",
      }}
    >
      {showVideo
        ? <Vid stream={p.stream} muted={isLocal} />
        : (
          <div style={{ display:"flex", flexDirection:"column",
            alignItems:"center", gap:10 }}>
            <GmAvatar name={p.name} size={isPinned ? 80 : 52} />
          </div>
        )
      }
      {/* name bar */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0,
        padding:"24px 10px 8px",
        background:"linear-gradient(transparent,rgba(0,0,0,.7))",
        display:"flex", alignItems:"center", gap:6,
      }}>
        {p.micOn === false && (
          <span style={{
            width:20, height:20, borderRadius:"50%",
            background:"#ea4335", display:"flex",
            alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="3" strokeLinecap="round">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
            </svg>
          </span>
        )}
        <span style={{ flex:1, fontSize:13, fontWeight:500, color:"#fff",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {p.name}{isLocal ? " (You)" : ""}
        </span>
        {p.handRaised && <span style={{ fontSize:14 }}>✋</span>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MEET PAGE
════════════════════════════════════════════════════════════════ */
export default function Meet() {
  const { code } = useParams();
  const nav = useNavigate();
  const { name: authName, username, token } = useAuth();

  const [phase, setPhase] = useState("lobby");
  const [myName, setMyName] = useState(authName || username || "");

  /* lobby */
  const [prevStream, setPrev] = useState(null);
  const [prevMic, setPrevMic] = useState(true);
  const [prevCam, setPrevCam] = useState(true);

  /* call */
  const [localStream, setLocal] = useState(null);
  /* peers: { [socketId]: { name, stream, micOn, videoOn, handRaised } } */
  const [peers, setPeers] = useState({});
  const [micOn, setMicOn] = useState(true);
  const [vidOn, setVidOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [handUp, setHandUp] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [waitQ, setWaitQ] = useState([]);
  const [pinned, setPinned] = useState(null);
  const [view, setView] = useState("speaker");

  /* panel */
  const [panel, setPanel] = useState(null);
  const [chatText, setChatText] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [unread, setUnread] = useState(0);
  const chatEnd = useRef(null);
  const timer = useTimer(phase === "call");

  /* refs */
  const sockRef = useRef(null);
  const myIdRef = useRef(null);
  const pcsRef  = useRef({});   // id -> RTCPeerConnection
  const iceBuf  = useRef({});   // id -> RTCIceCandidate[] (pre-remoteDesc)
  const camRef  = useRef(null); // live cam/screen MediaStream
  const micRef  = useRef(true);
  const vidRef  = useRef(true);

  useEffect(() => { micRef.current = micOn; }, [micOn]);
  useEffect(() => { vidRef.current = vidOn; }, [vidOn]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);
  useEffect(() => { if (panel === "chat") setUnread(0); }, [panel]);

  /* ── lobby camera preview ───────────────────────────────── */
  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video:true, audio:true })
      .then(s => { if (active) setPrev(s); })
      .catch(() => { if (active) { setPrevMic(false); setPrevCam(false); } });
    return () => {
      active = false;
    };
  }, []);

  // stop lobby stream on unmount or when call starts
  useEffect(() => {
    return () => { prevStream?.getTracks().forEach(t => t.stop()); };
  }, [prevStream]);

  useEffect(() => {
    if (!prevStream) return;
    prevStream.getAudioTracks().forEach(t => { t.enabled = prevMic; });
    prevStream.getVideoTracks().forEach(t => { t.enabled = prevCam; });
  }, [prevMic, prevCam, prevStream]);

  /* ── peer state helper ──────────────────────────────────── */
  const updPeer = useCallback((id, patch) => {
    if (id === myIdRef.current) return;
    setPeers(prev => ({
      ...prev,
      [id]: {
        name: `User`, micOn: true, videoOn: true,
        handRaised: false, stream: null,
        ...prev[id], ...patch,
      },
    }));
  }, []);

  /* ── drain buffered ICE candidates ─────────────────────── */
  const drainBuf = useCallback(async id => {
    const pc = pcsRef.current[id];
    const buf = iceBuf.current[id] || [];
    iceBuf.current[id] = [];
    for (const c of buf) {
      await pc.addIceCandidate(c).catch(() => {});
    }
  }, []);

  /* ── create RTCPeerConnection ───────────────────────────── */
  const mkPeer = useCallback(id => {
    if (id === myIdRef.current) return null;
    pcsRef.current[id]?.close();
    iceBuf.current[id] = [];

    const pc = new RTCPeerConnection({ iceServers: ICE });
    pcsRef.current[id] = pc;

    // Add local tracks NOW (before offer/answer)
    if (camRef.current) {
      camRef.current.getTracks().forEach(t => {
        pc.addTrack(t, camRef.current);
      });
    }

    /* FIX: ontrack — create NEW stream object each time to force React re-render */
    const remoteStream = new MediaStream();
    pc.ontrack = ev => {
      ev.track.onunmute = () => {
        remoteStream.addTrack(ev.track);
        // Force new reference so React detects change
        updPeer(id, { stream: new MediaStream(remoteStream.getTracks()) });
      };
      // Also add immediately (track might already be unmuted)
      if (ev.track.readyState === "live") {
        remoteStream.addTrack(ev.track);
        updPeer(id, { stream: new MediaStream(remoteStream.getTracks()) });
      }
      ev.streams?.[0]?.getTracks().forEach(t => {
        if (!remoteStream.getTracks().includes(t)) {
          remoteStream.addTrack(t);
        }
      });
      updPeer(id, { stream: new MediaStream(remoteStream.getTracks()) });
    };

    pc.onicecandidate = ev => {
      if (ev.candidate)
        sockRef.current?.emit("signal", id, { type:"candidate", candidate:ev.candidate });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") pc.restartIce?.();
    };

    return pc;
  }, [updPeer]);

  /* ── wire socket ────────────────────────────────────────── */
  const wireSock = useCallback((sock, name) => {
    sock.on("connect", () => {
      myIdRef.current = sock.id;
      sock.emit("join-call", code, name);
    });

    sock.on("you-are-host", () => setIsHost(true));

    sock.on("existing-users", async (ids, nameMap) => {
      setPhase("call");
      for (const id of ids) {
        if (id === myIdRef.current) continue;
        updPeer(id, { name: nameMap[id] || `User ${id.slice(0,4)}` });
        const pc = mkPeer(id);
        if (!pc) continue;
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio:true, offerToReceiveVideo:true });
          await pc.setLocalDescription(offer);
          sock.emit("signal", id, { type:"offer", offer, name });
        } catch (e) { console.error("offer error", e); }
      }
      sock.emit("user-name", name);
      sock.emit("mute-status", micRef.current, vidRef.current);
    });

    sock.on("user-joined", id => {
      if (id !== myIdRef.current) updPeer(id, {});
    });

    sock.on("signal", async (fromId, msg) => {
      if (fromId === myIdRef.current) return;

      if (msg.type === "offer") {
        let pc = pcsRef.current[fromId];
        if (!pc) pc = mkPeer(fromId);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
          await drainBuf(fromId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sock.emit("signal", fromId, { type:"answer", answer, name });
          if (msg.name) updPeer(fromId, { name: msg.name });
        } catch (e) { console.error("answer error", e); }

      } else if (msg.type === "answer") {
        const pc = pcsRef.current[fromId];
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
          await drainBuf(fromId);
          if (msg.name) updPeer(fromId, { name: msg.name });
        } catch (e) { console.error("setRemote answer error", e); }

      } else if (msg.type === "candidate") {
        const pc = pcsRef.current[fromId];
        if (!pc) return;
        const cand = new RTCIceCandidate(msg.candidate);
        if (pc.remoteDescription?.type) {
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
      setPeers(prev => { const n = {...prev}; delete n[id]; return n; });
      setPinned(p => p === id ? null : p);
    });

    sock.on("peer-name",    (id, n) => updPeer(id, { name: n }));
    sock.on("mute-status",  (id, m, v) => updPeer(id, { micOn: m, videoOn: v }));
    sock.on("hand-raised",  id => updPeer(id, { handRaised: true }));
    sock.on("hand-lowered", id => updPeer(id, { handRaised: false }));
    sock.on("waiting-for-host", () => setPhase("waiting"));
    sock.on("join-denied",      () => setPhase("denied"));

    sock.on("user-waiting", user => {
      setWaitQ(q => {
        const next = [...q.filter(u => u.id !== user.id), user];
        if (next.length) setPanel("waiting");
        return next;
      });
    });

    sock.on("chat-message", (text, sender, sid) => {
      if (sid === myIdRef.current) return;
      setMsgs(m => [...m, { sender, text, self:false }]);
      setPanel(p => { if (p !== "chat") setUnread(c => c+1); return p; });
    });
  }, [code, mkPeer, updPeer, drainBuf]);

  /* ── join call ──────────────────────────────────────────── */
  const join = () => {
    if (!myName.trim()) return;
    // Stop lobby preview first
    prevStream?.getTracks().forEach(t => t.stop());
    setPrev(null);

    const boot = stream => {
      camRef.current = stream;
      // Apply initial enabled states
      stream.getAudioTracks().forEach(t => { t.enabled = prevMic; });
      stream.getVideoTracks().forEach(t => { t.enabled = prevCam; });
      setLocal(stream);
      setMicOn(prevMic);
      setVidOn(prevCam);
      if (token) api.addHistory({ token, meeting_code: code }).catch(() => {});
      const sock = io(SOCKET_URL, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
      });
      sockRef.current = sock;
      wireSock(sock, myName.trim());
    };

    navigator.mediaDevices
      .getUserMedia({ video: prevCam, audio: prevMic })
      .then(boot)
      .catch(() => boot(new MediaStream()));
  };

  /* ── leave ──────────────────────────────────────────────── */
  const leave = () => {
    sockRef.current?.disconnect();
    localStream?.getTracks().forEach(t => t.stop());
    camRef.current?.getTracks().forEach(t => t.stop());
    Object.values(pcsRef.current).forEach(pc => pc.close());
    pcsRef.current = {};
    nav("/home");
  };

  /* FIX: apply mute/unmute to live tracks — do NOT recreate stream */
  useEffect(() => {
    if (!localStream || phase !== "call") return;
    localStream.getAudioTracks().forEach(t => { t.enabled = micOn; });
    if (!sharing) localStream.getVideoTracks().forEach(t => { t.enabled = vidOn; });
    sockRef.current?.emit("mute-status", micOn, vidOn);
  }, [micOn, vidOn, localStream, sharing, phase]);

  /* ── screen share ───────────────────────────────────────── */
  const stopShare = useCallback(async () => {
    setSharing(false);
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      cam.getAudioTracks().forEach(t => { t.enabled = micRef.current; });
      cam.getVideoTracks().forEach(t => { t.enabled = vidRef.current; });
      camRef.current?.getTracks().forEach(t => t.stop()); // stop screen track
      camRef.current = cam;
      setLocal(cam); // FIX: update React state → triggers Vid re-render
      const vt = cam.getVideoTracks()[0];
      if (vt) {
        Object.values(pcsRef.current).forEach(pc =>
          pc.getSenders().find(s => s.track?.kind === "video")?.replaceTrack(vt)
        );
      }
    } catch (e) { console.error("stopShare error", e); }
  }, []);

  const toggleShare = async () => {
    if (sharing) { stopShare(); return; }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" }, audio: false,
      });
      const vt = screen.getVideoTracks()[0];
      // Replace video track on all peer connections
      Object.values(pcsRef.current).forEach(pc =>
        pc.getSenders().find(s => s.track?.kind === "video")?.replaceTrack(vt)
      );
      // Keep existing audio, replace video track in local stream
      const audioTracks = camRef.current?.getAudioTracks() ?? [];
      const newStream = new MediaStream([vt, ...audioTracks]);
      camRef.current = newStream;
      setLocal(newStream); // FIX: force React state update → Vid re-renders
      setSharing(true);
      vt.onended = () => stopShare();
    } catch (e) {
      if (e.name !== "NotAllowedError") console.error("screen share error", e);
    }
  };

  /* ── hand ───────────────────────────────────────────────── */
  const toggleHand = () => {
    const next = !handUp;
    setHandUp(next);
    sockRef.current?.emit(next ? "raise-hand" : "lower-hand");
  };

  /* ── chat ───────────────────────────────────────────────── */
  const sendChat = e => {
    e.preventDefault();
    const txt = chatText.trim();
    if (!txt || !sockRef.current) return;
    sockRef.current.emit("chat-message", txt, myName);
    setMsgs(m => [...m, { sender: "You", text: txt, self: true }]);
    setChatText("");
  };

  /* ── waiting room ───────────────────────────────────────── */
  const admit = id => { sockRef.current?.emit("admit-user", id); setWaitQ(q => q.filter(u => u.id !== id)); };
  const deny  = id => { sockRef.current?.emit("deny-user",  id); setWaitQ(q => q.filter(u => u.id !== id)); };

  /* ── layout ─────────────────────────────────────────────── */
  const togglePanel = name => setPanel(p => p === name ? null : name);
  const togglePin   = id => setPinned(p => p === id ? null : id);

  const localP   = { stream:localStream, name:myName, micOn, videoOn:vidOn, handRaised:handUp };
  const peerArr  = Object.entries(peers);
  const all      = [["local", localP], ...peerArr];
  const handsN   = [handUp, ...peerArr.map(([,p]) => p.handRaised)].filter(Boolean).length;

  const featId   = pinned ?? (peerArr.length > 0 ? peerArr[0][0] : "local");
  const featIsLoc = featId === "local";
  const featP    = featIsLoc ? localP : (peers[featId] || localP);
  const film     = all.filter(([id]) => id !== featId);

  const n = all.length;
  const gridCols = n <= 1 ? "1fr" : n <= 4 ? "repeat(2,1fr)" : "repeat(3,1fr)";

  /* ═══════════════ LOBBY ══════════════════════════════════ */
  if (phase === "lobby") {
    return (
      <div style={{ minHeight:"100dvh", background:"#202124", display:"flex", flexDirection:"column" }}>
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
            <h1 style={{ textAlign:"center", fontFamily:"var(--font)",
              fontSize:"clamp(22px,4vw,30px)", fontWeight:400,
              color:"#e8eaed", marginBottom:8 }}>Ready to join?</h1>
            <p style={{ textAlign:"center", color:"#9aa0a6", fontSize:14, marginBottom:32 }}>
              Code:&nbsp;
              <code style={{ background:"#2d2f31", padding:"2px 10px",
                borderRadius:4, color:"#e8eaed", border:"1px solid #444746",
                fontFamily:"monospace" }}>{code}</code>
            </p>

            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
              gap:24 }}>
              {/* camera preview */}
              <div>
                <div style={{ aspectRatio:"16/9", background:"#111",
                  borderRadius:12, overflow:"hidden", position:"relative",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  border:"1px solid #3c4043" }}>
                  {prevStream && prevCam
                    ? <Vid stream={prevStream} muted={true} />
                    : <div style={{ display:"flex", flexDirection:"column",
                        alignItems:"center", gap:12 }}>
                        <GmAvatar name={myName || "?"} size={72} />
                        <span style={{ color:"#9aa0a6", fontSize:13 }}>Camera is off</span>
                      </div>
                  }
                  <div style={{ position:"absolute", bottom:12, left:"50%",
                    transform:"translateX(-50%)", display:"flex", gap:10 }}>
                    {[
                      { on:prevMic, onIcon:ICONS.mic, offIcon:ICONS.micOff, fn:()=>setPrevMic(v=>!v) },
                      { on:prevCam, onIcon:ICONS.cam, offIcon:ICONS.camOff, fn:()=>setPrevCam(v=>!v) },
                    ].map((b,i) => (
                      <button key={i} onClick={b.fn}
                        style={{ width:42, height:42, borderRadius:"50%",
                          border:"none", cursor:"pointer",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          background: b.on ? "rgba(0,0,0,.55)" : "#ea4335",
                          color:"#fff", backdropFilter:"blur(6px)",
                          transition:"background .15s" }}>
                        {b.on ? b.onIcon : b.offIcon}
                      </button>
                    ))}
                  </div>
                </div>
                <p style={{ fontSize:12, color:"#5f6368", textAlign:"center", marginTop:8 }}>
                  Your video is only shared when you join
                </p>
              </div>

              {/* join form */}
              <div style={{ display:"flex", flexDirection:"column", gap:18, paddingTop:4 }}>
                <div>
                  <label style={{ display:"block", fontSize:12,
                    color:"#9aa0a6", marginBottom:7 }}>Your name</label>
                  <input className="gm-input" value={myName}
                    onChange={e => setMyName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && join()}
                    placeholder="Enter your name"
                    autoFocus
                    style={{ height:50, fontSize:16 }} />
                </div>
                <button onClick={join} disabled={!myName.trim()}
                  style={{
                    padding:"14px", fontSize:16, borderRadius:4,
                    background: myName.trim() ? "#1a73e8" : "#3c4043",
                    color:"#fff", border:"none", cursor: myName.trim() ? "pointer" : "not-allowed",
                    fontFamily:"var(--font)", fontWeight:500, transition:"background .15s",
                  }}>
                  Join now
                </button>
                <button onClick={() => nav("/home")}
                  style={{ background:"none", border:"none", cursor:"pointer",
                    color:"#1a73e8", fontFamily:"var(--font)", fontSize:14 }}>
                  ← Return to home
                </button>
                <div style={{ background:"#2d2f31", border:"1px solid #444746",
                  borderRadius:8, padding:"12px 14px", display:"flex", gap:10,
                  alignItems:"flex-start" }}>
                  <span style={{ color:"#9aa0a6", flexShrink:0, marginTop:1 }}>🔒</span>
                  <p style={{ fontSize:13, color:"#9aa0a6", lineHeight:1.6, margin:0 }}>
                    Your connection is encrypted. Only the host can admit participants.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════ WAITING ════════════════════════════════ */
  if (phase === "waiting") return (
    <div style={{ minHeight:"100dvh", background:"#202124",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ textAlign:"center", maxWidth:360 }}>
        <div style={{ width:80, height:80, borderRadius:"50%",
          background:"rgba(26,115,232,.1)", border:"1px solid rgba(26,115,232,.2)",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 24px", fontSize:34 }}>🚪</div>
        <h2 style={{ fontFamily:"var(--font)", fontSize:24, fontWeight:400,
          color:"#e8eaed", marginBottom:10 }}>Waiting to be admitted</h2>
        <p style={{ color:"#9aa0a6", fontSize:15, lineHeight:1.65, marginBottom:28 }}>
          The host will let you in shortly.
        </p>
        <div style={{ width:28, height:28, borderRadius:"50%",
          border:"3px solid rgba(255,255,255,.12)",
          borderTopColor:"#1a73e8",
          animation:"rot .7s linear infinite",
          margin:"0 auto 28px" }}/>
        <button onClick={() => { sockRef.current?.disconnect(); setPhase("lobby"); }}
          style={{ background:"transparent", border:"1px solid #444746",
            borderRadius:4, padding:"10px 24px", color:"#9aa0a6",
            cursor:"pointer", fontFamily:"var(--font)", fontSize:14 }}>
          Cancel
        </button>
      </div>
    </div>
  );

  /* ═══════════════ DENIED ═════════════════════════════════ */
  if (phase === "denied") return (
    <div style={{ minHeight:"100dvh", background:"#202124",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ textAlign:"center", maxWidth:360 }}>
        <div style={{ width:80, height:80, borderRadius:"50%",
          background:"rgba(234,67,53,.1)", border:"1px solid rgba(234,67,53,.2)",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 24px", fontSize:34 }}>🚫</div>
        <h2 style={{ fontFamily:"var(--font)", fontSize:24, fontWeight:400,
          color:"#e8eaed", marginBottom:10 }}>Entry denied</h2>
        <p style={{ color:"#9aa0a6", fontSize:15, lineHeight:1.65, marginBottom:32 }}>
          The host didn't let you in.
        </p>
        <button onClick={() => nav("/home")}
          style={{ background:"#1a73e8", border:"none", borderRadius:4,
            padding:"12px 28px", color:"#fff", cursor:"pointer",
            fontFamily:"var(--font)", fontSize:15 }}>
          Return to home
        </button>
      </div>
    </div>
  );

  /* ═══════════════ IN CALL ════════════════════════════════ */
  return (
    <div style={{ height:"100dvh", background:"#1a1a1a",
      display:"flex", flexDirection:"column",
      overflow:"hidden", fontFamily:"var(--font)" }}>

      {/* top bar */}
      <div style={{ height:52, display:"flex", alignItems:"center",
        justifyContent:"space-between", padding:"0 16px",
        background:"#202124", borderBottom:"1px solid rgba(255,255,255,.06)",
        flexShrink:0, zIndex:10, gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#1a73e8"/>
            <path d="M8 14a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H11a3 3 0 01-3-3V14z" fill="#fff"/>
            <path d="M26 17l6-4v14l-6-4V17z" fill="#fff"/>
          </svg>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:500, color:"rgba(255,255,255,.85)" }}>ConnectCall</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.35)",
              fontFamily:"monospace", overflow:"hidden",
              textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>{code}</div>
          </div>
          {isHost && (
            <span style={{ fontSize:11, background:"rgba(26,115,232,.18)",
              color:"#8ab4f8", padding:"2px 9px", borderRadius:10, fontWeight:600,
              flexShrink:0 }}>HOST</span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14,
          color:"rgba(255,255,255,.5)", fontSize:13, flexShrink:0 }}>
          {handsN > 0 && <span style={{ color:"#fdd663" }}>✋ {handsN}</span>}
          <span>⏱ {timer}</span>
          <span style={{ background:"rgba(255,255,255,.08)",
            padding:"2px 8px", borderRadius:10 }}>👥 {all.length}</span>
          <button onClick={() => setView(v => v==="speaker"?"grid":"speaker")}
            title={view==="speaker"?"Grid view":"Speaker view"}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:"rgba(255,255,255,.6)", display:"flex",
              alignItems:"center", padding:4, borderRadius:6 }}>
            {view === "speaker" ? ICONS.grid : ICONS.spk}
          </button>
        </div>
      </div>

      {/* main area */}
      <div style={{ flex:1, display:"flex", minHeight:0, overflow:"hidden" }}>

        {/* video zone */}
        <div style={{ flex:1, display:"flex", flexDirection:"column",
          minWidth:0, overflow:"hidden" }}>

          {view === "speaker" ? (
            <>
              {/* featured speaker */}
              <div style={{ flex:1, padding:"8px 8px 0", minHeight:0 }}>
                <div style={{ width:"100%", height:"100%",
                  borderRadius:10, overflow:"hidden" }}>
                  <Tile id={featId} p={featP}
                    isLocal={featIsLoc}
                    isPinned={!!pinned && pinned === featId}
                    onPin={togglePin} />
                </div>
              </div>
              {/* filmstrip */}
              {film.length > 0 && (
                <div style={{ padding:"6px 8px 4px",
                  display:"flex", gap:5, overflowX:"auto",
                  flexShrink:0, minHeight:104 }}>
                  {film.map(([id, p]) => (
                    <div key={id} style={{ width:152, minWidth:152, height:96,
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
            /* grid view */
            <div style={{ flex:1, padding:8, overflow:"auto",
              display:"grid", gap:6,
              gridTemplateColumns: gridCols,
              alignContent:"start" }}>
              {all.map(([id, p]) => (
                <div key={id} style={{ borderRadius:8, overflow:"hidden", minHeight:140 }}>
                  <Tile id={id} p={p}
                    isLocal={id==="local"}
                    isPinned={id===pinned}
                    onPin={togglePin} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* side panel */}
        {panel && (
          <div style={{ width:"clamp(260px,28vw,340px)", flexShrink:0,
            display:"flex", flexDirection:"column",
            background:"#202124",
            borderLeft:"1px solid rgba(255,255,255,.07)",
            overflow:"hidden" }}>

            {/* panel header */}
            <div style={{ height:52, display:"flex", alignItems:"center",
              justifyContent:"space-between", padding:"0 16px",
              borderBottom:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
              <span style={{ fontSize:15, fontWeight:500, color:"#e8eaed" }}>
                {panel==="chat"    && "In-call messages"}
                {panel==="people"  && `People (${all.length})`}
                {panel==="waiting" && `Waiting room (${waitQ.length})`}
              </span>
              <button onClick={()=>setPanel(null)}
                style={{ background:"none", border:"none", cursor:"pointer",
                  color:"rgba(255,255,255,.5)", display:"flex", padding:4, borderRadius:"50%" }}>
                {ICONS.close}
              </button>
            </div>

            {/* CHAT */}
            {panel === "chat" && (
              <>
                <div style={{ flex:1, overflowY:"auto",
                  padding:"12px 14px",
                  display:"flex", flexDirection:"column", gap:12 }}>
                  {msgs.length === 0 && (
                    <p style={{ textAlign:"center", color:"rgba(255,255,255,.25)",
                      fontSize:13, marginTop:32, lineHeight:1.7 }}>
                      Messages are only visible to call participants and are not saved.
                    </p>
                  )}
                  {msgs.map((m,i) => (
                    <div key={i} style={{ display:"flex", flexDirection:"column",
                      alignItems: m.self ? "flex-end" : "flex-start", gap:3 }}>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>
                        {m.sender}
                      </span>
                      <div style={{
                        background: m.self ? "#1a73e8" : "#3c4043",
                        padding:"8px 12px",
                        borderRadius: m.self ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                        maxWidth:"88%",
                      }}>
                        <p style={{ fontSize:14, color:"#e8eaed",
                          wordBreak:"break-word", lineHeight:1.5 }}>{m.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEnd}/>
                </div>
                <form onSubmit={sendChat}
                  style={{ padding:"10px 12px",
                    borderTop:"1px solid rgba(255,255,255,.07)",
                    display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                  <input value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    placeholder="Send a message…"
                    style={{ flex:1, background:"#3c4043",
                      border:"1px solid rgba(255,255,255,.07)",
                      borderRadius:22, padding:"9px 14px",
                      color:"#e8eaed", fontSize:14, outline:"none",
                      fontFamily:"var(--font)" }} />
                  <button type="submit" disabled={!chatText.trim()}
                    style={{ width:38, height:38, borderRadius:"50%",
                      border:"none", display:"flex", alignItems:"center",
                      justifyContent:"center", flexShrink:0,
                      background: chatText.trim() ? "#1a73e8" : "#3c4043",
                      color:"#fff", cursor: chatText.trim() ? "pointer" : "default",
                      transition:"background .15s" }}>
                    {ICONS.send}
                  </button>
                </form>
              </>
            )}

            {/* PEOPLE */}
            {panel === "people" && (
              <div style={{ flex:1, overflowY:"auto", padding:"6px 0" }}>
                {all.map(([id, p]) => (
                  <div key={id}
                    style={{ display:"flex", alignItems:"center",
                      gap:12, padding:"10px 16px", borderRadius:8,
                      transition:"background .12s" }}
                    onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
                    onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    <GmAvatar name={p.name} size={36}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, color:"#e8eaed",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {p.name}
                      </p>
                      {id==="local" && (
                        <p style={{ fontSize:11, marginTop:2,
                          color: isHost ? "#8ab4f8" : "rgba(255,255,255,.35)" }}>
                          {isHost ? "You · Host" : "You"}
                        </p>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:6, color:"rgba(255,255,255,.4)" }}>
                      {p.micOn === false && ICONS.micOff}
                      {p.handRaised && <span>✋</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* WAITING ROOM */}
            {panel === "waiting" && (
              <div style={{ flex:1, overflowY:"auto", padding:14 }}>
                {waitQ.length === 0 && (
                  <p style={{ textAlign:"center", color:"rgba(255,255,255,.28)",
                    fontSize:14, marginTop:32 }}>Nobody is waiting</p>
                )}
                {waitQ.map(u => (
                  <div key={u.id}
                    style={{ background:"#2d2f31",
                      border:"1px solid rgba(255,255,255,.07)",
                      borderRadius:10, padding:"14px",
                      marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center",
                      gap:10, marginBottom:12 }}>
                      <GmAvatar name={u.name} size={34}/>
                      <span style={{ fontSize:14, fontWeight:500, color:"#e8eaed" }}>
                        {u.name}
                      </span>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>admit(u.id)}
                        style={{ flex:1, padding:"9px", fontSize:13,
                          borderRadius:4, background:"#1a73e8", color:"#fff",
                          border:"none", cursor:"pointer", fontFamily:"var(--font)",
                          fontWeight:500 }}>
                        Admit
                      </button>
                      <button onClick={()=>deny(u.id)}
                        style={{ flex:1, padding:"9px", fontSize:13,
                          borderRadius:4, background:"transparent",
                          border:"1px solid #444746", color:"#9aa0a6",
                          cursor:"pointer", fontFamily:"var(--font)" }}>
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

      {/* bottom toolbar */}
      <div style={{ height:76, background:"#202124",
        borderTop:"1px solid rgba(255,255,255,.06)",
        display:"flex", alignItems:"center",
        justifyContent:"space-between",
        padding:"0 12px", flexShrink:0, gap:4 }}>

        {/* left: mic + cam */}
        <div style={{ display:"flex", gap:4 }}>
          <Ctrl icon={micOn ? ICONS.mic : ICONS.micOff}
            label={micOn ? "Mute" : "Unmute"}
            mode={micOn ? "on" : "off"}
            onClick={()=>setMicOn(v=>!v)} />
          <Ctrl icon={vidOn ? ICONS.cam : ICONS.camOff}
            label={vidOn ? "Stop video" : "Start video"}
            mode={vidOn ? "on" : "off"}
            onClick={()=>setVidOn(v=>!v)} />
        </div>

        {/* center */}
        <div style={{ display:"flex", gap:4 }}>
          <Ctrl icon={ICONS.screen}
            label={sharing ? "Stop sharing" : "Present"}
            mode={sharing ? "hi" : "on"}
            onClick={toggleShare} />
          <Ctrl icon={ICONS.hand}
            label={handUp ? "Lower hand" : "Raise hand"}
            mode={handUp ? "hi" : "on"}
            onClick={toggleHand} />
          <Ctrl icon={ICONS.chat}
            label="Chat"
            mode={panel==="chat" ? "hi" : "on"}
            badge={unread}
            onClick={()=>togglePanel("chat")} />
          <Ctrl icon={ICONS.people}
            label="People"
            mode={panel==="people" ? "hi" : "on"}
            onClick={()=>togglePanel("people")} />
          {isHost && (
            <Ctrl icon={ICONS.lock}
              label="Waiting"
              mode={panel==="waiting" ? "hi" : "on"}
              badge={waitQ.length}
              onClick={()=>togglePanel("waiting")} />
          )}
        </div>

        {/* right: leave */}
        <Ctrl icon={ICONS.leave} label="Leave" mode="end" onClick={leave} />
      </div>
    </div>
  );
}
