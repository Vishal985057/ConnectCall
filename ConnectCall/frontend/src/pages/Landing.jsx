import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="animated-bg min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg shadow-[0_0_20px_-5px_rgba(59,130,246,0.6)]">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <span className="font-bold text-xl text-white">ConnectCall</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-white/70 hover:text-white font-medium transition-colors text-sm">Login</Link>
          <Link to="/auth" className="btn btn-primary">Get Started</Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Real-time HD video calling
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white max-w-4xl leading-tight mb-6">
          Premium video meetings<br className="hidden md:block" /> for the modern team.
        </h1>

        <p className="text-lg text-white/60 max-w-xl mb-10">
          Fast, secure, and beautiful. Start or join a meeting in seconds — no downloads required.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/auth" className="btn btn-primary btn-lg">Start a Meeting</Link>
          <Link to="/auth" className="btn btn-secondary btn-lg">Join with Code</Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl w-full text-left">
          {[
            { icon: "🔒", title: "Secure & Private", desc: "End-to-end encrypted meetings with host-controlled waiting rooms." },
            { icon: "⚡", title: "Ultra Low Latency", desc: "Optimized peer-to-peer connections via WebRTC for crystal-clear calls." },
            { icon: "🌍", title: "Works Everywhere", desc: "No app download needed — join from any modern browser, any device." },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-white/20 text-sm border-t border-white/5">
        © {new Date().getFullYear()} ConnectCall. All rights reserved.
      </footer>
    </div>
  );
}
