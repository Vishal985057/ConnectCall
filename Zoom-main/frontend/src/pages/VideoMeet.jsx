import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Snackbar, Alert } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import server from '../environment';

const server_url = server;
var connections = {};

const peerConfigConnections = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
            urls: [
                "turn:openrelay.metered.ca:80",
                "turn:openrelay.metered.ca:443",
                "turns:openrelay.metered.ca:443"
            ],
            username: "openrelayproject",
            credential: "openrelayproject"
        }
    ]
};

/* ── Detect iOS (getDisplayMedia not supported on iOS) ── */
const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ── Google Meet–style grid columns ── */
function getGridCols(n) {
    if (n <= 1) return 1;
    if (n <= 2) return 2;
    if (n <= 4) return 2;
    if (n <= 6) return 3;
    if (n <= 9) return 3;
    return 4;
}

export default function VideoMeetComponent() {
    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();
    const screenStreamRef = useRef(null);
    const videoRef = useRef([]);

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [videos, setVideos] = useState([]);

    /* ── Toast notification state ── */
    const [toast, setToast] = useState({ open: false, msg: "", severity: "info" });
    const showToast = (msg, severity = "info") => setToast({ open: true, msg, severity });
    const closeToast = () => setToast(t => ({ ...t, open: false }));

    /* ─────────────────────────────────────────
       Permissions — run once on mount only ([])
    ───────────────────────────────────────── */
    useEffect(() => { getPermissions(); }, []);

    const getPermissions = async () => {
        try {
            try { await navigator.mediaDevices.getUserMedia({ video: true }); setVideoAvailable(true); }
            catch { setVideoAvailable(false); }

            try { await navigator.mediaDevices.getUserMedia({ audio: true }); setAudioAvailable(true); }
            catch { setAudioAvailable(false); }

            /*
             * Screen share availability check:
             *   - iOS (all versions of Safari/Chrome on iOS) → no getDisplayMedia at all
             *   - Android Chrome 74+ → supported
             *   - Desktop → supported
             */
            if (!isIOS() && typeof navigator.mediaDevices?.getDisplayMedia === 'function') {
                setScreenAvailable(true);
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.localStream = stream;
            if (localVideoref.current) localVideoref.current.srcObject = stream;
        } catch (e) {
            console.log("getPermissions:", e);
        }
    };

    /* ── Mic / Camera ── */
    const handleVideo = () => {
        const next = !video;
        setVideo(next);
        window.localStream?.getVideoTracks().forEach(t => { t.enabled = next; });
    };

    const handleAudio = () => {
        const next = !audio;
        setAudio(next);
        window.localStream?.getAudioTracks().forEach(t => { t.enabled = next; });
    };

    /* ─────────────────────────────────────────
       Screen share — with proper mobile handling
    ───────────────────────────────────────── */
    const handleScreen = async () => {
        if (screen) { stopScreenShare(); return; }

        /* Block iOS — getDisplayMedia doesn't exist there */
        if (isIOS()) {
            showToast("Screen sharing is not supported on iOS. Use a desktop or Android device.", "warning");
            return;
        }

        /* Double-check API exists at call time (some browsers remove it after feature-policy) */
        if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function') {
            showToast("Screen sharing is not supported in this browser. Try Chrome or Edge.", "warning");
            return;
        }

        try {
            /*
             * Mobile-friendly getDisplayMedia options:
             *   - `video: true` works universally (avoid overly specific constraints on mobile)
             *   - `audio: true` is optional; mobile browsers often ignore it
             *   - selfBrowserSurface: 'include' lets Android Chrome show its own tab as an option
             */
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
                // Chrome-specific hints that improve the picker on Android
                ...(typeof window.chrome !== 'undefined' && {
                    selfBrowserSurface: 'include',
                    surfaceSwitching: 'include',
                    monitorTypeSurfaces: 'include',
                })
            });

            screenStreamRef.current = displayStream;
            window.localStream = displayStream;
            if (localVideoref.current) localVideoref.current.srcObject = displayStream;

            /* Push screen track to all active peer connections */
            for (let id in connections) {
                if (id === socketIdRef.current) continue;
                const videoSender = connections[id].getSenders().find(s => s.track?.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(displayStream.getVideoTracks()[0]);
                } else {
                    displayStream.getTracks().forEach(t => connections[id].addTrack(t, displayStream));
                }
            }

            /* Auto-stop when the user clicks "Stop sharing" in the browser bar */
            displayStream.getVideoTracks()[0].onended = () => stopScreenShare();
            setScreen(true);
            showToast("Screen sharing started", "success");

        } catch (e) {
            console.log("getDisplayMedia error:", e);
            if (e.name === 'NotAllowedError') {
                showToast("Screen share permission denied. Allow it in your browser settings.", "error");
            } else if (e.name === 'NotSupportedError') {
                showToast("Screen sharing is not supported in this browser.", "warning");
            } else if (e.name === 'AbortError' || e.name === 'NotReadableError') {
                showToast("Screen share was cancelled or another app is using the screen.", "info");
            } else {
                showToast("Could not start screen sharing: " + e.message, "error");
            }
        }
    };

    const stopScreenShare = async () => {
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        setScreen(false);

        /* Restore camera */
        try {
            const camStream = await navigator.mediaDevices.getUserMedia({
                video: videoAvailable,
                audio: audioAvailable
            });
            window.localStream = camStream;
            if (localVideoref.current) localVideoref.current.srcObject = camStream;
            camStream.getVideoTracks().forEach(t => { t.enabled = video; });
            camStream.getAudioTracks().forEach(t => { t.enabled = audio; });

            for (let id in connections) {
                if (id === socketIdRef.current) continue;
                const sender = connections[id].getSenders().find(s => s.track?.kind === 'video');
                if (sender && camStream.getVideoTracks()[0]) sender.replaceTrack(camStream.getVideoTracks()[0]);
            }
        } catch (e) { console.log("Restore camera:", e); }
    };

    /* ── WebRTC signalling ── */
    const gotMessageFromServer = (fromId, message) => {
        const signal = JSON.parse(message);
        if (fromId === socketIdRef.current) return;

        if (signal.sdp) {
            connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer()
                            .then(desc => connections[fromId].setLocalDescription(desc))
                            .then(() => socketRef.current.emit('signal', fromId,
                                JSON.stringify({ sdp: connections[fromId].localDescription })))
                            .catch(e => console.log(e));
                    }
                }).catch(e => console.log(e));
        }
        if (signal.ice) {
            connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
        }
    };

    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: true });
        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href);
            socketIdRef.current = socketRef.current.id;
            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                setVideos(prev => prev.filter(v => v.socketId !== id));
                videoRef.current = videoRef.current.filter(v => v.socketId !== id);
            });

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach(socketListId => {
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = (event) => {
                        if (event.candidate)
                            socketRef.current.emit('signal', socketListId,
                                JSON.stringify({ ice: event.candidate }));
                    };

                    /* ontrack — modern API, replaces deprecated onaddstream */
                    connections[socketListId].ontrack = (event) => {
                        const remoteStream = event.streams[0];
                        if (!remoteStream) return;
                        const exists = videoRef.current.findIndex(v => v.socketId === socketListId) >= 0;
                        if (exists) {
                            setVideos(prev => {
                                const updated = prev.map(v =>
                                    v.socketId === socketListId ? { ...v, stream: remoteStream } : v);
                                videoRef.current = updated;
                                return updated;
                            });
                        } else {
                            setVideos(prev => {
                                const updated = [...prev, { socketId: socketListId, stream: remoteStream }];
                                videoRef.current = updated;
                                return updated;
                            });
                        }
                    };

                    /* addTrack — replaces deprecated addStream */
                    if (window.localStream) {
                        window.localStream.getTracks().forEach(t =>
                            connections[socketListId].addTrack(t, window.localStream));
                    } else {
                        const fallback = makeSilentBlackStream();
                        window.localStream = fallback;
                        fallback.getTracks().forEach(t => connections[socketListId].addTrack(t, fallback));
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;
                        connections[id2].createOffer()
                            .then(desc => connections[id2].setLocalDescription(desc))
                            .then(() => socketRef.current.emit('signal', id2,
                                JSON.stringify({ sdp: connections[id2].localDescription })))
                            .catch(e => console.log(e));
                    }
                }
            });
        });
    };

    const makeSilentBlackStream = () => {
        const canvas = Object.assign(document.createElement("canvas"), { width: 640, height: 480 });
        canvas.getContext('2d').fillRect(0, 0, 640, 480);
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const dst = osc.connect(ctx.createMediaStreamDestination());
        osc.start();
        const vt = Object.assign(canvas.captureStream().getVideoTracks()[0], { enabled: false });
        const at = Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
        return new MediaStream([vt, at]);
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) setNewMessages(prev => prev + 1);
    };

    const sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    const handleEndCall = () => {
        try { localVideoref.current?.srcObject?.getTracks().forEach(t => t.stop()); } catch {}
        socketRef.current?.disconnect();
        window.location.href = "/";
    };

    const connect = async () => {
        setAskForUsername(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: videoAvailable, audio: audioAvailable
            });
            window.localStream = stream;
            if (localVideoref.current) localVideoref.current.srcObject = stream;
        } catch (e) { console.log("Connect stream:", e); }
        connectToSocketServer();
    };

    /* ── Grid dimensions ── */
    const totalTiles = videos.length + 1;
    const cols = getGridCols(totalTiles);
    const rows = Math.ceil(totalTiles / cols);

    /* ─────────────────────────────────────────
       RENDER
    ───────────────────────────────────────── */
    return (
        <div>
            {/* ══════════ LOBBY ══════════ */}
            {askForUsername ? (
                <div className={styles.lobbyContainer}>
                    <h2 className={styles.lobbyTitle}>Enter your name to join</h2>

                    <div className={styles.lobbyForm}>
                        <TextField
                            label="Your name"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && username.trim()) connect(); }}
                            variant="outlined"
                            size="small"
                            InputProps={{ style: { color: '#fff', background: '#3c4043', borderRadius: 8 } }}
                            InputLabelProps={{ style: { color: '#9aa0a6' } }}
                        />
                        <Button
                            variant="contained"
                            onClick={connect}
                            disabled={!username.trim()}
                            style={{ background: '#1a73e8', borderRadius: 8, textTransform: 'none', fontWeight: 600, padding: '8px 24px' }}
                        >
                            Join now
                        </Button>
                    </div>

                    <div className={styles.lobbyPreview}>
                        <video ref={localVideoref} autoPlay muted playsInline />
                    </div>

                    {/* iOS screen share notice in lobby */}
                    {isIOS() && (
                        <div className={styles.iosNotice}>
                            <InfoOutlinedIcon style={{ fontSize: 16, marginRight: 6 }} />
                            Screen sharing is not available on iOS. Video and audio calls work normally.
                        </div>
                    )}
                </div>

            ) : (
                /* ══════════ MEET ROOM ══════════ */
                <div className={styles.meetVideoContainer}>

                    {/* ── Video grid ── */}
                    <div
                        className={styles.conferenceView}
                        style={{
                            gridTemplateColumns: `repeat(${cols}, 1fr)`,
                            gridTemplateRows:    `repeat(${rows}, 1fr)`,
                        }}
                    >
                        {/* LOCAL TILE */}
                        <div className={styles.videoTile}>
                            <video
                                ref={localVideoref}
                                autoPlay muted playsInline
                                style={{
                                    width: '100%', height: '100%',
                                    objectFit: 'cover', borderRadius: 8,
                                    transform: screen ? 'none' : 'scaleX(-1)'
                                }}
                            />
                            {!video && !screen && (
                                <div className={styles.avatarOverlay}>
                                    <div className={styles.avatarPlaceholder}>
                                        {username ? username[0].toUpperCase() : 'Y'}
                                    </div>
                                </div>
                            )}
                            <span className={styles.tileLabel}>
                                You{screen ? ' (presenting)' : ''}
                            </span>
                            {!audio && <div className={styles.tileMicOff}><MicOffIcon /></div>}
                        </div>

                        {/* REMOTE TILES */}
                        {videos.map((v, i) => (
                            <div key={v.socketId} className={`${styles.videoTile} ${styles.remote}`}>
                                <video
                                    ref={ref => { if (ref && v.stream) ref.srcObject = v.stream; }}
                                    autoPlay playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                                />
                                <span className={styles.tileLabel}>Guest {i + 1}</span>
                            </div>
                        ))}
                    </div>

                    {/* ══════════ TOOLBAR ══════════ */}
                    <div className={styles.toolbar}>

                        {/* Mic */}
                        <button className={styles.ctrlBtn} onClick={handleAudio} aria-label={audio ? 'Mute' : 'Unmute'}>
                            <div className={`${styles.ctrlBtnCircle} ${!audio ? styles.off : ''}`}>
                                {audio ? <MicIcon /> : <MicOffIcon />}
                            </div>
                            <span className={styles.ctrlLabel}>{audio ? 'Mute' : 'Unmute'}</span>
                        </button>

                        {/* Camera */}
                        <button className={styles.ctrlBtn} onClick={handleVideo} aria-label={video ? 'Stop video' : 'Start video'}>
                            <div className={`${styles.ctrlBtnCircle} ${!video ? styles.off : ''}`}>
                                {video ? <VideocamIcon /> : <VideocamOffIcon />}
                            </div>
                            <span className={styles.ctrlLabel}>{video ? 'Camera' : 'Camera off'}</span>
                        </button>

                        {/* Screen share — always show; tapping on iOS shows a toast explaining why it's unsupported */}
                        <button
                            className={styles.ctrlBtn}
                            onClick={handleScreen}
                            aria-label={screen ? 'Stop sharing' : 'Share screen'}
                        >
                            <div className={`${styles.ctrlBtnCircle} ${screen ? styles.off : ''} ${isIOS() ? styles.disabled : ''}`}>
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </div>
                            <span className={styles.ctrlLabel}>{screen ? 'Stop share' : 'Present'}</span>
                        </button>

                        {/* End call */}
                        <button className={styles.endCallBtn} onClick={handleEndCall} aria-label="Leave call">
                            <div className={styles.endCallPill}><CallEndIcon /></div>
                            <span className={styles.ctrlLabel}>Leave</span>
                        </button>

                        {/* Chat */}
                        <button className={styles.ctrlBtn} onClick={() => { setShowChat(c => !c); setNewMessages(0); }} aria-label="Chat">
                            <Badge badgeContent={newMessages} color="error">
                                <div className={`${styles.ctrlBtnCircle} ${showChat ? styles.chatActive : ''}`}>
                                    <ChatIcon />
                                </div>
                            </Badge>
                            <span className={styles.ctrlLabel}>Chat</span>
                        </button>
                    </div>

                    {/* ══════════ CHAT PANEL ══════════ */}
                    {showChat && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatHeader}>
                                <span>In-call messages</span>
                                <IconButton size="small" onClick={() => setShowChat(false)} style={{ color: '#9aa0a6' }}>
                                    <CloseIcon />
                                </IconButton>
                            </div>
                            <div className={styles.chattingDisplay}>
                                {messages.length === 0
                                    ? <p className={styles.chatNoMsg}>No messages yet</p>
                                    : messages.map((item, i) => (
                                        <div key={i} className={styles.chatMsg}>
                                            <span className={styles.chatMsgSender}>{item.sender}</span>
                                            <span className={styles.chatMsgText}>{item.data}</span>
                                        </div>
                                    ))}
                            </div>
                            <div className={styles.chattingArea}>
                                <TextField
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                                    placeholder="Send a message…"
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    InputProps={{ style: { color: '#fff' } }}
                                    sx={{
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#5f6368' },
                                        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9aa0a6' },
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={sendMessage}
                                    style={{ background: '#1a73e8', textTransform: 'none', flexShrink: 0 }}
                                >
                                    Send
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ══════════ TOAST NOTIFICATIONS ══════════ */}
                    <Snackbar
                        open={toast.open}
                        autoHideDuration={5000}
                        onClose={closeToast}
                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    >
                        <Alert
                            onClose={closeToast}
                            severity={toast.severity}
                            variant="filled"
                            sx={{ width: '100%', maxWidth: 420 }}
                        >
                            {toast.msg}
                        </Alert>
                    </Snackbar>
                </div>
            )}
        </div>
    );
}
