// src/App.js
import React from "react";
import { Routes, Route, useNavigate, Outlet } from "react-router-dom";
import Landing from "./app/pages/Landing";
import Authed from "./app/pages/Authed";
import Chores from "./app/pages/authed/Chores";
import ProtectedRoute from "./app/authed/ProtectedRoute";
import { useAuth } from "./app/authed/AuthProvider";
import Navbar from "./app/components/Navbar";

import "./app/styles/App.css";

function AuthedShell({ onSignOut }) {
  return (
    <>
      <Navbar onSignOut={onSignOut} />
      <main className="container" style={{ paddingTop: 16 }}>
        <Outlet />
      </main>
    </>
  );
}

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
      <Route path="/" element={<Landing />} />

      {/* Protected area */}
      <Route element={<ProtectedRoute isAuthed={isAuthed} />}>
        <Route element={<AuthedShell onSignOut={handleSignOut} />}>
          <Route path="/app" element={<Authed />} />
          <Route path="/chores" element={<Chores />} />
        </Route>
      </Route>

      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
