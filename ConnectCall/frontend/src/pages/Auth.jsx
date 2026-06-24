import React, { useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { api } from "../lib/api.js";

export default function Auth() {
  const { login } = useAuth();
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", username: "", password: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(loginForm);
      login(data.token, loginForm.username, data.name || loginForm.username);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (regForm.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await api.register(regForm);
      const data = await api.login({ username: regForm.username, password: regForm.password });
      login(data.token, regForm.username, regForm.name);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#090e1a] px-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-8">
        <div className="bg-blue-600 p-2.5 rounded-xl shadow-[0_0_30px_-8px_rgba(59,130,246,0.6)]">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
        <span className="font-bold text-2xl text-white">ConnectCall</span>
      </div>

      <div className="w-full max-w-md card shadow-2xl">
        <div className="tabs mb-6">
          <button className={`tab ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setError(""); }}>Sign In</button>
          <button className={`tab ${tab === "register" ? "active" : ""}`} onClick={() => { setTab("register"); setError(""); }}>Create Account</button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Username</label>
              <input className="input" placeholder="Enter your username" autoComplete="username" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Password</label>
              <input className="input" type="password" placeholder="Enter your password" autoComplete="current-password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Display Name</label>
              <input className="input" placeholder="Your full name" autoComplete="name" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Username</label>
              <input className="input" placeholder="Choose a username" autoComplete="username" value={regForm.username} onChange={(e) => setRegForm({ ...regForm, username: e.target.value })} minLength={3} required />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Password</label>
              <input className="input" type="password" placeholder="At least 6 characters" autoComplete="new-password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} minLength={6} required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
