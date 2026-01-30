import { supabase } from '../supabase/client';
import { Message, Conversation, PendingMessage, MessageType } from '../../types/messaging';

// Cache keys
const CACHE_KEYS = {
  CONVERSATIONS: (context?: string) => `chat_conversations_${context || 'all'}`,
  CONVERSATIONS_TIMESTAMP: (context?: string) => `chat_conversations_ts_${context || 'all'}`,
  USER_STATUS: 'user_status_cache',
  USER_STATUS_TIMESTAMP: 'user_status_timestamp',
  MESSAGES: (conversationId: string) => `messages_${conversationId}`,
  MESSAGES_TIMESTAMP: (conversationId: string) => `messages_ts_${conversationId}`
};

class MessagingService {
  // Cache utility functions
  private getFromCache<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      // Try to parse as JSON
      try {
        return JSON.parse(cached);
      } catch (parseError) {
        // If it's not valid JSON, it might be a plain string
        console.warn(`Cache value for ${key} is not valid JSON, treating as plain string:`, cached);
        // For backward compatibility, if it's a string status, return it
        if (key === CACHE_KEYS.USER_STATUS && (cached === 'verified' || cached === 'member')) {
          return cached as any;
        }
        return null;
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  private saveToCache(key: string, data: any): void {
    try {
      // Always stringify the data, even if it's a simple string
      const stringValue = JSON.stringify(data);
      localStorage.setItem(key, stringValue);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  private isCacheValid(timestampKey: string, maxAgeMinutes: number = 2): boolean {
    try {
      const timestamp = localStorage.getItem(timestampKey);
      if (!timestamp) return false;
      
      // Parse timestamp (might be stored as string or number)
      let timestampValue: number;
      try {
        timestampValue = parseInt(timestamp);
        if (isNaN(timestampValue)) {
          // Try to parse as JSON if it's not a plain number
          timestampValue = JSON.parse(timestamp);
        }
      } catch {
        console.warn(`Invalid timestamp format for ${timestampKey}:`, timestamp);
        return false;
      }
      
      const cacheAge = Date.now() - timestampValue;
      return cacheAge < maxAgeMinutes * 60 * 1000;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  // Clear specific cache entries
  private clearCacheItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing cache item:', error);
    }
  }

  // Get current user status with caching - UPDATED
  async getUserStatus(): Promise<'verified' | 'member'> {
    try {
      // Check cache first
      const cachedStatus = this.getFromCache<string>(CACHE_KEYS.USER_STATUS);
      const isCacheValid = this.isCacheValid(CACHE_KEYS.USER_STATUS_TIMESTAMP, 5);
      
      if (cachedStatus && isCacheValid) {
        return cachedStatus as 'verified' | 'member';
      }
      
      // Get from database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_status')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      const status = data.user_status as 'verified' | 'member';
      
      // Cache the result - using saveToCache which handles JSON.stringify
      this.saveToCache(CACHE_KEYS.USER_STATUS, status);
      localStorage.setItem(CACHE_KEYS.USER_STATUS_TIMESTAMP, Date.now().toString());
      
      return status;
    } catch (error) {
      console.error('Error getting user status:', error);
      return 'member'; // Default to member on error
    }
  }

  // Fix any existing bad cache data
  private fixBadCacheData(): void {
    try {
      // Check and fix user status cache if it's malformed
      const userStatusRaw = localStorage.getItem(CACHE_KEYS.USER_STATUS);
      if (userStatusRaw && (userStatusRaw === 'verified' || userStatusRaw === 'member')) {
        console.log('Fixing malformed user status cache');
        this.saveToCache(CACHE_KEYS.USER_STATUS, userStatusRaw);
      }
      
      // Check and fix timestamps
      const timestampKeys = [
        CACHE_KEYS.USER_STATUS_TIMESTAMP,
        CACHE_KEYS.CONVERSATIONS_TIMESTAMP('all'),
        CACHE_KEYS.CONVERSATIONS_TIMESTAMP('connection'),
        CACHE_KEYS.CONVERSATIONS_TIMESTAMP('marketplace')
      ];
      
      timestampKeys.forEach(key => {
        const timestamp = localStorage.getItem(key);
        if (timestamp && isNaN(parseInt(timestamp))) {
          console.log(`Fixing malformed timestamp for ${key}`);
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error fixing cache data:', error);
    }
  }

  // Initialize - call this once at app startup
  initializeCache(): void {
    this.fixBadCacheData();
  }

  // Get conversations for the current user with user status filtering and caching
  async getConversations(context?: 'connection' | 'marketplace'): Promise<Conversation[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        return [];
      }

      // Check cache first
      const cacheKey = CACHE_KEYS.CONVERSATIONS(context);
      const timestampKey = CACHE_KEYS.CONVERSATIONS_TIMESTAMP(context);
      
      const cachedData = this.getFromCache<Conversation[]>(cacheKey);
      const isCacheValid = this.isCacheValid(timestampKey, 2);
      
      if (cachedData && isCacheValid && Array.isArray(cachedData)) {
        console.log('📦 Loading conversations from cache');
        return this.filterConversationsByStatus(cachedData, context);
      }

      // Get user status first
      const userStatus = await this.getUserStatus();
      
      // For member users, only show marketplace conversations
      let actualContext = context;
      if (userStatus === 'member') {
        actualContext = 'marketplace';
      }

      console.log('🔄 Fetching conversations from server:', {
        userId: user.id,
        context: actualContext,
        userStatus
      });

      // Call the PostgreSQL function
      const { data, error } = await supabase.rpc('get_user_conversations', {
        p_user_id: user.id,
        p_context: actualContext || null
      });

      if (error) {
        console.error('❌ RPC Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Try to return cached data even if stale
        if (cachedData && Array.isArray(cachedData)) {
          console.log('⚠️  Using stale cache due to RPC error');
          return this.filterConversationsByStatus(cachedData, context);
        }
        
        throw error;
      }
      
      console.log('✅ Received conversations from server:', data?.length || 0);
      
      let filteredData: Conversation[] = data || [];
      
      // Filter conversations based on user status
      filteredData = this.filterConversationsByStatus(filteredData, actualContext);
      
      // Save to cache
      this.saveToCache(cacheKey, filteredData);
      localStorage.setItem(timestampKey, Date.now().toString());
      
      console.log('✅ Final filtered conversations:', filteredData.length);
      return filteredData;
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      
      // Return cached data if available, even if stale
      const cacheKey = CACHE_KEYS.CONVERSATIONS(context);
      const cachedData = this.getFromCache<Conversation[]>(cacheKey);
      if (cachedData && Array.isArray(cachedData)) {
        console.log('⚠️  Falling back to cached data');
        return cachedData;
      }
      
      return [];
    }
  }

  // Helper to filter conversations by user status
  private filterConversationsByStatus(
    conversations: Conversation[], 
    context?: 'connection' | 'marketplace'
  ): Conversation[] {
    if (!Array.isArray(conversations)) {
      console.warn('filterConversationsByStatus received non-array:', conversations);
      return [];
    }
    
    return conversations.filter(conv => {
      // For marketplace context, all conversations are allowed
      if (context === 'marketplace') {
        return true;
      }
      
      // For connection context, only show if other user is verified
      if (context === 'connection') {
        return conv.other_user_status === 'verified';
      }
      
      // For 'all' context, show everything (filtering happens in component)
      return true;
    });
  }

  // Get or create a conversation with user status validation
  async getOrCreateConversation(
    otherUserId: string,
    context: 'connection' | 'marketplace' = 'connection',
    listingId?: string
  ): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log(`🔄 Getting/Creating conversation:`, {
        user1: user.id,
        user2: otherUserId,
        context,
        listingId
      });

      // Get current user status
      const currentUserStatus = await this.getUserStatus();
      
      // Get other user status
      const { data: otherUserData, error: otherUserError } = await supabase
        .from('profiles')
        .select('user_status')
        .eq('id', otherUserId)
        .single();
        
      if (otherUserError) {
        console.error('Error fetching other user status:', otherUserError);
        throw new Error('Could not find user');
      }
      
      const otherUserStatus = otherUserData?.user_status as 'verified' | 'member';
      
      // Validate based on user status
      if (context === 'connection') {
        if (currentUserStatus !== 'verified' || otherUserStatus !== 'verified') {
          throw new Error('Both users must be verified for connection chats');
        }
      }
      
      // For member users, they can only create marketplace conversations
      if (currentUserStatus === 'member' && context !== 'marketplace') {
        throw new Error('Member users can only create marketplace conversations');
      }

      // Call PostgreSQL function
      const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
        p_user1_id: user.id,
        p_user2_id: otherUserId,
        p_context: context,
        p_listing_id: listingId || null
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        
        // Handle unique constraint violation
        if (error.code === '23505') {
          console.log('🔄 Constraint violation, finding existing conversation...');
          const conversations = await this.getConversations();
          const existingConv = conversations.find(
            conv => conv.other_user_id === otherUserId && conv.context === context
          );
          
          if (existingConv) {
            console.log(`✅ Found existing conversation: ${existingConv.conversation_id}`);
            return existingConv.conversation_id;
          }
        }
        throw error;
      }

      console.log(`✅ Conversation ID: ${conversationId}`);
      
      // Clear conversations cache since we have a new conversation
      this.clearConversationsCache();
      
      return conversationId;
      
    } catch (error: any) {
      console.error('❌ Error in getOrCreateConversation:', error);
      throw error;
    }
  }

  // Get messages for a conversation with caching
  async getMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      // Try to load from cache first
      const cacheKey = CACHE_KEYS.MESSAGES(conversationId);
      const timestampKey = CACHE_KEYS.MESSAGES_TIMESTAMP(conversationId);
      
      const cachedData = this.getFromCache<Message[]>(cacheKey);
      const isCacheValid = this.isCacheValid(timestampKey, 2);
      
      if (cachedData && isCacheValid && Array.isArray(cachedData)) {
        console.log('📦 Loading messages from cache for conversation:', conversationId);
        // Mark as read in background
        setTimeout(() => this.markMessagesAsRead(conversationId), 100);
        return cachedData.slice(offset, offset + limit);
      }
      
      // Load from database
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const messages = data || [];
      
      // Cache the result
      this.saveToCache(cacheKey, messages);
      localStorage.setItem(timestampKey, Date.now().toString());

      // Mark messages as read
      await this.markMessagesAsRead(conversationId);

      console.log('🔄 Loaded messages from server for conversation:', conversationId, messages.length);
      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Return cached data if available
      const cacheKey = CACHE_KEYS.MESSAGES(conversationId);
      const cachedData = this.getFromCache<Message[]>(cacheKey);
      return (cachedData && Array.isArray(cachedData)) ? cachedData : [];
    }
  }

