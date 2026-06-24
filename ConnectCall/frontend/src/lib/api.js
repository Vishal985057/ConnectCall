// VITE_API_URL should be set to your Render backend URL in production
// e.g. https://connectcall-backend.onrender.com
// In development it is empty — Vite proxy forwards /api to localhost:8000
const BACKEND = import.meta.env.VITE_API_URL || "";
const BASE = `${BACKEND}/api/v1/users`;

async function req(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

export const api = {
  register: (body) => req("POST", "/register", body),
  login: (body) => req("POST", "/login", body),
  getHistory: (token) => req("GET", `/get_all_activity?token=${encodeURIComponent(token)}`),
  addToHistory: (body) => req("POST", "/add_to_activity", body),
};
