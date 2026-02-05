// hooks/useConnections.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  connectionsService,
  ConnectionRequest,
  Friend,
  SentRequest,
  ConnectionStatus
} from '../services/supabase/connections';
import { Member } from '../types/index';

export const useConnections = () => {
  const [receivedRequests, setReceivedRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);

  // ========== CONNECTION FUNCTIONS ==========
  const loadReceivedRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await connectionsService.getReceivedRequests();
      setReceivedRequests(data);
    } catch {
      // Silently fail, error handling is in service
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSentRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await connectionsService.getSentRequests();
      setSentRequests(data);
    } catch {
      // Silently fail, error handling is in service
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      setLoading(true);
      const data = await connectionsService.getFriends();
      setFriends(data);
    } catch {
      // Silently fail, error handling is in service
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptRequest = useCallback(async (requestId: string) => {
    const requestToAccept = receivedRequests.find(req => req.id === requestId);
    if (requestToAccept) {
      setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
      setFriends(prev => [...prev, {
        user_id: requestToAccept.sender_id,
        user_name: requestToAccept.sender_name,
        user_avatar: requestToAccept.sender_avatar,
        user_email: requestToAccept.sender_email,
        connected_at: new Date().toISOString(),
        user_status: 'member'
      }]);
    }
    
    try {
      await connectionsService.acceptRequest(requestId);
      await Promise.all([
        loadReceivedRequests(),
        loadFriends()
      ]);
    } catch {
      await Promise.all([
        loadReceivedRequests(),
        loadFriends()
      ]);
      throw new Error('Failed to accept request');
    }
  }, [receivedRequests, loadReceivedRequests, loadFriends]);

  const rejectRequest = useCallback(async (requestId: string) => {
    setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
    
    try {
      await connectionsService.rejectRequest(requestId);
      await loadReceivedRequests();
    } catch {
      await loadReceivedRequests();
      throw new Error('Failed to reject request');
    }
  }, [loadReceivedRequests]);

  const withdrawRequest = useCallback(async (requestId: string) => {
    setSentRequests(prev => prev.filter(req => req.id !== requestId));
    
    try {
      await connectionsService.withdrawRequest(requestId);
      await loadSentRequests();
    } catch {
      await loadSentRequests();
      throw new Error('Failed to withdraw request');
    }
  }, [loadSentRequests]);

  const loadAllConnections = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadReceivedRequests(),
        loadSentRequests(),
        loadFriends()
      ]);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [loadReceivedRequests, loadSentRequests, loadFriends]);

  // ========== MEMBER FUNCTIONS ==========
  const getMembers = useCallback(async (
    search?: string, 
    businessType?: string, 
    marketArea?: string, 
    page = 0, 
    limit = 20
  ): Promise<Member[]> => {
    try {
      return await connectionsService.getMembers(
        search, 
        businessType, 
        marketArea, 
        page, 
        limit
      );
    } catch {
      throw new Error('Failed to load members');
    }
  }, []);

  const getMemberById = useCallback(async (userId: string): Promise<Member | null> => {
    try {
      return await connectionsService.getMemberById(userId);
    } catch {
      return null;
    }
  }, []);

  const searchMembers = useCallback(async (query: string): Promise<Member[]> => {
    try {
      return await connectionsService.searchMembers(query);
    } catch {
      return [];
    }
  }, []);

  // ========== SHARED FUNCTIONS ==========
  const sendConnectionRequest = useCallback(async (userId: string): Promise<{ id: string }> => {
    try {
      return await connectionsService.sendConnectionRequest(userId);
    } catch {
      throw new Error('Failed to send connection request');
    }
  }, []);

  const getConnectionStatus = useCallback(async (otherUserId: string): Promise<string> => {
    try {
      return await connectionsService.getConnectionStatus(otherUserId);
    } catch {
      return 'not_connected';
    }
  }, []);

  const checkConnection = useCallback(async (userId: string): Promise<ConnectionStatus> => {
    try {
      return await connectionsService.checkConnection(userId);
    } catch {
      return { exists: false };
    }
  }, []);

  useEffect(() => {
    loadAllConnections();
  }, [loadAllConnections]);

  return {
    // State
    receivedRequests,
    sentRequests,
    friends,
    loading,
    
    // Connection functions
    loadReceivedRequests,
    loadSentRequests,
    loadFriends,
    loadAllConnections,
    acceptRequest,
    rejectRequest,
    withdrawRequest,
    
    // Member functions
    getMembers,
    getMemberById,
    searchMembers,
    
    // Shared functions
    sendConnectionRequest,
    getConnectionStatus,
    checkConnection
  };
};