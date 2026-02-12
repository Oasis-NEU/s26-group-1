import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext();

// --- useAuth: Custom hook to access AuthContext ---
export function useAuth() { // added shortcut instead of useAuth(AuthContext)
  return useContext(AuthContext);
}

// --- AuthProvider: Provides authentication context to children ---
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Supabase equivalent for auth state change
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // Just a loading thing while firebase verifies
  if (loading) return <div>Loading...</div>;

  // Make user and the logout available to all child components
  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}