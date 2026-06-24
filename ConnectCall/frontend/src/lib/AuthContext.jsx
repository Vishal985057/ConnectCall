import React, { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [username, setUsername] = useState(() => localStorage.getItem("username") || "");
  const [name, setName] = useState(() => localStorage.getItem("name") || "");
  const navigate = useNavigate();

  const login = (newToken, newUsername, displayName) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", newUsername);
    localStorage.setItem("name", displayName || newUsername);
    setToken(newToken);
    setUsername(newUsername);
    setName(displayName || newUsername);
    navigate("/home");
  };

  const logout = () => {
    localStorage.clear();
    setToken("");
    setUsername("");
    setName("");
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ token, username, name, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
