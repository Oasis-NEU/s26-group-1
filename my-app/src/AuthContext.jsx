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
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION so no separate
    // getSession() call is needed. We only update user state when the user ID
    // actually changes to prevent cascading profile re-fetches on token refresh.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setUser(prev => {
        if (prev?.id === nextUser?.id) return prev; // no-op if same user
        return nextUser;
      });
      setLoading(false);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Fetch profile info when user ID changes; skip if already loaded for this user
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        return;
      }

      // Profile missing — try to create it from user metadata (set during sign-up)
      const meta = user.user_metadata;
      if (meta?.first_name && meta?.last_name) {
        const { data: created, error: upsertErr } = await supabase
          .from('profiles')
          .upsert(
            { id: user.id, first_name: meta.first_name, last_name: meta.last_name },
            { onConflict: 'id' }
          )
          .select('first_name, last_name')
          .single();
        if (!upsertErr && created) {
          setProfile(created);
          return;
        }
        console.error('Profile auto-create error:', upsertErr);
      }

      setProfile(null);
    };
    fetchProfile();
  }, [user?.id]); // depend only on user ID, not the whole user object

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // Forgot password function
  const forgotPassword = async (email) => {
    return supabase.auth.resetPasswordForEmail(email);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, profile, logout, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  );
}