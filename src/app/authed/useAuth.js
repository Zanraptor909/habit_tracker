import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "habit_auth_token";

export default function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));

  const isAuthed = !!token;

  const signIn = useCallback(async () => {
    // TODO: replace with real Google OAuth flow
    // e.g., const { user } = await signInWithPopup(auth, provider)
    // const idToken = await user.getIdToken()
    const fake = "dev_token_" + Date.now();
    localStorage.setItem(STORAGE_KEY, fake);
    setToken(fake);
    return fake;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  }, []);

  // handy object for consumers
  return useMemo(() => ({ isAuthed, token, signIn, signOut }), [isAuthed, token, signIn, signOut]);
}
