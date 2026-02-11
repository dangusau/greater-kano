import { supabase } from '../supabase';
import { 
  Conversation, 
  Message, 
  MessageType, 
  ConversationContext,
  UnreadCounts,
  ConnectionUser
} from '../../types/messaging';

// Cache keys
const CACHE_KEYS = {
  CONVERSATIONS: (context?: ConversationContext | 'all') => `conversations_${context || 'all'}`,
  CONVERSATIONS_TS: (context?: ConversationContext | 'all') => `conversations_ts_${context || 'all'}`,
  MESSAGES: (conversationId: string) => `messages_${conversationId}`,
  MESSAGES_TS: (conversationId: string) => `messages_ts_${conversationId}`,
  UNREAD_COUNTS: 'unread_counts',
  UNREAD_COUNTS_TS: 'unread_counts_ts',
  USER_STATUS: 'user_status',
  USER_STATUS_TS: 'user_status_ts'
};

// Cache TTL in minutes
const CACHE_TTL = {
  CONVERSATIONS: 2,
  MESSAGES: 5,
  UNREAD_COUNTS: 1,
  USER_STATUS: 5
};

export class MessagingService {
  private subscriptions = new Map<string, () => void>();

  // ==================== CACHE METHODS ====================
  
  private getCache<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private setCache(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  private setCacheWithTimestamp(key: string, timestampKey: string, data: any): void {
    this.setCache(key, data);
    this.setCache(timestampKey, Date.now());
  }

  private isCacheValid(timestampKey: string, ttlMinutes: number): boolean {
    const timestamp = this.getCache<number>(timestampKey);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < ttlMinutes * 60 * 1000;
  }

  private clearCacheByPattern(pattern: string): void {
    Object.keys(localStorage).forEach(key => {
      if (key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });
  }

  // ==================== USER STATUS METHODS ====================

  /**
   * Get current user's status with caching
   */
  async getUserStatus(): Promise<'verified' | 'member'> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check cache first
      const cached = this.getCache<'verified' | 'member'>(CACHE_KEYS.USER_STATUS);
      if (cached && this.isCacheValid(CACHE_KEYS.USER_STATUS_TS, CACHE_TTL.USER_STATUS)) {
        return cached;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('profiles')
        .select('user_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const status = data.user_status as 'verified' | 'member';
      
      // Cache result
      this.setCacheWithTimestamp(CACHE_KEYS.USER_STATUS, CACHE_KEYS.USER_STATUS_TS, status);
      
      return status;

    } catch (error) {
      console.error('Error getting user status:', error);
      return 'member'; // Default to member on error
    }
  }

  /**
   * Get other user's status
   */
  private async getOtherUserStatus(otherUserId: string): Promise<'verified' | 'member'> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_status')
        .eq('id', otherUserId)
        .single();

      if (error) throw error;
      return data.user_status as 'verified' | 'member';
    } catch (error) {
      console.error('Error getting other user status:', error);
      return 'member';
    }
  }

  /**
   * Check if user can access connection conversations
   */
  async canAccessConnectionChats(): Promise<boolean> {
    const status = await this.getUserStatus();
    return status === 'verified';
  }

