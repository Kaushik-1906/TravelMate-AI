import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const AuthContext = createContext(null);

const DEMO_USER = {
  id: 'demo-user-0000-0000-0000-000000000001',
  email: 'traveler@travelmate.ai',
  user_metadata: { full_name: 'Demo Traveler' },
};

function storeSessionToken(token) {
  if (token) localStorage.setItem('travelmate_token', token);
  else localStorage.removeItem('travelmate_token');
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearLocalSession = () => {
    setUser(null);
    setSession(null);
    localStorage.removeItem('travelmate_token');
    localStorage.removeItem('travelmate_demo_user');
  };

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth
        .getSession()
        .then(({ data: { session: currentSession } }) => {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          storeSessionToken(currentSession?.access_token);
        })
        .catch(() => {
          clearLocalSession();
        })
        .finally(() => setLoading(false));

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        storeSessionToken(currentSession?.access_token);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }

    // Local demo mode: restore a simulated session if one was created.
    const savedDemoUser = localStorage.getItem('travelmate_demo_user');
    const token = localStorage.getItem('travelmate_token');
    if (savedDemoUser && token) {
      try {
        setUser(JSON.parse(savedDemoUser));
        setSession({ access_token: token });
      } catch {
        localStorage.removeItem('travelmate_demo_user');
        localStorage.removeItem('travelmate_token');
      }
    }
    setLoading(false);
  }, []);

  // The API layer dispatches this when the backend returns 401.
  useEffect(() => {
    const handleUnauthorized = () => {
      clearLocalSession();
      if (isSupabaseConfigured && supabase) {
        supabase.auth.signOut().catch(() => {});
      }
    };
    window.addEventListener('travelmate:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('travelmate:unauthorized', handleUnauthorized);
  }, []);

  const loginWithDemo = () => {
    if (isSupabaseConfigured) {
      throw new Error('Demo login is only available when Supabase is not configured.');
    }
    setUser(DEMO_USER);
    setSession({ access_token: 'demo-token' });
    localStorage.setItem('travelmate_token', 'demo-token');
    localStorage.setItem('travelmate_demo_user', JSON.stringify(DEMO_USER));
    return DEMO_USER;
  };

  const login = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      storeSessionToken(data.session?.access_token);
      return data;
    }

    // Local demo fallback: any valid-looking credentials create a demo session.
    const demoUser = {
      ...DEMO_USER,
      email,
      user_metadata: { full_name: email.split('@')[0] },
    };
    setUser(demoUser);
    setSession({ access_token: 'demo-token' });
    localStorage.setItem('travelmate_token', 'demo-token');
    localStorage.setItem('travelmate_demo_user', JSON.stringify(demoUser));
    return { user: demoUser, session: { access_token: 'demo-token' } };
  };

  const signup = async (email, password, fullName = '') => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      storeSessionToken(data.session?.access_token);
      return data;
    }

    const newUser = {
      ...DEMO_USER,
      email,
      user_metadata: { full_name: fullName || email.split('@')[0] },
    };
    setUser(newUser);
    setSession({ access_token: 'demo-token' });
    localStorage.setItem('travelmate_token', 'demo-token');
    localStorage.setItem('travelmate_demo_user', JSON.stringify(newUser));
    return { user: newUser, session: { access_token: 'demo-token' } };
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Clear the local session even if the network call fails.
      }
    }
    clearLocalSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        signup,
        logout,
        loginWithDemo,
        isConfigured: isSupabaseConfigured,
        isDemoMode: !isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
