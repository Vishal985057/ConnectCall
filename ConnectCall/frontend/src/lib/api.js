const B = (import.meta.env.VITE_API_URL || "") + "/api/v1/users";

async function call(method, path, body) {
  const r = await fetch(B + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || `HTTP ${r.status}`);
  return d;
}

export const api = {
  register: b => call("POST", "/register", b),
  login:    b => call("POST", "/login", b),
  history:  t => call("GET",  `/get_all_activity?token=${encodeURIComponent(t)}`),
  addHistory: b => call("POST", "/add_to_activity", b),
};
