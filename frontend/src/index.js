// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./app/authed/AuthProvider";

const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
console.log("GSI Client ID =>", clientId);
if (!clientId) console.error("Missing REACT_APP_GOOGLE_CLIENT_ID");


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={clientId || ""}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
