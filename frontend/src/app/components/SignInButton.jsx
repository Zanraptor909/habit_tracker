import React from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import { useAuth } from "../auth/AuthProvider";

export default function GoogleSignInButton() {
  const { setUser } = useAuth();

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
