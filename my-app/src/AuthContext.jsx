import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

const AuthContext = createContext();

export function useAuth() { // added shortcut instead of useAuth(AuthContext)
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged will always checks for sign in / out
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    // When it changes, this cleans the issue
    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  // Just a loading thing while firebase verifies
  if (loading) return <div>Loading...</div>;

  // Make user and the logout available to all child components
  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}