// src/app/components/Navbar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../authed/AuthProvider";
import "../styles/navbar.css";

export default function Navbar({ onSignOut }) {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <div className="container">
        {/* Left: brand (link to home or app) */}
        <div className="brand">
          <h1 className="brand-title">Habit Tracker</h1>
        </div>

        {/* Center: Chores + My Habits */}
        <nav className="nav-center">
          <NavLink
            to="/chores"
            className={({ isActive }) => `btn btn-text ${isActive ? "active" : ""}`}
          >
            Chores
          </NavLink>

          <NavLink
            to="/app"
            className={({ isActive }) => `btn btn-text ${isActive ? "active" : ""}`}
          >
            My Habits
          </NavLink>
        </nav>

        {/* Right: user info or marketing links */}
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
                    borderRadius: 6, // rounded square avatar
                    objectFit: "cover",
                  }}
                />
              )}
              <span className="user-name">{user.name || user.email}</span>
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
