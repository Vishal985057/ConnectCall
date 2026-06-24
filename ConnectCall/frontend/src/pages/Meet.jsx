import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { api } from "../lib/api.js";
import { io } from "socket.io-client";

// In production VITE_API_URL = your backend Render URL
// In development it is empty — Vite proxy handles it
const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];

// ── Helpers ───────────────────────────────────────────────────────────────────
function useMeetingTimer(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function StreamVideo({ stream, muted, className }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className || "w-full h-full object-cover"} />;
}

function Avatar({ name, size = "md" }) {
  const sizes = { sm: "w-9 h-9 text-sm", md: "w-16 h-16 text-2xl", lg: "w-24 h-24 text-4xl" };
  const initials = (name || "?").trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`${sizes[size]} rounded-full bg-blue-600/20 flex items-center justify-center font-bold text-blue-400 shrink-0`}>
      {initials}
    </div>
  );
}

function CtrlBtn({ icon, label, active = true, danger = false, accent = false, badge, onClick }) {
  const base = "relative rounded-full w-11 h-11 flex items-center justify-center transition-all cursor-pointer border-none";
  const color = danger
    ? "bg-red-600 hover:bg-red-500 text-white"
    : accent
    ? "bg-blue-600 hover:bg-blue-500 text-white"
    : !active
    ? "bg-red-600/20 hover:bg-red-600/30 text-red-400"
    : "bg-white/10 hover:bg-white/20 text-white";

  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{ flexDirection: "column", alignItems: "center", gap: "2px", display: "flex", background: "none", border: "none", cursor: "pointer" }}
    >
      <div className={`${base} ${color}`}>
        {icon}
        {badge !== undefined && badge > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, background: "#3b82f6", borderRadius: "50%", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, whiteSpace: "nowrap" }} className="hidden sm:block">{label}</span>
    </button>
  );
}

