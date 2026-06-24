import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { api } from "../lib/api.js";

function generateCode() {
  const seg = () => Math.random().toString(36).substring(2, 6);
  return `${seg()}-${seg()}-${seg()}`;
}

function VideoIcon() {
  return (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
    </svg>
  );
}

export default function Home() {
  const { username, name, token, logout } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (token) api.getHistory(token).then(setHistory).catch(() => {});
  }, [token]);

  const handleNewMeeting = () => {
    setNewCode(generateCode());
    setShowModal(true);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) navigate(`/meet/${joinCode.trim()}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/meet/${newCode}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090e1a] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#1e2a42] bg-[#0f1628]/50 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg"><VideoIcon /></div>
          <span className="font-bold text-xl text-white">ConnectCall</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-sm hidden sm:block">{name || username}</span>
          <Link to="/history" className="btn btn-ghost text-sm">History</Link>
          <button onClick={logout} className="btn btn-ghost text-sm">Logout</button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4">
            Connect anywhere,<br className="hidden sm:block" /> anytime.
          </h1>
          <p className="text-white/50 text-base sm:text-lg mb-10 max-w-md">
            Start a new meeting or join an existing one with a code.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button onClick={handleNewMeeting} className="btn btn-primary btn-lg">
              + New Meeting
            </button>
            <form onSubmit={handleJoin} className="flex gap-2 flex-1">
              <input
                className="input flex-1"
                placeholder="Enter a meeting code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary shrink-0" disabled={!joinCode.trim()}>Join</button>
            </form>
          </div>
        </div>

        {/* Right column — recent meetings */}
        <div className="lg:col-span-5">
          <div className="card h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Calls</h2>
              {history.length > 0 && (
                <Link to="/history" className="text-blue-400 text-sm hover:text-blue-300">View all</Link>
              )}
            </div>

            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
                <p className="text-white/30 text-sm">No recent meetings yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.slice(0, 4).map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-[#1e2a42] hover:border-blue-500/40 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate font-mono text-sm">{m.meetingCode}</p>
                      <p className="text-xs text-white/40 mt-0.5">{new Date(m.date).toLocaleDateString()}</p>
                    </div>
                    <Link to={`/meet/${m.meetingCode}`} className="btn btn-secondary text-xs ml-3 shrink-0">Rejoin</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="card w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Your meeting is ready</h2>
            <p className="text-white/50 text-sm mb-6">Share this link to invite others.</p>

            <div className="mb-4">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Invite Link</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-[#1e2a42]">
                <span className="flex-1 text-sm text-white/80 font-mono truncate text-xs">
                  {window.location.origin}/meet/{newCode}
                </span>
                <button onClick={copyLink} className="btn btn-secondary text-xs shrink-0 py-1.5 px-3">
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Meeting Code</p>
              <div className="p-3 rounded-xl bg-white/5 border border-[#1e2a42]">
                <span className="font-mono font-bold text-white tracking-widest">{newCode}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={() => navigate(`/meet/${newCode}`)} className="btn btn-primary flex-1">
                Start Meeting →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
