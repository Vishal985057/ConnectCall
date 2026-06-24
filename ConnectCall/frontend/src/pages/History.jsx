import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { api } from "../lib/api.js";

export default function History() {
  const { token } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    if (token) {
      api.getHistory(token)
        .then(setHistory)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [token]);

  const copyLink = (code, idx) => {
    navigator.clipboard.writeText(`${window.location.origin}/meet/${code}`).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090e1a]">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-[#1e2a42] bg-[#0f1628]/50 backdrop-blur sticky top-0 z-10">
        <Link to="/home" className="btn btn-ghost btn-icon text-white/50 text-lg">←</Link>
        <h1 className="text-xl font-bold text-white">Meeting History</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No history yet</h3>
            <p className="text-white/50 mb-8">Your past meetings will appear here.</p>
            <Link to="/home" className="btn btn-primary">Go to Dashboard</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {history.map((m, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[#0f1628] border border-[#1e2a42] hover:border-blue-500/40 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="bg-blue-600/10 border border-blue-500/20 p-3 rounded-xl shrink-0">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white font-mono truncate">{m.meetingCode}</p>
                    <p className="text-sm text-white/40 mt-0.5">
                      {new Date(m.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => copyLink(m.meetingCode, i)} className="btn btn-ghost text-sm text-white/50">
                    {copiedIdx === i ? "✓ Copied" : "Copy Link"}
                  </button>
                  <Link to={`/meet/${m.meetingCode}`} className="btn btn-secondary px-4">Rejoin</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
