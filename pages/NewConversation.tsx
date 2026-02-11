import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, User, UserCheck, UserPlus, Store, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { messagingService } from '../services/supabase/messaging';
import VerifiedBadge from '../components/VerifiedBadge';
import { ConnectionUser } from '../types/messaging';

/**
 * Interface for User Profile data structure
 */
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  user_status: 'verified' | 'member';
  is_connected: boolean;
  connection_status?: 'pending' | 'connected' | 'rejected';
}

/**
 * NewConversation Component with User Status Restrictions
 */
const NewConversation: React.FC = () => {
  const navigate = useNavigate();
  
  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'connections' | 'discover'>('connections');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserStatus, setCurrentUserStatus] = useState<'verified' | 'member' | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

  // Get current user ID and status on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setCurrentUserId(user.id);
        
        // Get user status from our new messaging service
        try {
          const status = await messagingService.getUserStatus();
          setCurrentUserStatus(status);
          setIsCheckingStatus(false);
          
          // Load connections if verified
          if (status === 'verified') {
            loadConnections();
          }
        } catch (error) {
          console.error('Error getting user status:', error);
          setIsCheckingStatus(false);
        }
      } else {
        setIsCheckingStatus(false);
      }
    };
    getCurrentUser();
  }, []);

  // Load connections using our new service
  const loadConnections = async () => {
    try {
      setLoading(true);
      
      // Use our new messaging service to get connected verified users
      const connectedUsers = await messagingService.getConnectedVerifiedUsers();
      
      // Transform to UserProfile format
      const connectionProfiles: UserProfile[] = connectedUsers.map(user => ({
        id: user.id,
        first_name: user.username.split(' ')[0] || '', // Extract first name
        last_name: user.username.split(' ').slice(1).join(' ') || '', // Extract last name
        avatar_url: user.avatar_url || null,
        user_status: 'verified' as const,
        is_connected: true,
        connection_status: 'connected' as const
      }));

      setConnections(connectionProfiles);
      
      // Show connections by default in connections tab
      if (activeTab === 'connections') {
        setUsers(connectionProfiles);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search users when query changes in discover tab
  useEffect(() => {
    if (searchQuery.trim() && activeTab === 'discover' && currentUserId && currentUserStatus === 'verified') {
      const debounceTimeout = setTimeout(() => {
        searchUsers();
      }, 300);

      return () => clearTimeout(debounceTimeout);
    } else if (activeTab === 'discover' && !searchQuery.trim()) {
      setSearchResults([]);
      setUsers([]);
    }
  }, [searchQuery, activeTab, currentUserId, currentUserStatus]);

  /**
   * Search users by name (verified users only)
   */
  const searchUsers = async () => {
    if (!currentUserId || !searchQuery.trim() || currentUserStatus !== 'verified') return;

    try {
      setLoading(true);
      
      // Search only verified profiles by first_name or last_name
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, user_status')
        .neq('id', currentUserId)
        .eq('user_status', 'verified') // Only show verified users
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .order('first_name')
        .limit(20);

      if (error) throw error;

      // Check connection status for each user
      const usersWithStatus = await Promise.all(
        (data || []).map(async (profile) => {
          try {
            // Use our new service to check connection
            const isConnected = await messagingService.areUsersConnected(currentUserId, profile.id);
            
            return {
              id: profile.id,
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              avatar_url: profile.avatar_url,
              user_status: profile.user_status as 'verified' | 'member',
              is_connected: isConnected,
              connection_status: isConnected ? 'connected' : undefined
            };
          } catch (err) {
            console.error('Error checking connection status:', err);
            return {
              id: profile.id,
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              avatar_url: profile.avatar_url,
              user_status: profile.user_status as 'verified' | 'member',
              is_connected: false,
              connection_status: undefined
            };
          }
        })
      );

      // Filter to show only verified users
      const verifiedUsers = usersWithStatus.filter(user => user.user_status === 'verified');
      setSearchResults(verifiedUsers);
      setUsers(verifiedUsers);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start a conversation with a connected user
   */
  const handleStartConversation = async (userId: string) => {
    try {
      // Get the user profile for navigation state
      const userProfile = users.find(u => u.id === userId);
      
      // Validate connection chat using our new service
      const validation = await messagingService.canStartConnectionChat(userId);
      if (!validation.canStart) {
        alert(validation.reason || 'Cannot start connection conversation');
        return;
      }

      // Get or create connection conversation using our new service
      const conversationId = await messagingService.getOrCreateConversation(userId, 'connection');
      
      // Navigate to conversation
      navigate(`/messages/${conversationId}`, {
        state: {
          otherUser: {
            id: userProfile?.id,
            name: `${userProfile?.first_name} ${userProfile?.last_name}`.trim(),
            avatar_url: userProfile?.avatar_url,
            status: userProfile?.user_status
          },
          context: 'connection'
        }
      });
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      if (error.message?.includes('verified') || error.message?.includes('connected')) {
        alert(error.message);
      } else {
        alert('Failed to start conversation. Please try again.');
      }
    }
  };

  /**
   * Send connection request to a user
   */
  const handleSendConnectionRequest = async (userId: string) => {
    if (!currentUserId || currentUserStatus !== 'verified') return;

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          user_id: currentUserId,
          connected_user_id: userId,
          status: 'pending'
        });

      if (error) {
        // Handle duplicate connection request
        if (error.code === '23505') {
          alert('Connection request already sent');
          return;
        }
        throw error;
      }

      // Refresh the user list to update connection status
      if (activeTab === 'discover') {
        searchUsers();
      } else {
        loadConnections();
      }
    } catch (error: any) {
      console.error('Error sending connection request:', error);
      alert(error.message || 'Failed to send connection request');
    }
  };

  /**
   * Get user's full name
   */
  const getUserFullName = (user: UserProfile): string => {
    return `${user.first_name} ${user.last_name}`.trim() || 'User';
  };

  /**
   * Get user's initials for avatar fallback
   */
  const getUserInitials = (user: UserProfile): string => {
    const first = user.first_name?.charAt(0) || '';
    const last = user.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (tab: 'connections' | 'discover') => {
    if (currentUserStatus !== 'verified') {
      alert('This feature is only available for verified members. Contact support for an upgrade.');
      return;
    }
    
    setActiveTab(tab);
    if (tab === 'connections') {
      setUsers(connections);
      setSearchQuery('');
    } else {
      setUsers(searchResults);
    }
  };

  /**
   * Render restriction message for member users
   */
  const renderRestrictionMessage = () => {
    return (
      <div className="p-6 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-blue-200">
          <AlertCircle className="w-10 h-10 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-blue-900 mb-3">Verified Members Feature</h3>
        <p className="text-blue-700 mb-6 max-w-md mx-auto">
          Connect and chat with other verified members. Upgrade your account to access connection features.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-medium px-6 py-3 rounded-xl hover:shadow-lg transition-all border border-orange-800"
          >
            <Store className="w-5 h-5" />
            Browse Marketplace
          </button>
          <button
            onClick={() => window.open('mailto:gkbc.1000@gmail.com', '_blank')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium px-6 py-3 rounded-xl hover:shadow-lg transition-all border border-blue-800"
          >
            Contact Support for Upgrade
          </button>
        </div>
      </div>
    );
  };

  /**
   * Loading State Component
   */
  if (isCheckingStatus || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white safe-area">
        {/* Loading Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-10 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>

        {/* Loading Tabs */}
        <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex">
            {[1, 2].map(i => (
              <div key={i} className="flex-1 py-4">
                <div className="h-4 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Loading Users */}
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full border border-gray-300"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2 border border-gray-300"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 border border-gray-300"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If user is not verified, show restriction message
  if (currentUserStatus !== 'verified') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white safe-area">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-10 p-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] border border-gray-200"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Start a Conversation</h1>
          </div>
        </div>
        
        {/* Restriction Message */}
        {renderRestrictionMessage()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white safe-area">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-10 p-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] border border-gray-200"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">Start a Conversation</h1>
            <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm">
              Verified
            </span>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'connections' ? "Search verified members..." : "Search verified users..."}
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            disabled={currentUserStatus !== 'verified'}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex px-4">
          <button
            onClick={() => handleTabChange('connections')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition-all ${
              activeTab === 'connections'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            aria-label="View verified connections"
            disabled={currentUserStatus !== 'verified'}
          >
            <UserCheck className="w-4 h-4" />
            <span className="font-medium">Network</span>
            {connections.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {connections.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => handleTabChange('discover')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition-all ${
              activeTab === 'discover'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Discover verified users"
            disabled={currentUserStatus !== 'verified'}
          >
            <User className="w-4 h-4" />
            <span className="font-medium">Finder</span>
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full border border-gray-300"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2 border border-gray-300"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 border border-gray-300"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-300">
              {activeTab === 'connections' ? (
                <UserCheck className="w-8 h-8 text-gray-400" />
              ) : (
                <Search className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {activeTab === 'connections' ? 'No verified connections yet' : 'No verified users found'}
            </h3>
            <p className="text-gray-600 text-sm">
              {activeTab === 'connections'
                ? 'Connect with verified members to start chatting'
                : searchQuery
                  ? 'Try a different search term'
                  : 'Search for verified users to connect with'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-2xl p-4 hover:shadow-md transition-all duration-200 border-2 border-gray-200 hover:border-blue-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 border border-blue-300">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={getUserFullName(user)}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                            {getUserInitials(user)}
                          </div>
                        )}
                      </div>
                      {/* Verification Badge */}
                      <div className="absolute -bottom-1 -right-1">
                        <VerifiedBadge size={12} />
                      </div>
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 truncate">
                          {getUserFullName(user)}
                        </h3>
                        <VerifiedBadge size={12} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          user.is_connected
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : user.connection_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {user.is_connected 
                            ? 'Connected' 
                            : user.connection_status === 'pending' 
                            ? 'Request Pending' 
                            : 'Not Connected'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="flex-shrink-0 pl-3">
                    {user.is_connected ? (
                      <button
                        onClick={() => handleStartConversation(user.id)}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all min-h-[44px] min-w-[44px] border border-blue-800"
                        aria-label={`Message ${getUserFullName(user)}`}
                      >
                        Message
                      </button>
                    ) : user.connection_status === 'pending' ? (
                      <button
                        disabled
                        className="px-4 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-xl border border-gray-300 min-h-[44px] min-w-[44px]"
                        aria-label="Connection request pending"
                      >
                        Pending
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendConnectionRequest(user.id)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-medium rounded-xl hover:from-gray-200 hover:to-gray-300 active:scale-[0.98] transition-all min-h-[44px] min-w-[44px] border border-gray-300"
                        aria-label={`Connect with ${getUserFullName(user)}`}
                      >
                        <UserPlus className="w-4 h-4" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State for Discover Tab */}
      {activeTab === 'discover' && !loading && users.length === 0 && !searchQuery && (
        <div className="px-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center border-2 border-blue-200">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-700">
              <User className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-blue-900 mb-2">Discover Verified Members</h3>
            <p className="text-blue-700 text-sm mb-4">
              Search for verified members by name to connect and start conversations
            </p>
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Search className="w-4 h-4" />
              <span className="text-sm font-medium">Start typing in the search bar above</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewConversation;