import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabase/client';
import { marketplaceService } from '../services/supabase/marketplace';
import { MarketplaceMessage } from '../types/marketplace';

export const useMessaging = () => {
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (
    listingId: string,
    receiverId: string,
    message: string
  ): Promise<string> => {
    try {
      const messageId = await marketplaceService.sendMessage(
        listingId,
        receiverId,
        message
      );
      return messageId;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, []);

  const getMessages = useCallback(async (
    listingId: string,
    otherUserId: string
  ): Promise<MarketplaceMessage[]> => {
    try {
      setLoading(true);
      const data = await marketplaceService.getMessages(listingId, otherUserId);
      setMessages(data);
      return data;
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('marketplace_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_messages'
        },
        (payload) => {
          const newMessage = payload.new as MarketplaceMessage;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    getMessages,
    setMessages
  };
};