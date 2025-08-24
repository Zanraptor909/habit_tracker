// src/app/components/SignInButton.jsx
import React from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import { useAuth } from "../authed/AuthProvider";   // ✅ corrected path
import { useNavigate } from "react-router-dom";

export default function GoogleSignInButton() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  return (
    <GoogleLogin
      useOneTap
      onSuccess={async (credentialResponse) => {
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ credential: credentialResponse.credential }),
          });
          if (!res.ok) throw new Error("Auth failed");
          const data = await res.json();
          setUser(data.user);
          navigate("/app");                        // ✅ go to app after login
        } catch (e) {
          console.error(e);
          googleLogout();
          alert("Google sign-in failed. Please try again.");
        }
      }}
      onError={() => {
        alert("Google sign-in was cancelled or failed.");
      }}
    />
  );
}
