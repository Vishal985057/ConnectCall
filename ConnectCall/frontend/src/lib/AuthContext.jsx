import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const nav = useNavigate();
  const [token, setToken]   = useState(() => localStorage.getItem("cc_token") || "");
  const [username, setUser]  = useState(() => localStorage.getItem("cc_username") || "");
  const [name, setName]      = useState(() => localStorage.getItem("cc_name") || "");

  const login = (t, u, n) => {
    localStorage.setItem("cc_token", t);
    localStorage.setItem("cc_username", u);
    localStorage.setItem("cc_name", n || u);
    setToken(t); setUser(u); setName(n || u);
    nav("/home");
  };

  const logout = () => {
    localStorage.clear();
    setToken(""); setUser(""); setName("");
    nav("/");
  };

  return <Ctx.Provider value={{ token, username, name, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
};
