import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Send, Image as ImageIcon, Mic, MoreVertical,
  Paperclip, Camera, X, ShoppingBag, ExternalLink,
  Check, CheckCheck, AlertCircle, Clock, FileText, Video, Music
} from 'lucide-react';
import { messagingService } from '../services/supabase/messaging';
import { supabase } from '../services/supabase';
import { Message, MessageType, ConversationContext } from '../types/messaging';
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

// File preview modal component
const FilePreviewModal: React.FC<{
  file: File;
  onSend: () => void;
  onCancel: () => void;
  isUploading: boolean;
}> = ({ file, onSend, onCancel, isUploading }) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  useEffect(() => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);
  
  const getFileIcon = () => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-12 h-12 text-blue-500" />;
    if (file.type.startsWith('video/')) return <Video className="w-12 h-12 text-purple-500" />;
    if (file.type.startsWith('audio/')) return <Music className="w-12 h-12 text-green-500" />;
    return <FileText className="w-12 h-12 text-gray-500" />;
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Preview File</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-xl"
            disabled={isUploading}
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0">
              {previewUrl && file.type.startsWith('image/') ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                  {getFileIcon()}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(file.size)} • {file.type}</p>
            </div>
          </div>
          
          {previewUrl && file.type.startsWith('video/') && (
            <div className="mb-4">
              <video
                src={previewUrl}
                controls
                className="w-full rounded-lg"
              />
            </div>
          )}
          
          {previewUrl && file.type.startsWith('audio/') && (
            <div className="mb-4">
              <audio
                src={previewUrl}
                controls
                className="w-full"
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={isUploading}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              disabled={isUploading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send File
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [conversationContext, setConversationContext] = useState<ConversationContext>('connection');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  
  const otherUser = location.state?.otherUser || {
    id: '',
    name: 'Unknown User',
    avatar: '',
    status: 'member'
  };
  
  // Get context from location state or determine from conversation
  const initialContext = location.state?.context as ConversationContext || 'connection';
  const listing = location.state?.listing || null;

  // Sort messages in ascending order (oldest first, newest last)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

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
    if (sortedMessages.length > 0 && initialLoadComplete) {
      scrollToBottom();
    }
  }, [sortedMessages, initialLoadComplete, scrollToBottom]);

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
        
        // Check if we should send pre-filled marketplace message
        const shouldSendPrefilled = location.state?.sendPrefilledMessage || false;
        const prefilledListing = location.state?.prefilledListing;
        
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
                // Sort cached messages ascending
                const sortedCachedMessages = parsedMessages.sort((a: Message, b: Message) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                setMessages(sortedCachedMessages);
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
        const freshMessages = await messagingService.getConversationMessages(conversationId);
        
        if (isMounted) {
          // Sort messages in ascending order
          const sortedFreshMessages = freshMessages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Merge with cached messages (prefer fresh data)
          setMessages(sortedFreshMessages);
          setLoading(false);
          setInitialLoadComplete(true);
          
          // Determine conversation context from messages
          if (freshMessages.length > 0) {
            // Check if any message has a listing_id (marketplace context)
            const hasListingMessages = freshMessages.some(msg => msg.listing_id);
            setConversationContext(hasListingMessages ? 'marketplace' : 'connection');
          } else {
            setConversationContext(initialContext);
          }
          
          scrollToBottom();
          
          // Send pre-filled marketplace message if needed
          if (shouldSendPrefilled && prefilledListing && freshMessages.length === 0) {
            setTimeout(() => {
              sendPrefilledMarketplaceMessage(prefilledListing);
            }, 500);
          }
          
          // Cache the fresh messages (already sorted)
          try {
            localStorage.setItem(cacheKey, JSON.stringify(sortedFreshMessages));
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
              // Add the new message (maintaining ascending order)
              setMessages(prev => {
                // Check if message already exists (avoid duplicates)
                const exists = prev.some(msg => msg.id === newMessage.id);
                if (exists) return prev;
                
                const updated = [...prev, newMessage].sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                
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
              
              // Update context if this is a marketplace message
              if (newMessage.listing_id) {
                setConversationContext('marketplace');
              }
              
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
                ).sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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
  }, [conversationId, currentUserId, isNearBottom, scrollToBottom, location.state]);

  // Send pre-filled marketplace message
  const sendPrefilledMarketplaceMessage = async (listingData: any) => {
    if (!conversationId || !listingData) return;
    
    try {
      const content = `Hi, I'm interested in your listing "${listingData.title}". Is it still available?`;
      
      await messagingService.sendMessage(
        conversationId,
        content,
        'text',
        listingData.id
      );
      
      // Clear the prefilled flag from location state
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, sendPrefilledMessage: false }
      });
      
    } catch (error) {
      console.error('Error sending pre-filled message:', error);
    }
  };

  // Optimistic send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || sending) return;

    const messageContent = newMessage.trim();
    const tempId = generateTempId();
    
    // Determine if this is a marketplace message
    const listingId = conversationContext === 'marketplace' && listing?.id ? listing.id : undefined;
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      sender_name: 'You',
      sender_avatar: '',
      type: 'text',
      content: messageContent,
      listing_id: listingId,
      listing_title: listing?.title,
      media_url: undefined,
      is_read: false,
      created_at: new Date().toISOString()
    };

    try {
      setSending(true);
      setNewMessage('');
      
      // Add to pending messages
      setPendingMessages(prev => new Set([...prev, tempId]));
      
      // Add optimistic message immediately (maintaining order)
      setMessages(prev => {
        const updated = [...prev, optimisticMessage].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
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
      
      // Send actual message using new service
      const messageId = await messagingService.sendMessage(
        conversationId,
        messageContent,
        'text',
        listingId
      );
      
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
        ).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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
      setMessages(prev => prev.filter(msg => msg.id !== tempId).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
      
      // Show error toast
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Handle file selection - show preview modal
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowFilePreview(true);
      setShowMediaOptions(false); // Close media options modal
    }
    event.target.value = '';
  };

  // Send media file after preview confirmation
  const handleSendFile = async () => {
    if (!selectedFile || !conversationId || uploading) return;
    
    const tempId = generateTempId();
    const listingId = conversationContext === 'marketplace' && listing?.id ? listing.id : undefined;
    
    try {
      setUploading(true);
      
      // Create optimistic message for media
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_name: 'You',
        sender_avatar: '',
        type: selectedFile.type.startsWith('image/') ? 'image' : 
              selectedFile.type.startsWith('video/') ? 'video' : 'audio',
        content: selectedFile.name,
        listing_id: listingId,
        listing_title: listing?.title,
        media_url: URL.createObjectURL(selectedFile), // Temp URL for preview
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      // Add to pending
      setPendingMessages(prev => new Set([...prev, tempId]));
      
      // Add optimistic message (maintaining order)
      setMessages(prev => {
        const updated = [...prev, optimisticMessage].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return updated;
      });
      
      scrollToBottom();
      
      // Upload and send using new service
      await messagingService.sendMessage(
        conversationId,
        selectedFile.name,
        optimisticMessage.type as MessageType,
        listingId,
        selectedFile
      );
      
      // Remove from pending
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      
      // Close preview modal and clear selected file
      setShowFilePreview(false);
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Error uploading media:', error);
      
      // Remove from pending
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      
      // Remove optimistic message
      setMessages(prev => prev.filter(msg => msg.id !== tempId).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
      
      // Close preview modal
      setShowFilePreview(false);
      setSelectedFile(null);
      
      alert('Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Cancel file preview
  const handleCancelFile = () => {
    setShowFilePreview(false);
    setSelectedFile(null);
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
                <ArrowLeft className="w-6 h-5 text-blue-600" />
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
                      onError={(e) => {
                        // Fallback if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                            ${otherUser.name?.charAt(0).toUpperCase()}
                          </div>
                        `;
                      }}
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
                      {conversationContext === 'marketplace' ? 'Marketplace conversation' : ''}
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
            
              {/* Member status indicator */}
              {currentUserStatus === 'member' && (
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full border border-amber-200">
                  Member
                </span>
              )}
            </div>
          </div>
        </div>
        
        {conversationContext === 'marketplace' && listing && (
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm">{listing.title}</p>
                
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {sortedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">No messages yet</h3>
            <p className="text-gray-600 text-center max-w-md">
              {conversationContext === 'marketplace' && listing
                ? `Start the conversation about ${listing.title}`
                : 'Send a message to start the conversation'}
            </p>
            
            {/* Member restrictions warning */}
            {currentUserStatus === 'member' && conversationContext === 'connection' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl border-2 border-amber-200 text-center max-w-md">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <p className="text-amber-700 font-medium">Member Account</p>
                </div>
                <p className="text-amber-600 text-sm">
                  You're chatting with a verified user. Upgrade to verified status for full access to all features.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMessages.map((message) => {
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
                      
                      {/* Show listing title for marketplace messages */}
                      {message.listing_title && !isOwn && (
                        <div className="mb-2 pb-2 border-b border-white/20">
                          <p className="text-sm font-small opacity-90">Re: {message.listing_title}</p>
                        </div>
                      )}
                      
                      {message.type === 'text' ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : message.type === 'image' ? (
                        <div className="space-y-2">
                          <div className="rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={message.media_url!}
                              alt="Shared image"
                              className="max-w-full h-auto max-h-64 object-cover w-full"
                              loading="lazy"
                              onError={(e) => {
                                // Fallback for broken images
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = `
                                  <div class="w-full h-64 flex flex-col items-center justify-center text-gray-500">
                                    <ImageIcon class="w-12 h-12 mb-2" />
                                    <p class="text-sm">Image failed to load</p>
                                  </div>
                                `;
                              }}
                            />
                          </div>
                          {message.content && (
                            <p className="text-sm">{message.content}</p>
                          )}
                        </div>
                      ) : message.type === 'video' ? (
                        <div className="space-y-2">
                          <div className="rounded-lg overflow-hidden bg-gray-900">
                            <video
                              src={message.media_url!}
                              controls
                              className="max-w-full h-auto max-h-64 w-full"
                            />
                          </div>
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
                      {/* Sender name for others' messages */}
                      {!isOwn && message.sender_name && (
                        <span className="text-xs font-small text-gray-800">
                          {message.sender_name}
                        </span>
                      )}
                      
                      {/* Timestamp */}
                      <span className="text-xs text-gray-800 flex items-center gap-1">
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
                            <Check className="w-3 h-3 text-blue-400" />
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
          <div className="bg-white rounded-2xl w-full max-w-md p-4 mb-16">
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

      {/* File Preview Modal */}
      {showFilePreview && selectedFile && (
        <FilePreviewModal
          file={selectedFile}
          onSend={handleSendFile}
          onCancel={handleCancelFile}
          isUploading={uploading}
        />
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
                
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;