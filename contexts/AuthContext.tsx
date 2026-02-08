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

  const isMounted = useRef(true);
  const activeProfileFetches = useRef<Map<string, Promise<UserProfile | null>>>(new Map());
  const isInitializing = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const lastTabHiddenTime = useRef<number | null>(null); // ⚠️ Track when tab was hidden

  /* -------------------- PROFILE FETCH WITH TIMEOUT -------------------- */

  const fetchUserProfile = async (userId: string, currentUser?: User | null): Promise<UserProfile | null> => {
    console.log('[Auth] Fetching profile for user:', userId.substring(0, 8));

    // Check cache first
    const cachedProfile = await appCache.get<UserProfile>(`profile_${userId}`);
    if (cachedProfile) {
      console.log('[Auth] Using cached profile');
      return cachedProfile;
    }

    // Check if this userId is already being fetched
    const existingFetch = activeProfileFetches.current.get(userId);
    if (existingFetch) {
      console.log('[Auth] Joining existing fetch');
      return existingFetch;
    }

    // Create new fetch promise with timeout
    const fetchPromise = (async (): Promise<UserProfile | null> => {
      try {
        console.log('[Auth] Querying database for profile...');
        
        // Add abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('[Auth] Profile fetch timeout - aborting');
          controller.abort();
        }, 5000); // 5 second timeout

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
            .abortSignal(controller.signal);

          clearTimeout(timeoutId);

          console.log('[Auth] Database query completed:', { 
            hasData: !!data, 
            error: error?.code,
            errorMessage: error?.message 
          });

          let profile: UserProfile | null = null;

          if (!error && data) {
            profile = data;
            console.log('[Auth] Profile found in database');
          } else if (error?.code === 'PGRST116') {
            console.log('[Auth] Profile not found, creating default');
            
            const defaultProfile: UserProfile = {
              id: userId,
              email: currentUser?.email || '',
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

            console.log('[Auth] Default profile creation:', {
              success: !insertError,
              error: insertError?.message
            });

            profile = insertError ? defaultProfile : inserted;
          } else if (error) {
            console.error('[Auth] Profile fetch error:', error.message);
          }

          // Cache if successful
          if (profile) {
            await appCache.set(`profile_${userId}`, profile, 10 * 60 * 1000);
            console.log('[Auth] Profile cached');
          } else {
            console.log('[Auth] No profile to cache');
          }

          return profile;
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            console.error('[Auth] Profile fetch aborted (timeout)');
          } else {
            console.error('[Auth] Unexpected error:', err);
          }
          return null;
        }
      } finally {
        // Clean up the fetch from active fetches
        activeProfileFetches.current.delete(userId);
        console.log('[Auth] Profile fetch completed');
      }
    })();

    // Store the promise for deduplication
    activeProfileFetches.current.set(userId, fetchPromise);
    return fetchPromise;
  };

  /* -------------------- PROCESS USER SESSION -------------------- */
  const processUserSession = async (session: Session | null, source: string) => {
    if (!isMounted.current) return;
    
    const newUserId = session?.user?.id || null;
    
    console.log(`[Auth] Processing session from ${source}:`, {
      hasSession: !!session,
      userId: newUserId?.substring(0, 8),
      sameUser: newUserId === currentUserId.current
    });
    
    // Skip if same user and we already have profile (unless it's a manual refresh)
    if (newUserId && newUserId === currentUserId.current && userProfile && !source.includes('refresh')) {
      console.log(`[Auth] ${source}: Same user with existing profile, skipping fetch`);
      // Still update session (for token refresh)
      setSession(session);
      setUser(session?.user ?? null);
      return;
    }
    
    // Update current user reference
    currentUserId.current = newUserId;
    
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user?.id) {
      console.log(`[Auth] ${source}: Fetching profile...`);
      const profile = await fetchUserProfile(session.user.id, session.user);
      
      console.log(`[Auth] ${source}: Profile fetch result:`, {
        success: !!profile,
        profileId: profile?.id?.substring(0, 8)
      });
      
      if (isMounted.current) {
        setUserProfile(profile);
      }
    } else {
      console.log(`[Auth] ${source}: No user, clearing profile`);
      setUserProfile(null);
    }
  };

  /* -------------------- TAB VISIBILITY AUTO-REFRESH -------------------- */
  const handleTabVisibilityChange = () => {
    if (!isMounted.current) return;
    
    if (document.hidden) {
      // Tab hidden - record the time
      lastTabHiddenTime.current = Date.now();
      console.log('[Auth] Tab hidden at:', new Date(lastTabHiddenTime.current).toLocaleTimeString());
    } else {
      // Tab visible again - check if we should refresh
      if (lastTabHiddenTime.current) {
        const hiddenDuration = Date.now() - lastTabHiddenTime.current;
        console.log('[Auth] Tab restored after:', hiddenDuration, 'ms');
        
        // Only refresh if tab was hidden for more than 30 seconds
        if (hiddenDuration > 30000) { // 30 seconds
          console.log('[Auth] Tab was hidden for', Math.round(hiddenDuration/1000), 'seconds - auto-refreshing');
          
          // Debounce to avoid multiple rapid refreshes
          setTimeout(async () => {
            if (!isMounted.current || !user?.id) return;
            
            try {
              console.log('[Auth] Auto-refresh after tab restore...');
              
              // Just refresh the session (Supabase handles token refresh)
              const { data: { session }, error } = await supabase.auth.getSession();
              
              if (error) {
                console.error('[Auth] Auto-refresh error:', error);
              } else {
                console.log('[Auth] Auto-refresh successful, user:', session?.user?.id?.substring(0, 8));
                // Update session state
                setSession(session);
                setUser(session?.user ?? null);
              }
            } catch (err) {
              console.error('[Auth] Auto-refresh failed:', err);
            }
          }, 100);
        } else {
          console.log('[Auth] Tab restore too quick, skipping auto-refresh');
        }
      } else {
        console.log('[Auth] Tab restored (first time)');
      }
      
      // Reset for next time
      lastTabHiddenTime.current = null;
    }
  };

  /* -------------------- AUTH STATE LISTENER -------------------- */

  useEffect(() => {
    console.log('[Auth] Setting up auth listener');
    isMounted.current = true;
    isInitializing.current = true;

    // ⚠️ Setup automatic tab visibility refresh
    document.addEventListener('visibilitychange', handleTabVisibilityChange);
    
    // Also listen for page focus (for browser/OS level focus)
    window.addEventListener('focus', () => {
      if (!document.hidden && lastTabHiddenTime.current) {
        // Trigger the same logic as visibility change
        handleTabVisibilityChange();
      }
    });

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('[Auth] Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] getSession error:', error.message);
          return;
        }

        console.log('[Auth] Initial session received:', {
          hasSession: !!session,
          userId: session?.user?.id?.substring(0, 8)
        });
        
        // Set initial user ID
        currentUserId.current = session?.user?.id || null;
        
        // Process the initial session
        await processUserSession(session, 'initial');
        
      } catch (err) {
        console.error('[Auth] Initialization failed:', err);
      } finally {
        if (isMounted.current) {
          isInitializing.current = false;
          setLoading(false);
          console.log('[Auth] Initialization complete, loading: false');
        }
      }
    };

    // Start initialization
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth event:', event, {
        userId: session?.user?.id?.substring(0, 8)
      });
      
      if (!isMounted.current) {
        console.log('[Auth] Component unmounted, ignoring event');
        return;
      }

      // Skip SIGNED_IN during initialization
      if (isInitializing.current && event === 'SIGNED_IN') {
        console.log('[Auth] Skipping SIGNED_IN event during initialization');
        return;
      }

      // Skip INITIAL_SESSION after initialization
      if (!isInitializing.current && event === 'INITIAL_SESSION') {
        console.log('[Auth] Skipping INITIAL_SESSION after initialization');
        return;
      }

      // Handle TOKEN_REFRESHED silently (common on tab restore)
      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed silently');
        setSession(session);
        setUser(session?.user ?? null);
        return;
      }

      // Set loading true for state changes that might change user
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setLoading(true);
      }

      // Process the new session
      await processUserSession(session, `event:${event}`);

      // Set loading to false after processing
      if (isMounted.current) {
        setLoading(false);
        console.log('[Auth] Event processed, loading: false');
      }
    });

    return () => {
      console.log('[Auth] Cleaning up auth listener');
      isMounted.current = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleTabVisibilityChange);
      window.removeEventListener('focus', handleTabVisibilityChange);
      activeProfileFetches.current.clear();
    };
  }, []);

  /* -------------------- ACTIONS -------------------- */

  const refreshProfile = async () => {
    if (!user?.id) {
      console.log('[Auth] refreshProfile: No user ID');
      return;
    }
    
    console.log('[Auth] Manual profile refresh requested');
    
    setLoading(true);
    
    try {
      // Clear cache
      await appCache.remove(`profile_${user.id}`);
      
      // Clear from active fetches to force fresh fetch
      activeProfileFetches.current.delete(user.id);
      
      // Fetch fresh profile
      const profile = await fetchUserProfile(user.id, user);
      
      console.log('[Auth] Manual refresh result:', {
        success: !!profile
      });
      
      if (isMounted.current) {
        setUserProfile(profile);
      }
    } catch (err) {
      console.error('[Auth] Manual refresh failed:', err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const signOut = async () => {
    console.log('[Auth] Signing out...');
    
    if (!isMounted.current) return;
    
    setLoading(true);
    
    try {
      // Clear cache for current user
      if (user?.id) {
        await appCache.remove(`profile_${user.id}`);
      }
      
      // Clear from active fetches
      activeProfileFetches.current.delete(user?.id || '');
      
      // Clear current user reference
      currentUserId.current = null;
      lastTabHiddenTime.current = null;
      
      // Sign out from Supabase
      console.log('[Auth] Calling supabase.auth.signOut()');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[Auth] Sign out error:', error.message);
      } else {
        console.log('[Auth] Supabase sign out successful');
      }
      
      // Clear local state
      if (isMounted.current) {
        setSession(null);
        setUser(null);
        setUserProfile(null);
        console.log('[Auth] Local state cleared');
      }
    } catch (err) {
      console.error('[Auth] Unexpected sign out error:', err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        console.log('[Auth] Sign out complete, loading: false');
      }
    }
  };

  /* -------------------- PROVIDER -------------------- */

  const contextValue: AuthContextType = {
    session,
    user,
    userProfile,
    loading,
    signOut,
    refreshProfile
  };

  console.log('[Auth] Rendering AuthProvider, loading:', loading);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};