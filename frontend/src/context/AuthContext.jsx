import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const DEMO_PASSWORD = 'SmartScanDemo2026!';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile from server-side FastAPI endpoint (immune to client RLS issues)
  const loadProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }
    try {
      const data = await api.getMe();
      setProfile({
        id: data.id,
        role: data.role || 'customer',
        store_id: data.store_id,
        display_name: data.display_name || 'Customer',
        store: data.store || null,
      });
    } catch (err) {
      console.warn('Failed to load profile via backend getMe:', err);
      setProfile({
        id: currentUser.id,
        role: 'customer',
        store_id: null,
        display_name: currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Customer',
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    // Check active session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signInDemo = async () => {
    return signIn('demo@smartscan.app', DEMO_PASSWORD);
  };

  const signInStaffDemo = async () => {
    return signIn('staff@smartscan.app', DEMO_PASSWORD);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signInDemo,
        signInStaffDemo,
        signOut,
        refreshProfile: () => user && loadProfile(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
