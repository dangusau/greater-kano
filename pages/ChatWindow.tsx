import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Send, Image as ImageIcon, Mic, MoreVertical,
  Paperclip, Camera, X, ShoppingBag, ExternalLink,
  Check, CheckCheck, AlertCircle, Clock
} from 'lucide-react';
import { messagingService } from '../services/supabase/messaging';
import { supabase } from '../services/supabase';
import { Message, MessageType } from '../types/messaging';
import { formatTimeAgo } from '../utils/formatters';
import VerifiedBadge from '../components/VerifiedBadge';

// Cache keys
const CACHE_KEYS = {
  MESSAGES: (conversationId: string) => `chat_messages_${conversationId}`,
  MESSAGES_TIMESTAMP: (conversationId: string) => `chat_messages_ts_${conversationId}`,
  CONVERSATION_INFO: (conversationId: string) => `chat_info_${conversationId}`
};

// Generate temporary ID for optimistic updates
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const ChatWindow: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserStatus, setCurrentUserStatus] = useState<'verified' | 'member' | null>(null);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(new Set());
  const [failedMessages, setFailedMessages] = useState<Map<string, { message: string, retryCount: number }>>(new Map());
  
  const otherUser = location.state?.otherUser || {
    id: '',
    name: 'Unknown User',
    avatar: '',
    status: 'member'
  };
  
  const context = location.state?.context || 'connection';
  const listing = location.state?.listing || null;

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !initialLoadComplete) {
        console.warn('ChatWindow safety timeout - forcing UI to show');
        setLoading(false);
        setInitialLoadComplete(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [loading, initialLoadComplete]);

  // Get current user info
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          
          // Get user status
          const { data } = await supabase
            .from('profiles')
            .select('user_status')
            .eq('id', user.id)
            .single();
            
          if (data) {
            setCurrentUserStatus(data.user_status as 'verified' | 'member');
          }
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((instant: boolean = false) => {
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: instant ? 'auto' : 'smooth',
          block: 'end'
        });
      }
    });
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && initialLoadComplete) {
      scrollToBottom();
    }
  }, [messages, initialLoadComplete, scrollToBottom]);

  // Check if user is near bottom before auto-scrolling
  const isNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // If within 200px of bottom, consider it "near bottom"
    return distanceFromBottom <= 200;
  }, []);

  // Load messages and setup realtime
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;
    let realtimeChannel: any = null;

    const initializeChat = async () => {
      if (!conversationId || !isMounted) return;

      try {
        setLoading(true);
        
        // Try to load from cache first
        const cacheKey = CACHE_KEYS.MESSAGES(conversationId);
        const timestampKey = CACHE_KEYS.MESSAGES_TIMESTAMP(conversationId);
        
        const cachedMessages = localStorage.getItem(cacheKey);
        const cachedTimestamp = localStorage.getItem(timestampKey);
        
        // Show cached messages if available (less than 5 minutes old)
        if (cachedMessages && cachedTimestamp) {
          const cacheAge = Date.now() - parseInt(cachedTimestamp);
          if (cacheAge < 5 * 60 * 1000) {
            try {
              const parsedMessages = JSON.parse(cachedMessages);
              if (isMounted && Array.isArray(parsedMessages)) {
                setMessages(parsedMessages);
                setInitialLoadComplete(true);
                scrollToBottom(true);
                
                // Mark as read in background
                setTimeout(() => {
                  messagingService.markMessagesAsRead(conversationId);
                }, 500);
              }
            } catch (parseError) {
              console.error('Error parsing cached messages:', parseError);
            }
          }
        }
        
        // Setup realtime BEFORE fetching to catch any messages sent while loading
        setupRealtime();
        
        // Fetch fresh messages
        const freshMessages = await messagingService.getMessages(conversationId);
        
        if (isMounted) {
          // Merge with cached messages (prefer fresh data)
          setMessages(freshMessages);
          setLoading(false);
          setInitialLoadComplete(true);
          scrollToBottom();
          
          // Cache the fresh messages
          try {
            localStorage.setItem(cacheKey, JSON.stringify(freshMessages));
            localStorage.setItem(timestampKey, Date.now().toString());
          } catch (error) {
            console.error('Error caching messages:', error);
          }
        }
        
      } catch (error) {
        console.error('Error initializing chat:', error);
        if (isMounted) {
          setLoading(false);
          setInitialLoadComplete(true);
        }
      }
    };
    
    const setupRealtime = () => {
      if (!conversationId || realtimeChannel) return;
      
      console.log(`🔔 Setting up realtime for conversation: ${conversationId}`);
      
      // Subscribe to new messages
      realtimeChannel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          async (payload) => {
            const newMessage = payload.new as Message;
            
            // Skip if this is our own optimistic message
            if (pendingMessages.has(newMessage.id)) {
              console.log('Skipping realtime message (optimistic):', newMessage.id);
              setPendingMessages(prev => {
                const next = new Set(prev);
                next.delete(newMessage.id);
                return next;
              });
              return;
            }
            
          
            
            if (isMounted) {
              // Add the new message
              setMessages(prev => {
                // Check if message already exists (avoid duplicates)
                const exists = prev.some(msg => msg.id === newMessage.id);
                if (exists) return prev;
                
                const updated = [...prev, newMessage];
                
                // Update cache
                try {
                  localStorage.setItem(
                    CACHE_KEYS.MESSAGES(conversationId),
                    JSON.stringify(updated)
                  );
                  localStorage.setItem(
                    CACHE_KEYS.MESSAGES_TIMESTAMP(conversationId),
                    Date.now().toString()
                  );
                } catch (error) {
                  console.error('Error updating cache:', error);
                }
                
                return updated;
              });
              
              // Mark as read if it's not our message
              if (newMessage.sender_id !== currentUserId) {
                setTimeout(() => {
                  messagingService.markMessagesAsRead(conversationId);
                }, 100);
              }
              
              // Auto-scroll if user is near bottom
              if (isNearBottom()) {
                scrollToBottom();
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            const updatedMessage = payload.new as Message;
            console.log('✏️  Message updated:', updatedMessage.id);
            
            if (isMounted) {
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === updatedMessage.id ? updatedMessage : msg
                )
              );
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 Realtime status: ${status}`);
          setRealtimeConnected(status === 'SUBSCRIBED');
        });
      
      unsubscribe = () => {
        if (realtimeChannel) {
          console.log(`🔕 Unsubscribing from realtime: ${conversationId}`);
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
      };
    };
    
    initializeChat();
    
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId, currentUserId, isNearBottom, scrollToBottom]);

  // Optimistic send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || sending) return;

    const messageContent = newMessage.trim();
    const tempId = generateTempId();
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      type: 'text',
      content: messageContent,
      media_url: null,
      is_read: false,
      created_at: new Date().toISOString()
    };

    try {
      setSending(true);
      setNewMessage('');
      
      // Add to pending messages
      setPendingMessages(prev => new Set([...prev, tempId]));
      
      // Add optimistic message immediately
      setMessages(prev => {
        const updated = [...prev, optimisticMessage];
        
        // Update cache
        try {
          localStorage.setItem(
            CACHE_KEYS.MESSAGES(conversationId),
            JSON.stringify(updated)
          );
        } catch (error) {
          console.error('Error updating cache:', error);
        }
        
        return updated;
      });
      
      // Scroll to show new message
      scrollToBottom();
      
      // Send actual message
      const messageId = await messagingService.sendMessage(conversationId, messageContent);
      
      console.log('✅ Message sent successfully:', messageId);
      
      // Remove from pending
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      
      // Update message with real ID
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: messageId } 
            : msg
        )
      );
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Remove from pending
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      
      // Mark as failed
      setFailedMessages(prev => {
        const next = new Map(prev);
        next.set(tempId, { 
          message: messageContent, 
          retryCount: 0 
        });
        return next;
      });
      
      // Remove optimistic message (will show retry UI)
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      // Show error toast
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Retry failed message
  const handleRetryMessage = async (tempId: string, messageContent: string) => {
    if (!conversationId) return;
    
    try {
      // Remove from failed
      setFailedMessages(prev => {
        const next = new Map(prev);
        next.delete(tempId);
        return next;
      });
      
      // Add back as optimistic
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        type: 'text',
        content: messageContent,
        media_url: null,
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setPendingMessages(prev => new Set([...prev, tempId]));
      
      // Retry send
      const messageId = await messagingService.sendMessage(conversationId, messageContent);
      
      // Update with real ID
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: messageId } 
            : msg
        )
      );
      
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      
    } catch (error) {
      console.error('❌ Retry failed:', error);
      alert('Failed to resend message.');
    }
  };

  const handleMediaUpload = async (file: File) => {
    if (!conversationId || uploading) return;
    
    const tempId = generateTempId();
    
    try {
      setUploading(true);
      
      // Create optimistic message for media
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 'audio',
        content: file.name,
        media_url: URL.createObjectURL(file), // Temp URL for preview
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      // Add to pending
      setPendingMessages(prev => new Set([...prev, tempId]));
      
      // Add optimistic message
      setMessages(prev => [...prev, optimisticMessage]);
      scrollToBottom();
      
      // Upload and send
      await messagingService.sendMessage(
        conversationId,
        file.name,
        optimisticMessage.type,
        file
      );
      
      // Remove from pending
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      
      setShowMediaOptions(false);
      
    } catch (error) {
      console.error('Error uploading media:', error);
      
      // Remove from pending
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      
      // Remove optimistic message
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      alert('Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleMediaUpload(file);
    }
    event.target.value = '';
  };

  const handleProfileClick = () => {
    navigate(`/profile/${otherUser.id}`);
  };

  const handleViewListing = () => {
    if (listing?.id) {
      navigate(`/marketplace/listing/${listing.id}`);
    }
  };

  // Show loading only for first 3 seconds
  if (loading && !initialLoadComplete) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        {/* Loading Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="p-4 flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="ml-3">
              <div className="h-4 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className={`h-12 bg-gray-200 rounded-2xl ${
                i % 2 === 0 ? 'w-3/4 ml-auto' : 'w-2/3'
              }`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <button
                onClick={handleProfileClick}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 relative">
                  {otherUser.avatar ? (
                    <img
                      src={otherUser.avatar}
                      alt={otherUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                      {otherUser.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {otherUser.status === 'verified' && (
                    <div className="absolute -bottom-1 -right-1">
                      <VerifiedBadge size={12} />
                    </div>
                  )}
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h2 className="font-bold text-gray-900 truncate">{otherUser.name}</h2>
                    {otherUser.status === 'verified' && (
                      <VerifiedBadge size={12} />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 truncate">
                      {context === 'marketplace' ? 'Product conversation' : 'Direct message'}
                    </p>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        realtimeConnected ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-gray-500">
                        {realtimeConnected ? 'Live' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Connection status indicator */}
              {currentUserStatus === 'member' && (
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full border border-amber-200">
                  Member
                </span>
              )}
            </div>
          </div>
        </div>
        
        {context === 'marketplace' && listing && (
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm">{listing.title}</p>
                {listing.price && (
                  <p className="text-green-600 font-bold text-sm">₦{listing.price}</p>
                )}
              </div>
              <button
                onClick={handleViewListing}
                className="flex-shrink-0 ml-2 p-1 hover:bg-gray-200 rounded"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">No messages yet</h3>
            <p className="text-gray-600 text-center max-w-md">
              {context === 'marketplace' 
                ? `Start the conversation about ${listing?.title || 'this product'}`
                : 'Send a message to start the conversation'}
            </p>
            {currentUserStatus === 'member' && context === 'connection' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl border-2 border-amber-200 text-center max-w-md">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <p className="text-amber-700 font-medium">Member Account</p>
                </div>
                <p className="text-amber-600 text-sm">
                  You're chatting with a verified member. Upgrade to verified status for full access to all features.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === currentUserId;
              const isPending = pendingMessages.has(message.id);
              const isTemp = message.id.startsWith('temp_');
              const failedMessage = failedMessages.get(message.id);
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${isOwn ? 'flex flex-col items-end' : ''}`}>
                    {/* Failed message retry UI */}
                    {failedMessage && (
                      <div className="mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700">Failed to send</span>
                        <button
                          onClick={() => handleRetryMessage(message.id, failedMessage.message)}
                          className="ml-auto text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    
                    <div
                      className={`px-4 py-3 rounded-2xl relative ${
                        isOwn
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-900 rounded-bl-none'
                      } ${message.type !== 'text' ? 'p-2' : ''} ${
                        isPending ? 'opacity-70' : ''
                      }`}
                    >
                      {/* Pending indicator */}
                      {isPending && (
                        <div className="absolute -top-2 -right-2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      
                      {message.type === 'text' ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : message.type === 'image' ? (
                        <div className="space-y-2">
                          <img
                            src={message.media_url!}
                            alt="Shared image"
                            className="rounded-lg max-w-full h-auto max-h-64 object-cover"
                            loading="lazy"
                          />
                          {message.content && (
                            <p className="text-sm">{message.content}</p>
                          )}
                        </div>
                      ) : message.type === 'video' ? (
                        <div className="space-y-2">
                          <video
                            src={message.media_url!}
                            controls
                            className="rounded-lg max-w-full h-auto max-h-64"
                          />
                          {message.content && (
                            <p className="text-sm">{message.content}</p>
                          )}
                        </div>
                      ) : message.type === 'audio' ? (
                        <div className="space-y-2">
                          <audio
                            src={message.media_url!}
                            controls
                            className="w-full"
                          />
                          {message.content && (
                            <p className="text-sm">{message.content}</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 px-1">
                      {/* Timestamp */}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        {isTemp ? (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          formatTimeAgo(message.created_at)
                        )}
                      </span>
                      
                      {/* Read status */}
                      {isOwn && !isTemp && (
                        <span className="text-xs">
                          {message.is_read ? (
                            <CheckCheck className="w-3 h-3 text-blue-500" />
                          ) : (
                            <Check className="w-3 h-3 text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Media Options Modal */}
      {showMediaOptions && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 mb-16"> {/* Add mb-16 here */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Share Media</h3>
              <button
                onClick={() => setShowMediaOptions(false)}
                className="p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-2">
                  <ImageIcon className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Gallery</span>
              </button>
              
              <button
                onClick={() => {/* Open camera */}}
                className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-2">
                  <Camera className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Camera</span>
              </button>
              
              <button
                onClick={() => {/* Open files */}}
                className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-2">
                  <Paperclip className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*"
        className="hidden"
      />

      {/* Fixed Message Input */}
      <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <form onSubmit={handleSendMessage} className="p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMediaOptions(true)}
              disabled={uploading}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>
            
            <div className="flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full p-3 px-4 bg-gray-100 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={sending || uploading}
              />
            </div>
            
            {newMessage.trim() ? (
              <button
                type="submit"
                disabled={sending || uploading}
                className="p-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 min-w-[44px] flex items-center justify-center"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;