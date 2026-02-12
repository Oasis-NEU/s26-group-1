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

  // Fetch profile info when user changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setProfile(null);
        return;
      }
      console.log('Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
      console.log('Profile fetch result:', { data, error });
      setProfile(error ? null : data);
    };
    fetchProfile();
  }, [user]);

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