function VideoTile({ id, p, isPinned, onPin, muted }) {
  return (
    <div
      onClick={() => onPin(id)}
      style={{ position: "relative", background: "#18181b", borderRadius: 12, overflow: "hidden", border: isPinned ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {p.stream
        ? <StreamVideo stream={p.stream} muted={muted} className="w-full h-full object-cover" />
        : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 16 }}>
            <Avatar name={p.name} size="md" />
          </div>
      }
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
        {!p.micOn && <span style={{ fontSize: 10, color: "#f87171" }}>🔇</span>}
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
        {p.handRaised && <span>✋</span>}
      </div>
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const icons = {
  mic: (on) => on
    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  cam: (on) => on
    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06A4 4 0 0 1 8.56 8.56"/></svg>,
  screen: (on) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  chat: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  people: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  leave: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  grid: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  speaker: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="12" height="10"/><polygon points="22 3 14 7 14 17 22 21 22 3"/></svg>,
  hand: (raised) => raised
    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 1.5A1.5 1.5 0 0 1 12 3v9a1.5 1.5 0 0 1-3 0V3a1.5 1.5 0 0 1 1.5-1.5zM6 4.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-3 0V6A1.5 1.5 0 0 1 6 4.5zm10.5 0A1.5 1.5 0 0 1 18 6v7.5a1.5 1.5 0 0 1-3 0V6a1.5 1.5 0 0 1 1.5-1.5zM3 15a1.5 1.5 0 0 1 1.5-1.5 1.5 1.5 0 0 1 1.5 1.5v1.5H21v-2.25A2.25 2.25 0 0 0 18.75 12H5.25A2.25 2.25 0 0 0 3 14.25V18a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-1.5H3V15z"/></svg>
    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>,
};

// ══════════════════════════════════════════════════════════════════════════════
export default function Meet() {
  const { meetingCode } = useParams();
  const navigate = useNavigate();
  const { name: authName, username, token } = useAuth();

  const [phase, setPhase] = useState("lobby");
  const [displayName, setDisplayName] = useState(authName || username || "");
  const [lobbyStream, setLobbyStream] = useState(null);
  const [lobbyMic, setLobbyMic] = useState(true);
  const [lobbyCam, setLobbyCam] = useState(true);

  const [localStream, setLocalStream] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState({});

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [waitingQueue, setWaitingQueue] = useState([]);

  const [viewMode, setViewMode] = useState("speaker"); // "speaker" | "grid"
  const [pinnedId, setPinnedId] = useState(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const chatEndRef = useRef(null);

  const timer = useMeetingTimer(phase === "call");

  const socketRef = useRef(null);
  const mySocketIdRef = useRef(null);
  const peersRef = useRef({});
  const cameraStreamRef = useRef(null);
  const micOnRef = useRef(micOn);
  const videoOnRef = useRef(videoOn);

  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { videoOnRef.current = videoOn; }, [videoOn]);

  // Lobby: grab camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(setLobbyStream)
      .catch(() => { setLobbyMic(false); setLobbyCam(false); });
    return () => {};
  }, []);

  useEffect(() => {
    if (!lobbyStream) return;
    lobbyStream.getAudioTracks().forEach((t) => { t.enabled = lobbyMic; });
    lobbyStream.getVideoTracks().forEach((t) => { t.enabled = lobbyCam; });
  }, [lobbyMic, lobbyCam, lobbyStream]);

  useEffect(() => {
    if (!localStream || phase !== "call") return;
    localStream.getAudioTracks().forEach((t) => { t.enabled = micOn; });
    if (!isScreenSharing) localStream.getVideoTracks().forEach((t) => { t.enabled = videoOn; });
    socketRef.current?.emit("mute-status", micOn, videoOn);
  }, [micOn, videoOn, localStream, isScreenSharing, phase]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (chatOpen) setUnread(0); }, [chatOpen]);

  const updateParticipant = useCallback((id, patch) => {
    if (id === mySocketIdRef.current) return;
    setRemoteParticipants((prev) => {
      const existing = prev[id] || { stream: null, name: `User ${id.slice(0, 4)}`, micOn: true, videoOn: true, handRaised: false };
      return { ...prev, [id]: { ...existing, ...patch } };
    });
  }, []);

  const createPeer = useCallback((targetId) => {
    if (targetId === mySocketIdRef.current) return null;
    peersRef.current[targetId]?.close();
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current[targetId] = peer;
    const stream = cameraStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => peer.addTrack(t, stream));
    peer.ontrack = (event) => { updateParticipant(targetId, { stream: event.streams[0] }); };
    peer.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit("signal", targetId, { type: "candidate", candidate: e.candidate });
    };
    return peer;
  }, [updateParticipant]);

  const wireSocket = useCallback((socket, dName) => {
    socket.on("connect", () => {
      mySocketIdRef.current = socket.id;
      socket.emit("join-call", window.location.href, dName);
    });

    socket.on("existing-users", async (existingIds, nameMap) => {
      if (existingIds.length === 0) setIsHost(true);
      setPhase("call");
      for (const id of existingIds) {
        if (id === mySocketIdRef.current) continue;
        updateParticipant(id, { name: nameMap[id] || `User ${id.slice(0, 4)}` });
        const peer = createPeer(id);
        if (!peer) continue;
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("signal", id, { type: "offer", offer, name: dName });
      }
      socket.emit("user-name", dName);
      socket.emit("mute-status", micOnRef.current, videoOnRef.current);
    });

    socket.on("user-joined", (id) => { if (id !== mySocketIdRef.current) updateParticipant(id, {}); });

    socket.on("signal", async (fromId, message) => {
      if (fromId === mySocketIdRef.current) return;
      let peer = peersRef.current[fromId];
      if (message.type === "offer" && !peer) peer = createPeer(fromId);
      if (!peer) return;
      if (message.type === "offer") {
        await peer.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("signal", fromId, { type: "answer", answer, name: dName });
        if (message.name) updateParticipant(fromId, { name: message.name });
      } else if (message.type === "answer") {
        await peer.setRemoteDescription(new RTCSessionDescription(message.answer));
        if (message.name) updateParticipant(fromId, { name: message.name });
      } else if (message.type === "candidate") {
        try { await peer.addIceCandidate(new RTCIceCandidate(message.candidate)); } catch { }
      }
    });

    socket.on("user-left", (id) => {
      if (id === mySocketIdRef.current) return;
      peersRef.current[id]?.close();
      delete peersRef.current[id];
      setRemoteParticipants((prev) => { const n = { ...prev }; delete n[id]; return n; });
      setPinnedId((prev) => (prev === id ? null : prev));
    });

    socket.on("user-name", (id, pName) => { if (id !== mySocketIdRef.current) updateParticipant(id, { name: pName }); });
    socket.on("mute-status", (id, pMic, pVideo) => { if (id !== mySocketIdRef.current) updateParticipant(id, { micOn: pMic, videoOn: pVideo }); });
    socket.on("hand-raised", (id) => { if (id !== mySocketIdRef.current) updateParticipant(id, { handRaised: true }); });
    socket.on("hand-lowered", (id) => { if (id !== mySocketIdRef.current) updateParticipant(id, { handRaised: false }); });
    socket.on("you-are-host", () => setIsHost(true));
    socket.on("waiting-for-host", () => setPhase("waiting"));
    socket.on("join-denied", () => setPhase("denied"));

    socket.on("chat-message", (data, sender, senderId) => {
      if (senderId === mySocketIdRef.current) return;
      setMessages((prev) => [...prev, { sender, text: data, self: false }]);
      setChatOpen((open) => { if (!open) setUnread((c) => c + 1); return open; });
    });

    socket.on("user-waiting", (user) => {
      setWaitingQueue((prev) => [...prev.filter((u) => u.id !== user.id), user]);
      setWaitingOpen(true);
    });
  }, [createPeer, updateParticipant]);

  const handleJoin = () => {
    if (!displayName.trim()) return;
    lobbyStream?.getTracks().forEach((t) => t.stop());

    const doConnect = (stream) => {
      cameraStreamRef.current = stream;
      setLocalStream(stream);
      setMicOn(lobbyMic);
      setVideoOn(lobbyCam);
      if (token) api.addToHistory({ token, meeting_code: meetingCode }).catch(() => {});
      const socket = io(SOCKET_URL, { path: "/socket.io" });
      socketRef.current = socket;
      wireSocket(socket, displayName);
    };

    navigator.mediaDevices
      .getUserMedia({ video: lobbyCam, audio: lobbyMic })
      .then(doConnect)
      .catch(() => doConnect(new MediaStream()));
  };

  const handleLeave = () => {
    socketRef.current?.disconnect();
    localStream?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(peersRef.current).forEach((p) => p.close());
    navigate("/home");
  };

  const stopScreenShare = useCallback(async () => {
    setIsScreenSharing(false);
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cam.getAudioTracks().forEach((t) => { t.enabled = micOnRef.current; });
      cam.getVideoTracks().forEach((t) => { t.enabled = videoOnRef.current; });
      cameraStreamRef.current = cam;
      setLocalStream(cam);
      const vt = cam.getVideoTracks()[0];
      if (vt) Object.values(peersRef.current).forEach((peer) => peer.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(vt));
    } catch { }
  }, []);

  const handleScreenShare = async () => {
    if (isScreenSharing) { await stopScreenShare(); return; }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const vt = screen.getVideoTracks()[0];
      Object.values(peersRef.current).forEach((peer) => peer.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(vt));
      setLocalStream(new MediaStream([vt, ...(cameraStreamRef.current?.getAudioTracks() ?? [])]));
      setIsScreenSharing(true);
      vt.onended = () => stopScreenShare();
    } catch { }
  };

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    socketRef.current?.emit(next ? "raise-hand" : "lower-hand");
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socketRef.current) return;
    socketRef.current.emit("chat-message", chatMessage, displayName);
    setMessages((prev) => [...prev, { sender: "You", text: chatMessage, self: true }]);
    setChatMessage("");
  };

  const admitUser = (id) => { socketRef.current?.emit("admit-user", id); setWaitingQueue((prev) => prev.filter((u) => u.id !== id)); };
  const denyUser = (id) => { socketRef.current?.emit("deny-user", id); setWaitingQueue((prev) => prev.filter((u) => u.id !== id)); };
  const togglePin = (id) => setPinnedId((prev) => (prev === id ? null : id));

  const localP = { stream: localStream, name: `${displayName} (You)`, micOn, videoOn, handRaised };
  const allParticipants = [["local", localP], ...Object.entries(remoteParticipants)];
  const remoteEntries = Object.entries(remoteParticipants);
  const effectivePinned = pinnedId ?? (remoteEntries.length > 0 ? remoteEntries[0][0] : "local");
  const featuredP = effectivePinned === "local" ? localP : (remoteParticipants[effectivePinned] ?? localP);
  const filmstrip = allParticipants.filter(([id]) => id !== effectivePinned);
  const handsCount = [handRaised, ...remoteEntries.map(([, p]) => p.handRaised)].filter(Boolean).length;
  const activePanel = chatOpen ? "chat" : peopleOpen ? "people" : waitingOpen ? "waiting" : null;

  const closeAllPanels = () => { setChatOpen(false); setPeopleOpen(false); setWaitingOpen(false); };

  // ── PHASE: Lobby ──────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <div style={{ minHeight: "100dvh", background: "#090e1a", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #1e2a42", background: "rgba(15,22,40,0.6)" }}>
          <div style={{ background: "#3b82f6", padding: 7, borderRadius: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>ConnectCall</span>
        </header>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
          <div style={{ width: "100%", maxWidth: 760 }}>
            <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: 6 }}>Ready to join?</h1>
            <p style={{ color: "#64748b", textAlign: "center", marginBottom: 36, fontSize: 14 }}>
              Meeting: <code style={{ background: "#1e2a42", padding: "2px 8px", borderRadius: 6, color: "#e2e8f0", fontFamily: "monospace" }}>{meetingCode}</code>
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 24 }}>
              {/* Camera preview */}
              <div style={{ aspectRatio: "16/9", background: "#18181b", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {lobbyStream && lobbyCam
                  ? <StreamVideo stream={lobbyStream} muted className="w-full h-full object-cover" />
                  : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <Avatar name={displayName || "?"} size="lg" />
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Camera off</span>
                    </div>
                }
                <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
                  <button onClick={() => setLobbyMic((v) => !v)} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: lobbyMic ? "rgba(0,0,0,0.6)" : "#ef4444", color: "#fff", fontSize: 14 }}>
                    {icons.mic(lobbyMic)}
                  </button>
                  <button onClick={() => setLobbyCam((v) => !v)} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: lobbyCam ? "rgba(0,0,0,0.6)" : "#ef4444", color: "#fff", fontSize: 14 }}>
                    {icons.cam(lobbyCam)}
                  </button>
                </div>
              </div>

              {/* Join form */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, justifyContent: "center" }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8", display: "block", marginBottom: 6 }}>Your display name</label>
                  <input
                    className="input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="Enter your name"
                    autoFocus
                    style={{ fontSize: 15, height: 48 }}
                  />
                </div>
                <button onClick={handleJoin} disabled={!displayName.trim()} className="btn btn-primary btn-lg w-full">
                  Join Meeting →
                </button>
                <button onClick={() => navigate("/home")} className="btn btn-ghost w-full" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PHASE: Waiting room ───────────────────────────────────────────────────
  if (phase === "waiting") {
    return (
      <div style={{ minHeight: "100dvh", background: "#090e1a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ maxWidth: 400, width: "100%" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 36 }}>🚪</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Waiting to be admitted</h1>
          <p style={{ color: "#64748b", marginBottom: 24 }}>The host will let you in soon…</p>
          <div style={{ width: 32, height: 32, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 24px" }} />
          <button onClick={() => { socketRef.current?.disconnect(); setPhase("lobby"); }} className="btn btn-secondary w-full">
            Cancel & go back
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── PHASE: Denied ─────────────────────────────────────────────────────────
  if (phase === "denied") {
    return (
      <div style={{ minHeight: "100dvh", background: "#090e1a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ maxWidth: 400, width: "100%" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 36 }}>🚫</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Entry Denied</h1>
          <p style={{ color: "#64748b", marginBottom: 32 }}>The host did not admit you to this meeting.</p>
          <button onClick={() => navigate("/home")} className="btn btn-primary">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  // ── PHASE: In call ────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100dvh", background: "#000", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: 48, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#09090b", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ background: "#3b82f6", padding: 5, borderRadius: 6, flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
          <code style={{ background: "rgba(255,255,255,0.08)", padding: "3px 8px", borderRadius: 6, fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meetingCode}</code>
          {isHost && <span style={{ fontSize: 10, background: "rgba(59,130,246,0.2)", color: "#60a5fa", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>HOST</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          {handsCount > 0 && <span style={{ color: "#fbbf24" }}>✋ {handsCount}</span>}
          <span>⏱ {timer}</span>
          <span>👥 {allParticipants.length}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        {/* Video area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {viewMode === "speaker" ? (
            <>
              {/* Featured / pinned video */}
              <div style={{ flex: 1, padding: "10px 10px 0", minHeight: 0 }}>
                <div style={{ width: "100%", height: "100%", background: "#18181b", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {featuredP.stream
                    ? <StreamVideo stream={featuredP.stream} muted={effectivePinned === "local"} className="w-full h-full object-cover" />
                    : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}><Avatar name={featuredP.name} size="lg" /><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>{featuredP.name}</span></div>
                  }
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    {!featuredP.micOn && <span style={{ fontSize: 12, color: "#f87171" }}>🔇</span>}
                    <span style={{ color: "#fff", fontSize: 14, fontWeight: 500, flex: 1 }}>{featuredP.name}</span>
                    {featuredP.handRaised && <span>✋</span>}
                  </div>
                </div>
              </div>

              {/* Filmstrip */}
              {filmstrip.length > 0 && (
                <div style={{ padding: "8px 10px 10px", display: "flex", gap: 8, overflowX: "auto", flexShrink: 0 }}>
                  {filmstrip.map(([id, p]) => (
                    <div key={id} style={{ width: 160, minWidth: 160, height: 100 }}>
                      <VideoTile id={id} p={p} isPinned={id === pinnedId} onPin={togglePin} muted={id === "local"} />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Grid view
            <div style={{ flex: 1, padding: 10, display: "grid", gap: 8, overflow: "auto", gridTemplateColumns: allParticipants.length <= 1 ? "1fr" : allParticipants.length <= 4 ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gridAutoRows: "1fr" }}>
              {allParticipants.map(([id, p]) => (
                <VideoTile key={id} id={id} p={p} isPinned={id === pinnedId} onPin={togglePin} muted={id === "local"} />
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        {activePanel && (
          <div style={{ width: 320, minWidth: 260, background: "#0f1628", borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            {/* Panel header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
                {activePanel === "chat" ? "Chat" : activePanel === "people" ? `Participants (${allParticipants.length})` : `Waiting Room (${waitingQueue.length})`}
              </span>
              <button onClick={closeAllPanels} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            {/* Panel body */}
            {activePanel === "chat" && (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {messages.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", marginTop: 40 }}>No messages yet. Say hello!</p>}
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.self ? "flex-end" : "flex-start" }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{msg.sender}</span>
                      <div style={{ background: msg.self ? "#3b82f6" : "rgba(255,255,255,0.08)", padding: "8px 12px", borderRadius: msg.self ? "12px 12px 2px 12px" : "12px 12px 12px 2px", maxWidth: "85%" }}>
                        <p style={{ color: "#fff", fontSize: 13, wordBreak: "break-word" }}>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={sendChat} style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message…"
                    style={{ flex: 1, fontSize: 13, padding: "8px 12px", height: 38 }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: "0 14px", height: 38, fontSize: 13 }} disabled={!chatMessage.trim()}>Send</button>
                </form>
              </>
            )}

            {activePanel === "people" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {allParticipants.map(([id, p]) => (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
                    <Avatar name={p.name} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                      {id === "local" && isHost && <span style={{ fontSize: 10, color: "#60a5fa" }}>Host</span>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {!p.micOn && <span style={{ fontSize: 12 }}>🔇</span>}
                      {p.handRaised && <span style={{ fontSize: 12 }}>✋</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activePanel === "waiting" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {waitingQueue.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", marginTop: 40 }}>No one waiting</p>}
                {waitingQueue.map((u) => (
                  <div key={u.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={u.name} size="sm" />
                      <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{u.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => admitUser(u.id)} className="btn btn-primary" style={{ flex: 1, fontSize: 12, padding: "7px 0", height: 34 }}>Admit</button>
                      <button onClick={() => denyUser(u.id)} className="btn btn-danger" style={{ flex: 1, fontSize: 12, padding: "7px 0", height: 34 }}>Deny</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div style={{ height: 80, background: "#09090b", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0, gap: 8 }}>
        {/* Left controls */}
        <div style={{ display: "flex", gap: 8 }}>
          <CtrlBtn icon={icons.mic(micOn)} label={micOn ? "Mute" : "Unmute"} active={micOn} onClick={() => setMicOn((v) => !v)} />
          <CtrlBtn icon={icons.cam(videoOn)} label={videoOn ? "Stop Video" : "Start Video"} active={videoOn} onClick={() => setVideoOn((v) => !v)} />
        </div>

        {/* Center controls */}
        <div style={{ display: "flex", gap: 8 }}>
          <CtrlBtn icon={icons.screen(isScreenSharing)} label={isScreenSharing ? "Stop Share" : "Share Screen"} active={!isScreenSharing} accent={isScreenSharing} onClick={handleScreenShare} />
          <CtrlBtn icon={icons.hand(handRaised)} label={handRaised ? "Lower Hand" : "Raise Hand"} active={!handRaised} accent={handRaised} onClick={toggleHand} />
          <CtrlBtn icon={viewMode === "speaker" ? icons.grid() : icons.speaker()} label={viewMode === "speaker" ? "Grid View" : "Speaker View"} onClick={() => setViewMode((v) => (v === "speaker" ? "grid" : "speaker"))} />
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", gap: 8 }}>
          <CtrlBtn icon={icons.chat()} label="Chat" badge={unread} onClick={() => { const next = !chatOpen; closeAllPanels(); if (next) setChatOpen(true); }} />
          <CtrlBtn icon={icons.people()} label="People" onClick={() => { const next = !peopleOpen; closeAllPanels(); if (next) setPeopleOpen(true); }} />
          {isHost && waitingQueue.length > 0 && (
            <CtrlBtn icon={<span style={{ fontSize: 14 }}>🚪</span>} label="Waiting" badge={waitingQueue.length} onClick={() => { const next = !waitingOpen; closeAllPanels(); if (next) setWaitingOpen(true); }} />
          )}
          <CtrlBtn icon={icons.leave()} label="Leave" danger onClick={handleLeave} />
        </div>
      </div>
    </div>
  );
}
