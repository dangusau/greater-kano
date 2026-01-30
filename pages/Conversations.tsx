import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, MessageCircle, Check, CheckCheck, 
  Store, Users, Plus,
  ShoppingBag, RefreshCw, Bell,
  User, Clock, AlertCircle
} from 'lucide-react';
import { messagingService } from '../services/supabase/messaging';
import { Conversation } from '../types/messaging';
import { formatTimeAgo } from '../utils/formatters';
import { supabase } from '../services/supabase/client';
import VerifiedBadge from '../components/VerifiedBadge';

// Cache keys
const CACHE_KEYS = {
  CONVERSATIONS: 'chat_conversations_cache',
  LAST_UPDATED: 'chat_conversations_last_updated',
  USER_STATUS: 'user_status_cache'
};

/**
 * ConversationsList Component with Caching and User Status Restrictions
 */
const ConversationsList: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'marketplace'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [newMessageIndicator, setNewMessageIndicator] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<'verified' | 'member' | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  
  // Refs for state management
  const conversationsRef = useRef<Conversation[]>([]);
  const isMounted = useRef(true);
  const realtimeCleanupRef = useRef<() => void>(() => {});
  const safetyTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Get current user status
   */
  const getUserStatus = async (): Promise<'verified' | 'member'> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_status')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      return data.user_status as 'verified' | 'member';
    } catch (error) {
      console.error('Error getting user status:', error);
      return 'member';
    }
  };

  /**
   * Load conversations from cache
   */
  const loadFromCache = (): Conversation[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEYS.CONVERSATIONS);
      const cachedTimestamp = localStorage.getItem(CACHE_KEYS.LAST_UPDATED);
      
      if (cached && cachedTimestamp) {
        const cacheAge = Date.now() - parseInt(cachedTimestamp);
        if (cacheAge < 2 * 60 * 1000) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return null;
  };

  /**
   * Save conversations to cache
   */
  const saveToCache = (data: Conversation[]) => {
    try {
      localStorage.setItem(CACHE_KEYS.CONVERSATIONS, JSON.stringify(data));
      localStorage.setItem(CACHE_KEYS.LAST_UPDATED, Date.now().toString());
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  /**
   * Initialize component
   */
  useEffect(() => {
    isMounted.current = true;
    
    const initialize = async () => {
      try {
        // Get user status
        const status = await getUserStatus();
        if (!isMounted.current) return;
        
        setUserStatus(status);
        setIsCheckingStatus(false);
        
        // Show cached data immediately
        const cachedData = loadFromCache();
        if (cachedData && isMounted.current) {
          setConversations(cachedData);
          conversationsRef.current = cachedData;
          setInitialLoading(false);
        }
        
        // Fetch fresh data in background
        loadConversationsFromServer(status, true);
        
        // Setup real-time for verified users
        if (status === 'verified') {
          setupRealtime();
        }
        
      } catch (error) {
        console.error('Error initializing:', error);
        if (isMounted.current) {
          setIsCheckingStatus(false);
          setInitialLoading(false);
        }
      }
    };
    
    initialize();
    
    // Safety timeout - never show loading for more than 2 seconds
    safetyTimeoutRef.current = setTimeout(() => {
      if (isMounted.current && initialLoading) {
        console.warn('Safety timeout - showing UI');
        setInitialLoading(false);
      }
    }, 2000);
    
    return () => {
      isMounted.current = false;
      realtimeCleanupRef.current();
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Filter conversations
   */
  useEffect(() => {
    const filtered = conversations.filter(conv => {
      // Filter by active tab
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'friends' && conv.context === 'connection') ||
        (activeTab === 'marketplace' && conv.context === 'marketplace');
      
      // Filter by search query
      const matchesSearch = searchQuery === '' ||
        conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.listing_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // For member users, only show marketplace conversations
      if (userStatus === 'member' && conv.context !== 'marketplace') {
        return false;
      }
      
      return matchesTab && matchesSearch;
    });
    
    setFilteredConversations(filtered);
  }, [conversations, searchQuery, activeTab, userStatus]);

  /**
   * Load conversations from server
   */
  const loadConversationsFromServer = async (status: 'verified' | 'member', silent: boolean = false) => {
    if (!silent) {
      setBackgroundLoading(true);
    }
    
    try {
      // For member users, only load marketplace conversations
      const context = status === 'member' ? 'marketplace' : undefined;
      const data = await messagingService.getConversations(context);
      
      if (isMounted.current) {
        // Check for new unread messages
        const oldUnreadTotal = conversationsRef.current.reduce((sum, conv) => sum + conv.unread_count, 0);
        const newUnreadTotal = data.reduce((sum, conv) => sum + conv.unread_count, 0);
        
        // Show notification indicator for new messages
        if (newUnreadTotal > oldUnreadTotal) {
          setNewMessageIndicator('New messages');
          setTimeout(() => setNewMessageIndicator(null), 3000);
        }
        
        // Update conversations state
        setConversations(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data)) {
            conversationsRef.current = data;
            saveToCache(data);
            return data;
          }
          return prev;
        });
        
        setLastUpdated(new Date());
        
        // Always ensure loading is false
        if (initialLoading) {
          setInitialLoading(false);
        }
      }
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      if (isMounted.current && !silent) {
        setBackgroundLoading(false);
      }
      if (isMounted.current && initialLoading) {
        setInitialLoading(false);
      }
    }
  };

  /**
   * Setup real-time subscription
   */
  const setupRealtime = () => {
    if (userStatus !== 'verified') return;
    
    setRealtimeStatus('connecting');
    
    const cleanup = messagingService.subscribeToConversations(() => {
      if (isMounted.current) {
        setRealtimeStatus('connected');
        if (userStatus) {
          loadConversationsFromServer(userStatus, true);
        }
      }
    });
    
    realtimeCleanupRef.current = cleanup;
    
    setTimeout(() => {
      if (isMounted.current && realtimeStatus === 'connecting') {
        setRealtimeStatus('disconnected');
        
        const pollInterval = setInterval(() => {
          if (isMounted.current && userStatus) {
            loadConversationsFromServer(userStatus, true);
          }
        }, 15000);
        
        realtimeCleanupRef.current = () => {
          cleanup();
          clearInterval(pollInterval);
        };
      }
    }, 3000);
    
    return cleanup;
  };

  /**
   * Handle manual refresh
   */
  const handleManualRefresh = () => {
    if (userStatus) {
      loadConversationsFromServer(userStatus, false);
    }
  };

  /**
   * Calculate unread counts
   */
  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
  }, [conversations]);

  const friendsUnread = useMemo(() => {
    return conversations
      .filter(conv => conv.context === 'connection' && conv.other_user_status === 'verified')
      .reduce((sum, conv) => sum + conv.unread_count, 0);
  }, [conversations]);

  const marketplaceUnread = useMemo(() => {
    return conversations
      .filter(conv => conv.context === 'marketplace')
      .reduce((sum, conv) => sum + conv.unread_count, 0);
  }, [conversations]);

  /**
   * Navigate to new conversation
   */
  const handleStartNewConversation = () => {
    if (userStatus === 'member') {
      navigate('/marketplace');
    } else {
      navigate('/messages/new');
    }
  };

  /**
   * Handle profile click
   */
  const handleUserProfileClick = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  /**
   * Render restriction message
   */
  const renderRestrictionMessage = () => {
    if (userStatus === 'member' && activeTab === 'friends') {
      return (
        <div className="mx-4 my-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-300">
            <AlertCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-blue-900 mb-2">Verified Members Feature</h3>
          <p className="text-blue-700 mb-4">
            Connect and chat with other verified members. Upgrade your account to access this feature.
          </p>
          <button
            onClick={() => window.open('mailto:support@example.com', '_blank')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium px-6 py-3 rounded-xl hover:shadow-lg transition-all border border-blue-800"
          >
            Contact Support for Upgrade
          </button>
        </div>
      );
    }
    return null;
  };

  /**
   * Loading State
   */
  if (initialLoading || isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Simple loading skeleton */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-6 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="border-b border-gray-200 bg-white px-4">
          <div className="flex space-x-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="py-3">
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white safe-area">
      {/* New Message Notification */}
      {newMessageIndicator && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-down">
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-full shadow-lg border border-blue-500/30">
            <Bell className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">{newMessageIndicator}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="sticky top-0 bg-white border-b border-blue-200 z-10 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            {totalUnread > 0 && (
              <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                {totalUnread}
              </span>
            )}
            {userStatus === 'member' && (
              <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                Member
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {userStatus === 'verified' && (
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  realtimeStatus === 'connected' ? 'bg-green-500' :
                  realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`} />
                <span className="text-xs text-gray-500 hidden sm:block">
                  {realtimeStatus === 'connected' ? 'Connected' : 
                   realtimeStatus === 'connecting' ? 'Connecting' : 'Offline'}
                </span>
              </div>
            )}
            
            <button
              onClick={handleManualRefresh}
              disabled={backgroundLoading}
              className="w-10 h-10 flex items-center justify-center bg-white border border-blue-200 rounded-xl hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50"
              title="Refresh conversations"
            >
              <RefreshCw className={`w-5 h-5 text-blue-600 ${backgroundLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleStartNewConversation}
              className="w-10 h-10 flex items-center justify-center bg-white border border-blue-200 rounded-xl hover:bg-blue-50 active:scale-95 transition-all"
              title={userStatus === 'member' ? 'Browse Marketplace' : 'New conversation'}
            >
              <Plus className="w-5 h-5 text-blue-600" />
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-[124px] bg-white border-b border-blue-200 z-10 shadow-sm">
        <div className="flex px-4 space-x-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-blue-500'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium">All</span>
            {totalUnread > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-medium px-1.5 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </button>
          
          {userStatus === 'verified' && (
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-2 py-3 border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'friends'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-blue-500'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">Verified</span>
              {friendsUnread > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {friendsUnread}
                </span>
              )}
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex items-center gap-2 py-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'marketplace'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-blue-500'
            }`}
          >
            <Store className="w-4 h-4" />
            <span className="font-medium">Marketplace</span>
            {marketplaceUnread > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-medium px-1.5 py-0.5 rounded-full">
                {marketplaceUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conversations List or Restriction Message */}
      {userStatus === 'member' && activeTab === 'friends' ? (
        renderRestrictionMessage()
      ) : (
        <div className="p-3">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                {activeTab === 'marketplace' ? (
                  <Store className="w-8 h-8 text-blue-400" />
                ) : activeTab === 'friends' ? (
                  <Users className="w-8 h-8 text-blue-400" />
                ) : (
                  <MessageCircle className="w-8 h-8 text-blue-400" />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {searchQuery ? 'No matches found' : 'No conversations yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery 
                  ? 'Try a different search term'
                  : activeTab === 'marketplace'
                    ? 'Start a conversation about a product'
                    : 'Connect with verified members to start chatting'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleStartNewConversation}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all border border-blue-500"
                >
                  <Plus className="w-4 h-4" />
                  {userStatus === 'member' ? 'Browse Marketplace' : 'Start a conversation'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConversations.map((conversation) => (
                <Link
                  key={conversation.conversation_id}
                  to={`/messages/${conversation.conversation_id}`}
                  state={{ 
                    otherUser: {
                      id: conversation.other_user_id,
                      name: conversation.other_user_name,
                      avatar: conversation.other_user_avatar,
                      status: conversation.other_user_status
                    },
                    context: conversation.context,
                    listing: conversation.listing_id ? {
                      id: conversation.listing_id,
                      title: conversation.listing_title,
                      price: conversation.listing_price
                    } : null
                  }}
                  className="block bg-white rounded-2xl p-4 hover:shadow-lg transition-all duration-200 border border-blue-100 active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3">
                    {/* User Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 border border-blue-300">
                        {conversation.other_user_avatar ? (
                          <img
                            src={conversation.other_user_avatar}
                            alt={conversation.other_user_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center">
                                    <User class="w-6 h-6 text-white" />
                                  </div>
                                `;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Verification Badge */}
                      {conversation.other_user_status === 'verified' && (
                        <div className="absolute -bottom-1 -right-1">
                          <VerifiedBadge size={12} />
                        </div>
                      )}
                      
                      {/* Unread Message Indicator */}
                      {conversation.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Conversation Content */}
                    <div className="flex-1 min-w-0">
                      {/* First Row: Name and Context */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-1">
                        <div className="flex items-center gap-2">
                          <h3 
                            onClick={(e) => handleUserProfileClick(e, conversation.other_user_id)}
                            className="font-bold text-gray-900 truncate hover:text-blue-600 transition-colors cursor-pointer text-base flex items-center gap-1"
                          >
                            {conversation.other_user_name}
                            {conversation.other_user_status === 'verified' && (
                              <VerifiedBadge size={12} />
                            )}
                          </h3>
                          
                          {/* Context Badge */}
                          {conversation.context === 'marketplace' && (
                            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full border border-orange-200">
                              <ShoppingBag className="w-3 h-3" />
                              <span>Product</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Second Row: Product Title */}
                      {conversation.context === 'marketplace' && conversation.listing_title && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-800 font-medium truncate">
                            {conversation.listing_title}
                          </p>
                          {conversation.listing_price && (
                            <p className="text-sm font-bold text-green-600">
                              ₦{conversation.listing_price.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Third Row: Last Message and Status */}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <p className="text-sm text-gray-600 truncate flex-1">
                          {conversation.last_message || 'Start a conversation...'}
                        </p>
                        
                        {/* Read Status Indicators */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {conversation.unread_count > 0 ? (
                            <Check className="w-4 h-4 text-blue-500" />
                          ) : conversation.last_message ? (
                            <CheckCheck className="w-4 h-4 text-gray-400" />
                          ) : null}
                        </div>
                      </div>

                      {/* Fourth Row: Timestamp */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-50">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(conversation.last_message_at)}</span>
                        </div>
                        
                        {/* Unread count badge */}
                        {conversation.unread_count > 0 && (
                          <span className="text-xs font-medium text-blue-600">
                            {conversation.unread_count} new
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Background Loading Indicator */}
      {backgroundLoading && (
        <div className="fixed bottom-24 right-4 z-30">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg border border-blue-200">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-blue-600 font-medium">Updating...</span>
          </div>
        </div>
      )}

      {/* New Conversation FAB */}
      <button
        onClick={handleStartNewConversation}
        className="fixed bottom-24 right-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 z-20 border border-blue-500"
        aria-label={userStatus === 'member' ? 'Browse Marketplace' : 'Start new conversation'}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes slide-in-down {
          from {
            transform: translateY(-100%) translateX(-50%);
            opacity: 0;
          }
          to {
            transform: translateY(0) translateX(-50%);
            opacity: 1;
          }
        }
        .animate-slide-in-down {
          animation: slide-in-down 0.3s ease-out;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ConversationsList;