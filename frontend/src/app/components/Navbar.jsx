// src/app/components/Navbar.jsx
import React from "react";
import { useAuth } from "../authed/AuthProvider";
import "../styles/navbar.css";   // ✅ add this

export default function Navbar({ onSignOut }) {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <div className="container">
        {/* Left: brand */}
        <div className="brand">Habit Tracker</div>

        {/* Center: Today + My Habits */}
        <nav className="nav-center">
          <a className="btn btn-text" href="#today">Today</a>
          <a className="btn btn-text" href="#habits">My Habits</a>
        </nav>

        {/* Right: user info */}
        <div className="nav-right">
          {user ? (
            <>
              {user.image_url && (
                <img
                  src={user.image_url}
                  alt={user.name || user.email}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    objectFit: "cover",
                  }}
                />
              )}
              <span>{user.name || user.email}</span>
              <button className="btn btn-text" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <a className="btn btn-text" href="#features">Features</a>
              <a className="btn btn-text" href="#how">How it works</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
