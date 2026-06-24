import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import Home from "./pages/Home.jsx";
import History from "./pages/History.jsx";
import Meet from "./pages/Meet.jsx";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/home"
          element={<PrivateRoute><Home /></PrivateRoute>}
        />
        <Route
          path="/history"
          element={<PrivateRoute><History /></PrivateRoute>}
        />
        <Route
          path="/meet/:meetingCode"
          element={<PrivateRoute><Meet /></PrivateRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
