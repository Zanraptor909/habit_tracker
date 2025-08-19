import React from "react";

export default function SignInButton({ onSignIn, size = "lg", full = false }) {
  return (
    <button
      className={`btn btn-google ${size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : ""}`}
      style={full ? { width: "100%" } : undefined}
      onClick={onSignIn}
      aria-label="Sign in with Google"
    >
      <img
        className="gicon"
        alt=""
        src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png"
      />
      Sign in with Google
    </button>
  );
}
