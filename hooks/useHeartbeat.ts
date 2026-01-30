// src/hooks/useHeartbeat.ts
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

export const useHeartbeat = () => {
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const activityTimeoutRef = useRef<NodeJS.Timeout>();

  const sendHeartbeat = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.rpc('heartbeat', { user_id: user.id });
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }, []);

  // Function to send heartbeat with debouncing for user activity
  const sendActivityHeartbeat = useCallback(() => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    activityTimeoutRef.current = setTimeout(() => {
      sendHeartbeat();
    }, 1000); // Debounce to 1 second
  }, [sendHeartbeat]);

  useEffect(() => {
    // Send initial heartbeat
    sendHeartbeat();

    // Set up regular heartbeat interval (every 30 seconds)
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);

    // Track user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(event => {
      window.addEventListener(event, sendActivityHeartbeat, { passive: true });
    });

    // Track tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track page focus
    const handleFocus = () => {
      sendHeartbeat();
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup function
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      events.forEach(event => {
        window.removeEventListener(event, sendActivityHeartbeat);
      });
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sendHeartbeat, sendActivityHeartbeat]);

  return null; // This hook doesn't return anything
};