  /**
   * Get user's display name (combines first_name and last_name)
   */
  private getUserDisplayName(firstName?: string | null, lastName?: string | null): string {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      return 'User';
    }
  }

  // ==================== CONVERSATION METHODS ====================

  /**
   * Get user's conversations with filtering by context
   */
  async getConversations(context?: ConversationContext): Promise<Conversation[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const cacheKey = CACHE_KEYS.CONVERSATIONS(context || 'all');
      const tsKey = CACHE_KEYS.CONVERSATIONS_TS(context || 'all');

      // Check cache
      const cached = this.getCache<Conversation[]>(cacheKey);
      if (cached && this.isCacheValid(tsKey, CACHE_TTL.CONVERSATIONS)) {
        return cached;
      }

      // Fetch from database
      const { data, error } = await supabase.rpc('get_user_conversations', {
        p_user_id: user.id,
        p_context: context || null
      });

      if (error) {
        console.error('Error fetching conversations:', error);
        return cached || [];
      }

      // Transform to Conversation type
      const conversations: Conversation[] = (data || []).map((item: any) => ({
        id: item.conversation_id,
        conversation_id: item.conversation_id,
        other_user_id: item.other_user_id,
        other_user_name: item.other_user_name,
        other_user_avatar: item.other_user_avatar,
        last_message: item.last_message,
        last_message_at: item.last_message_at,
        unread_count: item.unread_count,
        context: item.context as ConversationContext,
        listing_id: item.listing_id,
        listing_title: item.listing_title
      }));

      // Cache results
      this.setCacheWithTimestamp(cacheKey, tsKey, conversations);
      return conversations;

    } catch (error) {
      console.error('Error in getConversations:', error);
      return [];
    }
  }

  /**
   * Get or create a conversation with proper validation
   */
  async getOrCreateConversation(
    otherUserId: string,
    context: ConversationContext = 'marketplace',
    listingId?: string
  ): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // For connection context, validate BEFORE calling RPC
      if (context === 'connection') {
        const validation = await this.canStartConnectionChat(otherUserId);
        if (!validation.canStart) {
          throw new Error(validation.reason || 'Cannot start connection conversation');
        }
      }

      // Call the PostgreSQL function - ONLY 3 PARAMETERS!
      const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
        p_user1_id: user.id,
        p_user2_id: otherUserId,
        p_context: context
        // NO p_listing_id parameter!
      });

      if (error) {
        console.error('Error creating conversation:', error);
        throw error;
      }

      // Clear conversations cache
      this.clearCacheByPattern('conversations_');
      
      return conversationId;

    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      throw error;
    }
  }

  // ==================== MESSAGE METHODS ====================

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const cacheKey = CACHE_KEYS.MESSAGES(conversationId);
      const tsKey = CACHE_KEYS.MESSAGES_TS(conversationId);

      // Check cache
      const cached = this.getCache<Message[]>(cacheKey);
      if (cached && this.isCacheValid(tsKey, CACHE_TTL.MESSAGES)) {
        const start = offset;
        const end = offset + limit;
        return cached.slice(start, end);
      }

      // Fetch from database
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: conversationId,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      // Transform to Message type
      const messages: Message[] = (data || []).map((item: any) => ({
        id: item.id,
        conversation_id: conversationId,
        sender_id: item.sender_id,
        sender_name: item.sender_name,
        sender_avatar: item.sender_avatar,
        type: item.type as MessageType,
        content: item.content,
        listing_id: item.listing_id,
        listing_title: item.listing_title,
        media_url: item.media_url,
        is_read: item.is_read,
        created_at: item.created_at
      }));

      // Cache results
      this.setCacheWithTimestamp(cacheKey, tsKey, messages);

      // Mark as read in background
      this.markMessagesAsRead(conversationId).catch(console.error);

      return messages;

    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      return [];
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    type: MessageType = 'text',
    listingId?: string,
    mediaFile?: File
  ): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let mediaUrl: string | undefined;

      // Upload media if provided
      if (mediaFile) {
        mediaUrl = await this.uploadMedia(conversationId, mediaFile);
      }

      // Call the PostgreSQL function
      const { data: messageId, error } = await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_sender_id: user.id,
        p_content: content,
        p_type: type,
        p_listing_id: listingId || null
      });

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      // Clear caches
      this.clearCacheByPattern('conversations_');
      this.clearCacheByPattern(`messages_${conversationId}`);
      localStorage.removeItem(CACHE_KEYS.UNREAD_COUNTS);
      localStorage.removeItem(CACHE_KEYS.UNREAD_COUNTS_TS);

      return messageId;

    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  /**
   * Send pre-filled marketplace message
   */
  async sendMarketplaceMessage(
    conversationId: string,
    listingId: string,
    listingTitle: string
  ): Promise<string> {
    // First check if we've already messaged about this listing
    const hasMessaged = await this.hasMessagedAboutListing(conversationId, listingId);
    
    if (hasMessaged) {
      // If already messaged, just send a generic message
      return this.sendMessage(
        conversationId,
        "Hi, I had a question about your listing",
        'text',
        listingId
      );
    } else {
      // First message about this listing - send pre-filled message
      const content = `Hi, I'm interested in your listing "${listingTitle}". Is it still available?`;
      
      return this.sendMessage(
        conversationId,
        content,
        'text',
        listingId
      );
    }
  }

  /**
   * Check if user has messaged about a listing
   */
  async hasMessagedAboutListing(conversationId: string, listingId: string): Promise<boolean> {
    try {
      const messages = await this.getConversationMessages(conversationId, 20);
      return messages.some(msg => msg.listing_id === listingId);
    } catch (error) {
      console.error('Error checking listing messages:', error);
      return false;
    }
  }

  // ==================== CONNECTION VALIDATION METHODS ====================

  /**
   * Check if two users are connected (check both directions)
   */
  async areUsersConnected(userId1: string, userId2: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('status')
        .or(`and(user_id.eq.${userId1},connected_user_id.eq.${userId2}),and(user_id.eq.${userId2},connected_user_id.eq.${userId1})`)
        .eq('status', 'connected')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking connection:', error);
      }

      return !!data;
    } catch (error) {
      console.error('Error in areUsersConnected:', error);
      return false;
    }
  }

  /**
   * Check if user can start a connection conversation
   */
  async canStartConnectionChat(otherUserId: string): Promise<{
    canStart: boolean;
    reason?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { canStart: false, reason: 'Not authenticated' };
      }

      // 1. Check if current user is verified
      const currentUserStatus = await this.getUserStatus();
      if (currentUserStatus !== 'verified') {
        return { 
          canStart: false, 
          reason: 'You must be verified to start connection conversations' 
        };
      }

      // 2. Check if other user is verified
      const otherUserStatus = await this.getOtherUserStatus(otherUserId);
      if (otherUserStatus !== 'verified') {
        return { 
          canStart: false, 
          reason: 'User must be verified for connection conversations' 
        };
      }

      // 3. Check if users are connected
      const areConnected = await this.areUsersConnected(user.id, otherUserId);
      if (!areConnected) {
        return { 
          canStart: false, 
          reason: 'You must be connected with this user to start a conversation' 
        };
      }

      return { canStart: true };
    } catch (error) {
      console.error('Error checking connection chat:', error);
      return { 
        canStart: false, 
        reason: 'Unable to verify connection status' 
      };
    }
  }

  /**
   * Get connected verified users for /messages/new page
   */
  async getConnectedVerifiedUsers(): Promise<ConnectionUser[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const userStatus = await this.getUserStatus();
      if (userStatus !== 'verified') {
        return [];
      }

      // Get connections where current user is either user_id OR connected_user_id
      const { data: connections, error } = await supabase
        .from('connections')
        .select(`
          user_id,
          connected_user_id,
          status,
          user:profiles!connections_user_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            user_status
          ),
          connected_user:profiles!connections_connected_user_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            user_status
          )
        `)
        .eq('status', 'connected')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching connections:', error);
        return [];
      }

      const connectedUsers: ConnectionUser[] = [];

      connections?.forEach((conn: any) => {
        let connectedUser;
        
        // If current user is user_id, get connected_user profile
        if (conn.user_id === user.id && conn.connected_user?.user_status === 'verified') {
          connectedUser = conn.connected_user;
        }
        // If current user is connected_user_id, get user profile  
        else if (conn.connected_user_id === user.id && conn.user?.user_status === 'verified') {
          connectedUser = conn.user;
        }

        if (connectedUser && connectedUser.id !== user.id) {
          connectedUsers.push({
            id: connectedUser.id,
            username: this.getUserDisplayName(connectedUser.first_name, connectedUser.last_name),
            avatar_url: connectedUser.avatar_url
          });
        }
      });

      return connectedUsers;
    } catch (error) {
      console.error('Error in getConnectedVerifiedUsers:', error);
      return [];
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get total unread count (for backward compatibility)
   */
  async getTotalUnreadCount(): Promise<number> {
    try {
      const counts = await this.getUnreadCounts();
      return counts.total;
    } catch (error) {
      console.error('Error getting total unread count:', error);
      return 0;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: user.id
      });

      // Clear caches
      this.clearCacheByPattern('conversations_');
      localStorage.removeItem(CACHE_KEYS.UNREAD_COUNTS);
      localStorage.removeItem(CACHE_KEYS.UNREAD_COUNTS_TS);

    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  /**
   * Get unread counts
   */
  async getUnreadCounts(): Promise<UnreadCounts> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total: 0, marketplace: 0, connection: 0 };

      const cacheKey = CACHE_KEYS.UNREAD_COUNTS;
      const tsKey = CACHE_KEYS.UNREAD_COUNTS_TS;

      // Check cache
      const cached = this.getCache<UnreadCounts>(cacheKey);
      if (cached && this.isCacheValid(tsKey, CACHE_TTL.UNREAD_COUNTS)) {
        return cached;
      }

      // Fetch from database
      const { data, error } = await supabase.rpc('get_unread_counts', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching unread counts:', error);
        return { total: 0, marketplace: 0, connection: 0 };
      }

      const counts = data?.[0] || { total_unread: 0, marketplace_unread: 0, connection_unread: 0 };
      const result: UnreadCounts = {
        total: counts.total_unread || 0,
        marketplace: counts.marketplace_unread || 0,
        connection: counts.connection_unread || 0
      };

      // Cache results
      this.setCacheWithTimestamp(cacheKey, tsKey, result);
      return result;

    } catch (error) {
      console.error('Error in getUnreadCounts:', error);
      return { total: 0, marketplace: 0, connection: 0 };
    }
  }

  /**
   * Upload media file
   */
  async uploadMedia(conversationId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      // Compress image if needed
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        processedFile = await this.compressImage(file);
      }

      // Upload to storage
      const { error } = await supabase.storage
        .from('chat-media')
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      return publicUrl;

    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  private async compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/webp',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/webp',
            quality
          );
        };
        
        img.onerror = reject;
      };
      
      reader.onerror = reject;
    });
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToMessages(conversationId: string, callback: (message: Message) => void): () => void {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Clear caches
          this.clearCacheByPattern(`messages_${conversationId}`);
          this.clearCacheByPattern('conversations_');
          localStorage.removeItem(CACHE_KEYS.UNREAD_COUNTS);
          localStorage.removeItem(CACHE_KEYS.UNREAD_COUNTS_TS);

          callback(newMessage);
        }
      )
      .subscribe();

    this.subscriptions.set(`messages:${conversationId}`, () => {
      supabase.removeChannel(channel);
    });

    return () => {
      const unsubscribe = this.subscriptions.get(`messages:${conversationId}`);
      if (unsubscribe) {
        unsubscribe();
        this.subscriptions.delete(`messages:${conversationId}`);
      }
    };
  }

  /**
   * Subscribe to conversation updates
   */
  async subscribeToConversations(callback: (conversation: Conversation) => void): Promise<() => void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return () => {};

    const channel = supabase
      .channel(`user-conversations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `user1_id=eq.${user.id},user2_id=eq.${user.id}`
        },
        (payload) => {
          const conversation = payload.new as Conversation;
          
          // Clear caches
          this.clearCacheByPattern('conversations_');
          localStorage.removeItem(CACHE_KEYS.UNREAD_COUNTS);
          localStorage.removeItem(CACHE_KEYS.UNREAD_COUNTS_TS);

          callback(conversation);
        }
      )
      .subscribe();

    this.subscriptions.set(`conversations:${user.id}`, () => {
      supabase.removeChannel(channel);
    });

    return () => {
      const unsubscribe = this.subscriptions.get(`conversations:${user.id}`);
      if (unsubscribe) {
        unsubscribe();
        this.subscriptions.delete(`conversations:${user.id}`);
      }
    };
  }

  /**
   * Clean up all subscriptions
   */
  cleanupSubscriptions(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }

  /**
   * Clear all messaging caches
   */
  clearAllCache(): void {
    this.clearCacheByPattern('conversations_');
    this.clearCacheByPattern('messages_');
    localStorage.removeItem(CACHE_KEYS.UNREAD_COUNTS);
    localStorage.removeItem(CACHE_KEYS.UNREAD_COUNTS_TS);
    localStorage.removeItem(CACHE_KEYS.USER_STATUS);
    localStorage.removeItem(CACHE_KEYS.USER_STATUS_TS);
  }
}

// Export singleton instance
export const messagingService = new MessagingService();