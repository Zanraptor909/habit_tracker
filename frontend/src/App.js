// src/App.js
import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Landing from "./app/pages/Landing";
import Authed from "./app/pages/Authed";
import ProtectedRoute from "./app/authed/ProtectedRoute";
import { useAuth } from "./app/authed/AuthProvider";   // ✅ use real provider

import "./app/styles/App.css";

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAuthed = !!user;

  const handleSignOut = async () => {
    await logout();
    navigate("/");
  };

  return (
    <Routes>
      <Route path="/" element={<Landing />} />   {/* ✅ no onSignIn prop */}
      <Route element={<ProtectedRoute isAuthed={isAuthed} />}>
        <Route path="/app" element={<Authed onSignOut={handleSignOut} />} />
      </Route>
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
