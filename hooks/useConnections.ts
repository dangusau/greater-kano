import { useState, useEffect, useCallback } from 'react';
import { connectionsService } from '../services/supabase/connections';
import { ConnectionRequest, Friend, SentRequest } from '../services/supabase/connections';

export const useConnections = () => {
  const [receivedRequests, setReceivedRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadAllConnections();
  }, [loadAllConnections]);

  return {
    receivedRequests,
    sentRequests,
    friends,
    loading,
    loadReceivedRequests,
    loadSentRequests,
    loadFriends,
    loadAllConnections,
    acceptRequest,
    rejectRequest,
    withdrawRequest,
    getConnectionStatus: connectionsService.getConnectionStatus,
    checkConnection: connectionsService.checkConnection,
    sendConnectionRequest: connectionsService.sendConnectionRequest
  };
};