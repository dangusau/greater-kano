// src/context/auth.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { appCache } from '../shared/services/UniversalCache';

/* -------------------- TYPES -------------------- */

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_status: 'verified' | 'member';
  avatar_url: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

/* -------------------- PROVIDER -------------------- */

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isFetchingProfile = useRef(false);
  const fetchQueue: { userId: string; resolve: (p: UserProfile | null) => void }[] = [];

  /* -------------------- PROFILE FETCH WITH CACHE -------------------- */
  const fetchUserProfile = async (userId: string, currentUser?: User | null): Promise<UserProfile | null> => {
    const cachedProfile = await appCache.get<UserProfile>(`profile_${userId}`);
    if (cachedProfile) return cachedProfile;

    return new Promise(async resolve => {
      const existingQueue = fetchQueue.find(q => q.userId === userId);
      if (existingQueue) {
        fetchQueue.push({ userId, resolve });
        return;
      } else {
        fetchQueue.push({ userId, resolve });
      }

      if (isFetchingProfile.current) return;

      try {
        isFetchingProfile.current = true;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        let profile: UserProfile | null = null;

        if (!error) {
          profile = data;
        } else if (error.code === 'PGRST116') {
          const defaultProfile: UserProfile = {
            id: userId,
            email: currentUser?.email ?? '',
            first_name: '',
            last_name: '',
            user_status: 'verified',
            avatar_url: ''
          };

          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert(defaultProfile)
            .select()
            .single();

          profile = insertError ? defaultProfile : inserted;
        }

        if (profile) await appCache.set(`profile_${userId}`, profile, 10 * 60 * 1000);

        // resolve all queued requests
        fetchQueue.filter(q => q.userId === userId).forEach(q => q.resolve(profile));
        fetchQueue.splice(0, fetchQueue.length);

        return profile;
      } catch (err) {
        fetchQueue.splice(0, fetchQueue.length);
        console.error('Profile fetch failed:', err);
        return null;
      } finally {
        isFetchingProfile.current = false;
      }
    });
  };

  /* -------------------- INITIALIZE AUTH -------------------- */
  const initializeAuth = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const session = data?.session ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      setUserProfile(null);

      if (session?.user?.id) {
        const profile = await fetchUserProfile(session.user.id, session.user);
        setUserProfile(profile);
      }
    } catch (err) {
      console.error('Auth initialization failed:', err);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- TAB RESUME RECOVERY -------------------- */
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState === "visible") {
        const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const session = data?.session ?? null;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.id) {
          const profile = await fetchUserProfile(session.user.id, session.user);
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  /* -------------------- AUTH STATE LISTENER -------------------- */
  useEffect(() => {
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user?.id) {
        const profile = await fetchUserProfile(session.user.id, session.user);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* -------------------- ACTIONS -------------------- */
  const refreshProfile = async () => {
    if (!user?.id) return;
    await appCache.remove(`profile_${user.id}`);
    const profile = await fetchUserProfile(user.id, user);
    setUserProfile(profile);
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserProfile(null);
      await appCache.remove(`profile_${user?.id || ''}`);
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- PROVIDER -------------------- */
  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userProfile,
        loading,
        signOut,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
