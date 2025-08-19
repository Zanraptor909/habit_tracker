import React from "react";
import Logo from "./Logo";
import SignInButton from "./SignInButton";

export default function Navbar({ onSignIn }) {
  return (
    <header className="navbar">
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo />
        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a className="btn btn-text" href="#features">Features</a>
          <a className="btn btn-text" href="#how">How it works</a>
          <a className="btn btn-text" href="#faq">FAQ</a>
          <SignInButton onSignIn={onSignIn} size="sm" />
        </nav>
      </div>
    </header>
  );
}
