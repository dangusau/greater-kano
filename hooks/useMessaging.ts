import { useState, useCallback, useEffect, useRef } from 'react';
import { messagingService } from '../services/supabase/messaging';
import { Conversation, Message, ConversationContext, UnreadCounts } from '../types/messaging';

export const useMessaging = () => {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ total: 0, marketplace: 0, connection: 0 });
  const [loading, setLoading] = useState({
    conversations: false,
    messages: false,
    sending: false
  });
  const [userStatus, setUserStatus] = useState<'verified' | 'member' | null>(null);
  const [canAccessConnectionChats, setCanAccessConnectionChats] = useState(false);

  // Refs for subscriptions
  const messageSubscriptionRef = useRef<(() => void) | null>(null);
  const conversationSubscriptionRef = useRef<(() => void) | null>(null);

  // ==================== INITIALIZATION ====================

  useEffect(() => {
    // Get user status on mount
    const loadUserStatus = async () => {
      try {
        const status = await messagingService.getUserStatus();
        setUserStatus(status);
        setCanAccessConnectionChats(status === 'verified');
      } catch (error) {
        console.error('Error loading user status:', error);
      }
    };

    loadUserStatus();
    loadUnreadCounts();

    // Cleanup on unmount
    return () => {
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current();
      }
      if (conversationSubscriptionRef.current) {
        conversationSubscriptionRef.current();
      }
    };
  }, []);

  // ==================== CONVERSATIONS (REPLACES getMessages) ====================

  const loadConversations = useCallback(async (context?: ConversationContext) => {
    setLoading(prev => ({ ...prev, conversations: true }));
    try {
      const data = await messagingService.getConversations(context);
      setConversations(data);
      return data;
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, conversations: false }));
    }
  }, []);

  // ==================== MESSAGES (UPDATED SIGNATURE) ====================

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return [];

    setLoading(prev => ({ ...prev, messages: true }));
    try {
      const data = await messagingService.getConversationMessages(conversationId);
      setMessages(data);
      return data;
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  }, []);

  // ==================== SEND MESSAGE (UPDATED SIGNATURE) ====================

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    listingId?: string
  ): Promise<string> => {
    setLoading(prev => ({ ...prev, sending: true }));
    try {
      const messageId = await messagingService.sendMessage(
        conversationId,
        content,
        'text',
        listingId
      );
      return messageId;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, sending: false }));
    }
  }, []);

  // COMPATIBILITY LAYER - For existing components that use old signature
  const sendMarketplaceMessage = useCallback(async (
    listingId: string,
    receiverId: string,
    message: string
  ): Promise<string> => {
    try {
      // Get or create marketplace conversation
      const conversationId = await messagingService.getOrCreateConversation(
        receiverId,
        'marketplace',
        listingId
      );
      
      // Send the message
      return await sendMessage(conversationId, message, listingId);
    } catch (error) {
      console.error('Error sending marketplace message:', error);
      throw error;
    }
  }, [sendMessage]);

  const getMarketplaceMessages = useCallback(async (
    listingId: string,
    otherUserId: string
  ): Promise<Message[]> => {
    try {
      // Find existing conversation or create new one
      const conversationId = await messagingService.getOrCreateConversation(
        otherUserId,
        'marketplace',
        listingId
      );
      
      // Load messages for this conversation
      const messages = await loadMessages(conversationId);
      
      // Find the conversation in conversations list
      const conversations = await loadConversations('marketplace');
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
      }
      
      return messages;
    } catch (error) {
      console.error('Error getting marketplace messages:', error);
      return [];
    }
  }, [loadMessages, loadConversations]);

  // ==================== CONVERSATION MANAGEMENT ====================

  const getOrCreateConversation = useCallback(async (
    otherUserId: string,
    context: ConversationContext = 'marketplace',
    listingId?: string
  ): Promise<string> => {
    try {
      return await messagingService.getOrCreateConversation(otherUserId, context, listingId);
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    await messagingService.markMessagesAsRead(conversationId);
    // Update local state
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
    ));
  }, []);

  // ==================== UNREAD COUNTS ====================

  const loadUnreadCounts = useCallback(async () => {
    try {
      const counts = await messagingService.getUnreadCounts();
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  }, []);

  // ==================== CONNECTION FEATURES ====================

  const canStartConnectionChat = useCallback(async (otherUserId: string): Promise<{
    canStart: boolean;
    reason?: string;
  }> => {
    return await messagingService.canStartConnectionChat(otherUserId);
  }, []);

  const getConnectedUsers = useCallback(async () => {
    if (userStatus !== 'verified') return [];
    return await messagingService.getConnectedVerifiedUsers();
  }, [userStatus]);

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  const subscribeToMessages = useCallback((conversationId: string) => {
    // Clean up existing subscription
    if (messageSubscriptionRef.current) {
      messageSubscriptionRef.current();
    }

    const unsubscribe = messagingService.subscribeToMessages(conversationId, (message) => {
      // Add to messages if it's the current conversation
      if (currentConversation?.id === conversationId) {
        setMessages(prev => [...prev, message]);
      }
      
      // Update conversations list
      setConversations(prev => {
        const index = prev.findIndex(c => c.id === conversationId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            last_message: message.content || 'Media message',
            last_message_at: message.created_at,
            unread_count: message.sender_id !== currentConversation?.other_user_id ? 
              updated[index].unread_count + 1 : 0
          };
          return updated;
        }
        return prev;
      });
      
      // Update unread counts
      loadUnreadCounts();
    });

    messageSubscriptionRef.current = unsubscribe;
    return unsubscribe;
  }, [currentConversation, loadUnreadCounts]);

  const subscribeToConversations = useCallback(() => {
    if (conversationSubscriptionRef.current) {
      conversationSubscriptionRef.current();
    }

    messagingService.subscribeToConversations((conversation) => {
      // Update conversations list
      setConversations(prev => {
        const index = prev.findIndex(c => c.id === conversation.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = conversation;
          return updated;
        }
        return prev;
      });
      
      loadUnreadCounts();
    }).then(unsubscribe => {
      conversationSubscriptionRef.current = unsubscribe;
    });
  }, [loadUnreadCounts]);

  // ==================== UTILITIES ====================

  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, []);

  const refreshConversations = useCallback(async () => {
    messagingService.clearAllCache();
    await loadConversations();
  }, [loadConversations]);

  // ==================== RETURN VALUES ====================

  return {
    // State
    conversations,
    currentConversation,
    messages,
    unreadCounts,
    loading,
    userStatus,
    canAccessConnectionChats,
    
    // Core Methods (New unified API)
    loadConversations,
    loadMessages,
    sendMessage,
    getOrCreateConversation,
    markAsRead,
    loadUnreadCounts,
    
    // Connection Features
    canStartConnectionChat,
    getConnectedUsers,
    
    // Real-time
    subscribeToMessages,
    subscribeToConversations,
    
    // Utility
    clearCurrentConversation,
    refreshConversations,
    setCurrentConversation,
    
    // COMPATIBILITY METHODS - For existing components
    sendMarketplaceMessage,  // Same signature as old sendMessage
    getMarketplaceMessages,  // Same signature as old getMessages
    setMessages              // For backward compatibility
  };
};

export default useMessaging;