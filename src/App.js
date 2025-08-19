// src/App.js
import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

// ✅ updated paths to match your folders
import Landing from "./app/pages/Landing";
import Authed from "./app/pages/Authed";
import ProtectedRoute from "./app/authed/ProtectedRoute";
import useAuth from "./app/authed/useAuth";

import "./app/styles/App.css";

function App() {
  const { isAuthed, signIn, signOut } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    await signIn();
    navigate("/app");
  };

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  return (
    <Routes>
      <Route path="/" element={<Landing onSignIn={handleGoogleSignIn} />} />
      <Route element={<ProtectedRoute isAuthed={isAuthed} />}>
        <Route path="/app" element={<Authed onSignOut={handleSignOut} />} />
      </Route>
      <Route path="*" element={<Landing onSignIn={handleGoogleSignIn} />} />
    </Routes>
  );
}

export default App;