  // Send a message
  async sendMessage(
    conversationId: string,
    content: string,
    type: MessageType = 'text',
    mediaFile?: File
  ): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let mediaUrl: string | null = null;

      // Upload media if provided
      if (mediaFile) {
        mediaUrl = await this.uploadMedia(conversationId, mediaFile);
      }

      // Insert message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          type,
          content: type === 'text' ? content : null,
          media_url: mediaUrl
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Clear cache for this conversation's messages
      this.clearCacheItem(CACHE_KEYS.MESSAGES(conversationId));
      this.clearCacheItem(CACHE_KEYS.MESSAGES_TIMESTAMP(conversationId));
      
      // Clear conversations cache
      this.clearConversationsCache();

      return data.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Upload media file
  private async uploadMedia(conversationId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${conversationId}/${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      // Compress image if it's an image
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        processedFile = await this.compressImage(file);
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
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

  // Compress image for mobile
  private async compressImage(file: File, maxWidth: number = 1200, quality: number = 0.7): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
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
                reject(new Error('Failed to compress image'));
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

  // Mark messages as read
  async markMessagesAsRead(conversationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: user.id
      });
      
      // Clear conversations cache to update unread counts
      this.clearConversationsCache();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Clear conversations cache
  private clearConversationsCache(): void {
    // Clear all conversation caches
    const contexts = ['all', 'connection', 'marketplace'];
    contexts.forEach(context => {
      this.clearCacheItem(CACHE_KEYS.CONVERSATIONS(context));
      this.clearCacheItem(CACHE_KEYS.CONVERSATIONS_TIMESTAMP(context));
    });
  }

  // Check if already messaged about a listing
  async hasMessagedAboutListing(conversationId: string, listingTitle: string): Promise<boolean> {
    try {
      const messages = await this.getMessages(conversationId, 20);
      
      // Check if any message mentions this listing
      const listingKeywords = [
        `"${listingTitle}"`,
        'interested in your listing',
        'is this still available',
        listingTitle.toLowerCase()
      ];
      
      return messages.some(msg => {
        const content = msg.content?.toLowerCase() || '';
        return listingKeywords.some(keyword => content.includes(keyword.toLowerCase()));
      });
    } catch (error) {
      console.error('Error checking existing messages:', error);
      return false;
    }
  }

  // Clear all cache (useful for logout or debugging)
  clearAllCache(): void {
    try {
      // Clear all cache keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('chat_') || 
            key.startsWith('messages_') || 
            key.startsWith('user_status')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  // Subscribe to new messages in a specific conversation
  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    console.log(`🔔 Setting up message subscription for conversation: ${conversationId}`);
    
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
          console.log('📨 New message received in subscription:', payload.new.id);
          
          // Clear cache for this conversation
          this.clearCacheItem(CACHE_KEYS.MESSAGES(conversationId));
          this.clearCacheItem(CACHE_KEYS.MESSAGES_TIMESTAMP(conversationId));
          
          // Clear conversations cache
          this.clearConversationsCache();
          
          callback(payload.new as Message);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Message subscription status for ${conversationId}:`, status);
      });

    return () => {
      console.log(`🔕 Unsubscribing from messages for conversation: ${conversationId}`);
      supabase.removeChannel(channel);
    };
  }

  // Subscribe to conversation updates
  subscribeToConversations(callback: () => void): () => void {
    console.log('🔔 Setting up conversation subscriptions...');
    
    let unsubscribe = () => {
      console.log('🔕 Cleanup called before subscription was ready');
    };
    
    let processedMessageIds = new Set<string>();
    let processedConversationIds = new Set<string>();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        console.error('No user found for conversation subscription');
        return;
      }
      
      console.log(`📡 Subscribing to conversations for user: ${user.id}`);
      
      processedMessageIds.clear();
      processedConversationIds.clear();
      
      const channel = supabase
        .channel(`user-conversations:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          async (payload) => {
            const messageId = payload.new.id;
            
            if (processedMessageIds.has(messageId)) {
              return;
            }
            
            processedMessageIds.add(messageId);
            console.log('📨 New message detected in conversations:', messageId);
            
            if (payload.new && payload.new.conversation_id) {
              const { data: conversation } = await supabase
                .from('conversations')
                .select('user1_id, user2_id')
                .eq('id', payload.new.conversation_id)
                .single();
              
              if (conversation && (conversation.user1_id === user.id || conversation.user2_id === user.id)) {
                console.log('🔄 Triggering callback for new message');
                
                // Clear relevant caches
                this.clearConversationsCache();
                this.clearCacheItem(CACHE_KEYS.MESSAGES(payload.new.conversation_id));
                this.clearCacheItem(CACHE_KEYS.MESSAGES_TIMESTAMP(payload.new.conversation_id));
                
                callback();
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations'
          },
          (payload) => {
            const conversationId = payload.new.id;
            
            if (processedConversationIds.has(conversationId)) {
              return;
            }
            
            processedConversationIds.add(conversationId);
            
            if (payload.new && (payload.new.user1_id === user.id || payload.new.user2_id === user.id)) {
              console.log('🔄 Conversation updated:', conversationId);
              
              // Clear conversations cache
              this.clearConversationsCache();
              callback();
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Conversation subscription status:', status);
        });
      
      const cleanupInterval = setInterval(() => {
        if (processedMessageIds.size > 1000) {
          processedMessageIds.clear();
        }
        if (processedConversationIds.size > 100) {
          processedConversationIds.clear();
        }
      }, 60000);
      
      unsubscribe = () => {
        console.log('🔕 Unsubscribing from conversations');
        clearInterval(cleanupInterval);
        supabase.removeChannel(channel);
      };
    }).catch(error => {
      console.error('Error setting up conversation subscription:', error);
    });
    
    return () => {
      unsubscribe();
    };
  }

  // Get unread count across all conversations
  async getTotalUnreadCount(): Promise<number> {
    try {
      const conversations = await this.getConversations();
      return conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Refresh conversations cache (for manual refresh)
  async refreshConversationsCache(): Promise<void> {
    this.clearConversationsCache();
    await this.getConversations(); // This will refresh the cache
  }
}

export const messagingService = new MessagingService();

// Initialize cache when module loads
messagingService.initializeCache();