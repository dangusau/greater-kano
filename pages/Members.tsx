import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, UserPlus, Check, Clock, MapPin, Building, Map, Users, UserCheck, X, User } from 'lucide-react';
import { useConnections } from '../hooks/useConnections';
import { Member } from '../types/index';
import { formatTimeAgo } from '../utils/formatters';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../contexts/AuthContext';
import { appCache } from '../shared/services/UniversalCache';

// Cache types
interface MembersCacheData {
  data: Member[];
  timestamp: number;
  searchParams: {
    search: string;
    businessType: string;
    marketArea: string;
  };
}

const ALL_MEMBERS_CACHE_KEY = 'gkbc_all_members_cache_v2';
const CACHE_TTL = 5 * 60 * 1000;

const Members: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'connections'>('all');
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [marketArea, setMarketArea] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'connect' | 'accept' | 'reject' | 'withdraw';
    userId?: string;
    requestId?: string;
    userName: string;
    callback: () => Promise<void>;
  } | null>(null);

  const isComponentMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);
  const loadAttempted = useRef(false);

  const {
    receivedRequests,
    sentRequests,
    friends,
    loading: connectionsLoading,
    loadReceivedRequests,
    loadSentRequests,
    loadFriends,
    acceptRequest,
    rejectRequest,
    withdrawRequest,
    loadAllConnections,
    getMembers,
    sendConnectionRequest
  } = useConnections();

  const marketAreas = useMemo(() => [
    'Central / Old City', 'Sabon Gari / Kantin Kwari', 'Farm Center / Beirut',
    'France Road', 'Zoo Road', 'Zaria Road', 'Dawanau', 'Sharada / Challawa',
    'Hotoro', 'Gyadi-Gyadi / Tarauni', 'Jigawa Road', 'Mariri / Sheka',
    'Bompai', 'Transport (Kano Line / Sabon Gari Park)', 'Others'
  ], []);

  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setConnectionFeedback({ show: true, message, type });
    setTimeout(() => {
      setConnectionFeedback(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  const showConfirmation = useCallback((
    type: 'connect' | 'accept' | 'reject' | 'withdraw',
    userName: string,
    callback: () => Promise<void>,
    userId?: string,
    requestId?: string
  ) => {
    setConfirmAction({ type, userId, requestId, userName, callback });
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    
    try {
      await confirmAction.callback();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    } catch {
      showFeedback(`Failed to ${confirmAction.type} connection`, 'error');
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  }, [confirmAction, showFeedback]);

  const cancelConfirmAction = useCallback(() => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  }, []);

  const filterOutAdmins = useCallback((membersList: Member[]): Member[] => {
    return membersList.filter(member => member.role !== 'admin');
  }, []);

  const loadMembers = useCallback(async (reset = false, isBackgroundRefresh = false) => {
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      
      const currentPage = reset ? 0 : page;
      const searchParams = { search, businessType, marketArea };

      if (reset && currentPage === 0 && !isBackgroundRefresh) {
        const cached = await appCache.get<MembersCacheData>(ALL_MEMBERS_CACHE_KEY);
        
        if (cached && 
            cached.searchParams.search === searchParams.search &&
            cached.searchParams.businessType === searchParams.businessType &&
            cached.searchParams.marketArea === searchParams.marketArea) {
          
          const filteredData = filterOutAdmins(cached.data);
          setMembers(filteredData);
          setPage(1);
          setHasMore(filteredData.length === 20);
          setLoading(false);
          
          setTimeout(async () => {
            try {
              const freshData = await getMembers(search, businessType, marketArea, currentPage, 20);
              const filteredFreshData = filterOutAdmins(freshData);
              if (isComponentMounted.current) {
                setMembers(filteredFreshData);
                await appCache.set(ALL_MEMBERS_CACHE_KEY, {
                  data: filteredFreshData,
                  searchParams,
                  timestamp: Date.now()
                }, CACHE_TTL);
              }
            } catch {
            }
          }, 100);
          
          return;
        }
      }

      const data = await getMembers(search, businessType, marketArea, currentPage, 20);
      
      if (!isComponentMounted.current) return;

      const filteredData = filterOutAdmins(data);

      if (reset) {
        setMembers(filteredData);
        setPage(1);
        if (currentPage === 0) {
          await appCache.set(ALL_MEMBERS_CACHE_KEY, {
            data: filteredData,
            searchParams,
            timestamp: Date.now()
          }, CACHE_TTL);
        }
      } else {
        setMembers(prev => [...prev, ...filteredData]);
        setPage(prev => prev + 1);
      }

      setHasMore(data.length === 20);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      if (!isBackgroundRefresh) {
        showFeedback('Please try again', 'error');
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  }, [search, businessType, marketArea, page, filterOutAdmins, showFeedback]);

  const filterMembersByConnection = useCallback(() => {
    const filtered = members.filter(member => {
      const isFriend = friends.some(friend => friend.user_id === member.id);
      if (isFriend) return false;

      const isReceivedRequest = receivedRequests.some(req => req.sender_id === member.id);
      if (isReceivedRequest) return false;

      const isSentRequest = sentRequests.some(req => req.connected_user_id === member.id);
      if (isSentRequest) return false;

      return true;
    });

    setFilteredMembers(filtered);
  }, [members, friends, receivedRequests, sentRequests]);

  const handleProfileClick = useCallback((memberId: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    navigate(`/profile/${memberId}`);
  }, [navigate]);

  const handleConnect = useCallback(async (memberId: string, memberName: string) => {
    showConfirmation('connect', memberName, async () => {
      const optimisticMember = members.find(m => m.id === memberId);
      if (optimisticMember) {
        setFilteredMembers(prev => prev.filter(m => m.id !== memberId));
      }
      
      await sendConnectionRequest(memberId);
      await loadAllConnections();
      await appCache.remove(ALL_MEMBERS_CACHE_KEY);
      await loadMembers(true);
      showFeedback(`Connection request sent`, 'success');
    }, memberId);
  }, [members, showConfirmation, loadAllConnections, loadMembers, showFeedback]);

  const handleAcceptRequest = useCallback(async (requestId: string, senderName: string) => {
    showConfirmation('accept', senderName, async () => {
      const currentReceivedRequests = receivedRequests;
      const updatedRequests = currentReceivedRequests.filter(req => req.id !== requestId);
      
      await loadAllConnections();
      await appCache.remove(ALL_MEMBERS_CACHE_KEY);
      await acceptRequest(requestId);
      showFeedback(`Connected`, 'success');
    }, undefined, requestId);
  }, [showConfirmation, loadAllConnections, acceptRequest, showFeedback, receivedRequests]);

  const handleRejectRequest = useCallback(async (requestId: string, senderName: string) => {
    showConfirmation('reject', senderName, async () => {
      const currentReceivedRequests = receivedRequests;
      const updatedRequests = currentReceivedRequests.filter(req => req.id !== requestId);
      
      await loadAllConnections();
      await appCache.remove(ALL_MEMBERS_CACHE_KEY);
      await rejectRequest(requestId);
      showFeedback('Request rejected', 'success');
    }, undefined, requestId);
  }, [showConfirmation, loadAllConnections, rejectRequest, showFeedback, receivedRequests]);

  const handleWithdrawRequest = useCallback(async (requestId: string, userName: string) => {
    showConfirmation('withdraw', userName, async () => {
      const currentSentRequests = sentRequests;
      const updatedRequests = currentSentRequests.filter(req => req.id !== requestId);
      
      await loadAllConnections();
      await appCache.remove(ALL_MEMBERS_CACHE_KEY);
      await withdrawRequest(requestId);
      await loadMembers(true);
      showFeedback('Request withdrawn', 'success');
    }, undefined, requestId);
  }, [showConfirmation, loadAllConnections, loadMembers, withdrawRequest, showFeedback, sentRequests]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setBusinessType('');
    setMarketArea('');
    setShowFilters(false);
    appCache.remove(ALL_MEMBERS_CACHE_KEY);
    loadMembers(true);
  }, [loadMembers]);

  const getUserInitials = useCallback((firstName?: string, lastName?: string): string => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'U';
  }, []);

  const getConnectionButton = useCallback((member: Member) => {
    const isFriend = friends.some(friend => friend.user_id === member.id);
    if (isFriend) {
      return (
        <button
          onClick={() => navigate(`/profile/${member.id}`)}
          className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 border border-blue-300 min-h-[36px] w-full sm:w-auto"
          aria-label={`View profile of ${member.first_name} ${member.last_name}`}
        >
          <User size={14} />
          <span>View Profile</span>
        </button>
      );
    }

    const receivedRequest = receivedRequests.find(req => req.sender_id === member.id);
    if (receivedRequest) {
      return (
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleAcceptRequest(receivedRequest.id, `${member.first_name} ${member.last_name}`)}
            className="flex-1 sm:flex-none px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[36px] flex items-center justify-center"
            aria-label={`Accept connection from ${member.first_name} ${member.last_name}`}
          >
            Accept
          </button>
          <button
            onClick={() => handleRejectRequest(receivedRequest.id, `${member.first_name} ${member.last_name}`)}
            className="flex-1 sm:flex-none px-3 py-2 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 border border-red-300 min-h-[36px] flex items-center justify-center"
            aria-label={`Reject connection from ${member.first_name} ${member.last_name}`}
          >
            <X size={14} />
            <span className="hidden sm:inline ml-1">Reject</span>
          </button>
        </div>
      );
    }

    const sentRequest = sentRequests.find(req => req.connected_user_id === member.id);
    if (sentRequest) {
      return (
        <button 
          className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-300 min-h-[36px] w-full sm:w-auto"
          aria-label="Connection pending"
        >
          <Clock size={14} />
          <span>Pending</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => handleConnect(member.id, `${member.first_name} ${member.last_name}`)}
        className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 border border-blue-700 min-h-[36px] w-full sm:w-auto"
        aria-label={`Connect with ${member.first_name} ${member.last_name}`}
      >
        <UserPlus size={14} />
        <span>Connect</span>
      </button>
    );
  }, [friends, receivedRequests, sentRequests, navigate, handleAcceptRequest, handleRejectRequest, handleConnect]);

  useEffect(() => {
    filterMembersByConnection();
  }, [members, friends, receivedRequests, sentRequests, filterMembersByConnection]);

  useEffect(() => {
    isComponentMounted.current = true;

    const loadInitialData = async () => {
      if (!loadAttempted.current) {
        loadAttempted.current = true;
        
        if (activeTab === 'all') {
          await loadMembers(true);
        }
        await loadAllConnections();
      } else {
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      isComponentMounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'all' && members.length === 0 && !loading) {
      loadMembers(true);
    }
  }, [activeTab, members.length, loading, loadMembers]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'all') {
        appCache.remove(ALL_MEMBERS_CACHE_KEY);
        loadMembers(true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search, businessType, marketArea, activeTab, loadMembers]);

  const renderMemberCard = useCallback((member: Member) => {
    const isVerified = member.user_status === 'verified';
    
    return (
      <div 
        key={member.id} 
        className="bg-white rounded-xl p-3 border hover:shadow-md transition-shadow cursor-pointer flex flex-col"
        onClick={(e) => handleProfileClick(member.id, e)}
      >
        <div className="flex flex-col flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative w-14 h-14 bg-gray-100 rounded-full overflow-hidden border-2 border-blue-200 flex-shrink-0">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.full_name || `${member.first_name} ${member.last_name}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold">
                    {getUserInitials(member.first_name, member.last_name)}
                  </div>
                )}
                {isVerified && (
                  <div className="absolute -bottom-1 -right-1">
                    <VerifiedBadge size={10} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-sm truncate">
                    {member.first_name} {member.last_name}
                  </h3>
                  {isVerified && <VerifiedBadge size={10} />}
                </div>
                {member.business_name && (
                  <p className="text-gray-700 text-xs font-medium truncate">
                    {member.business_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {member.business_type && (
            <div className="mb-2">
              <span className="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-600 font-medium rounded-full border border-blue-200">
                {member.business_type}
              </span>
            </div>
          )}

          {member.market_area && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="text-blue-500" />
                <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 font-medium rounded-full border border-blue-300 truncate">
                  {member.market_area}
                </span>
              </div>
            </div>
          )}

          {member.location && member.location !== member.market_area && (
            <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-2">
              <MapPin size={12} className="text-gray-400" />
              <span className="truncate">{member.location}</span>
            </div>
          )}

          {member.bio && (
            <p className="text-gray-700 text-xs line-clamp-2 mt-1 flex-1">{member.bio}</p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
          {getConnectionButton(member)}
        </div>
      </div>
    );
  }, [handleProfileClick, getUserInitials, getConnectionButton]);

  const renderFriendCard = useCallback((friend: any) => {
    const isVerified = friend.user_status === 'verified';
    
    return (
      <div 
        key={`friend-${friend.user_id}`} 
        className="bg-white rounded-xl p-3 border hover:shadow-md transition-shadow cursor-pointer flex flex-col"
        onClick={() => navigate(`/profile/${friend.user_id}`)}
      >
        <div className="flex flex-col flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative w-14 h-14 bg-gray-100 rounded-full overflow-hidden border-2 border-blue-300 flex-shrink-0">
                {friend.user_avatar ? (
                  <img 
                    src={friend.user_avatar} 
                    alt={friend.user_name} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold">
                    {friend.user_name.charAt(0)}
                  </div>
                )}
                {isVerified && (
                  <div className="absolute -bottom-1 -right-1">
                    <VerifiedBadge size={10} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-gray-900 text-sm truncate">
                    {friend.user_name}
                  </h3>
                  {isVerified && <VerifiedBadge size={10} />}
                  <span className="inline-flex items-center px-1 py-0.5 text-xs bg-green-100 text-green-700 font-bold rounded border border-green-300 flex-shrink-0">
                    ✓
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{friend.user_email}</p>
                <p className="text-xs text-gray-400">Connected {formatTimeAgo(friend.connected_at)}</p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${friend.user_id}`);
          }}
          className="w-full py-2 text-xs bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 mt-3 min-h-[36px]"
        >
          View Profile
        </button>
      </div>
    );
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              {confirmAction.type === 'connect' && `Connect with ${confirmAction.userName}?`}
              {confirmAction.type === 'accept' && `Accept connection from ${confirmAction.userName}?`}
              {confirmAction.type === 'reject' && `Reject connection from ${confirmAction.userName}?`}
              {confirmAction.type === 'withdraw' && `Withdraw request to ${confirmAction.userName}?`}
            </h3>
            <p className="text-gray-600 text-xs mb-6">
              {confirmAction.type === 'connect' && 'This will send a connection request to this member.'}
              {confirmAction.type === 'accept' && 'You will be connected and can message each other.'}
              {confirmAction.type === 'reject' && 'This will decline the connection request. The member can send another request later.'}
              {confirmAction.type === 'withdraw' && 'This will cancel your pending connection request.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelConfirmAction}
                className="flex-1 py-3 text-xs bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 min-h-[36px]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 py-3 text-xs rounded-lg font-medium text-white min-h-[36px] ${
                  confirmAction.type === 'reject' || confirmAction.type === 'withdraw'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmAction.type === 'connect' && 'Send Request'}
                {confirmAction.type === 'accept' && 'Accept'}
                {confirmAction.type === 'reject' && 'Reject'}
                {confirmAction.type === 'withdraw' && 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {connectionFeedback.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-40 px-6 py-3 rounded-lg shadow-lg animate-fade-in min-h-[36px] min-w-[200px] flex items-center justify-center ${
          connectionFeedback.type === 'success' 
            ? 'bg-green-100 border border-green-300 text-green-800' 
            : 'bg-red-100 border border-red-300 text-red-800'
        }`}>
          <span className="font-medium text-xs">{connectionFeedback.message}</span>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-sm font-bold mb-1">GKBC Members Directory</h1>
          <p className="text-blue-200 text-xs">Connect with business professionals</p>
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-white border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-4 text-center font-medium min-h-[36px] ${
              activeTab === 'all' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users size={18} />
              <span className="hidden sm:inline">All Members</span>
              <span className="sm:hidden">All</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex-1 py-4 text-center font-medium min-h-[36px] relative ${
              activeTab === 'connections' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserCheck size={18} />
              <span className="hidden sm:inline">Connections</span>
              <span className="sm:hidden">Connections</span>
              {receivedRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {receivedRequests.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'all' && (
        <div className="sticky top-14 z-20 bg-white border-b p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col space-y-3">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, business..."
                    className="w-full pl-10 pr-4 py-3 text-xs bg-white rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[36px]"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-3 text-xs bg-white text-blue-600 rounded-lg border border-blue-300 hover:bg-blue-50 flex items-center gap-2 font-medium min-h-[36px] min-w-[36px]"
                >
                  <Filter size={16} />
                  <span className="hidden sm:inline">Filters</span>
                </button>
              </div>

              {showFilters && (
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-xs text-gray-900">Filters</h3>
                    <button
                      onClick={clearFilters}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium min-h-[36px] px-3"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-2">
                        <div className="flex items-center gap-2">
                          <Building size={14} className="text-gray-500" />
                          Business Type
                        </div>
                      </label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-white rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[36px]"
                      >
                        <option value="">All Business Types</option>
                        <option value="Retail">Retail</option>
                        <option value="Services">Services</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Technology">Technology</option>
                        <option value="Wholesale">Wholesale</option>
                        <option value="Import/Export">Import/Export</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-2">
                        <div className="flex items-center gap-2">
                          <Map size={14} className="text-gray-500" />
                          Market Area
                        </div>
                      </label>
                      <select
                        value={marketArea}
                        onChange={(e) => setMarketArea(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-white rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[36px]"
                      >
                        <option value="">All Market Areas</option>
                        {marketAreas.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4">
        {activeTab === 'all' && (
          <>
            {loading && page === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={`skeleton-${i}`} className="bg-white rounded-xl p-4 border animate-pulse">
                    <div className="flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </div>
                        </div>
                        <div className="w-20 h-8 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Building size={32} className="text-blue-500" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">No members found</h3>
                <p className="text-gray-600 text-xs mb-4">Try adjusting your search or check your connections</p>
                <button
                  onClick={clearFilters}
                  className="px-5 py-3 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium min-h-[36px]"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMembers.map((member) => renderMemberCard(member))}
                </div>

                {filteredMembers.length > 0 && hasMore && (
                  <div className="text-center mt-8">
                    <button
                      onClick={() => loadMembers(false)}
                      disabled={loading}
                      className="px-6 py-3 text-xs bg-white text-blue-600 font-medium rounded-lg border border-blue-300 hover:bg-blue-50 disabled:opacity-50 min-h-[36px]"
                    >
                      {loading ? 'Loading...' : 'Load More Members'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'connections' && (
          <div>
            {connectionsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={`connection-skeleton-${i}`} className="bg-white rounded-xl p-4 border animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : receivedRequests.length === 0 && friends.length === 0 && sentRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <UserCheck size={32} className="text-blue-500" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">No connections yet</h3>
                <p className="text-gray-600 text-xs mb-4">Connect with members to build your network</p>
                <button
                  onClick={() => setActiveTab('all')}
                  className="px-5 py-3 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium min-h-[36px]"
                >
                  Browse Members
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {receivedRequests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Connection Requests</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {receivedRequests.map((request) => (
                        <div key={`received-${request.id}`} className="bg-white rounded-xl p-4 border flex flex-col">
                          <div 
                            className="flex items-center gap-3 mb-4 cursor-pointer flex-1"
                            onClick={() => navigate(`/profile/${request.sender_id}`)}
                          >
                            <div className="relative w-14 h-14 bg-gray-100 rounded-full overflow-hidden border-2 border-blue-300 flex-shrink-0">
                              {request.sender_avatar ? (
                                <img 
                                  src={request.sender_avatar} 
                                  alt={request.sender_name} 
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold">
                                  {request.sender_name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-gray-900 text-sm truncate">{request.sender_name}</h3>
                                <span className="inline-flex items-center px-1 py-0.5 text-xs bg-yellow-100 text-yellow-700 font-bold rounded border border-yellow-300 flex-shrink-0">
                                  Pending
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{request.sender_email}</p>
                              <p className="text-xs text-gray-400">Sent {formatTimeAgo(request.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => handleAcceptRequest(request.id, request.sender_name)}
                              className="flex-1 py-2.5 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 min-h-[36px]"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id, request.sender_name)}
                              className="flex-1 py-2.5 text-xs bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 min-h-[36px]"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {friends.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Your Connections</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {friends.map((friend) => renderFriendCard(friend))}
                    </div>
                  </div>
                )}

                {sentRequests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Sent Requests</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sentRequests.map((request) => (
                        <div key={`sent-${request.id}`} className="bg-white rounded-xl p-4 border flex flex-col">
                          <div 
                            className="flex items-center gap-3 mb-4 cursor-pointer flex-1"
                            onClick={() => navigate(`/profile/${request.connected_user_id}`)}
                          >
                            <div className="relative w-14 h-14 bg-gray-100 rounded-full overflow-hidden border-2 border-blue-300 flex-shrink-0">
                              {request.user_avatar ? (
                                <img 
                                  src={request.user_avatar} 
                                  alt={request.user_name} 
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold">
                                  {request.user_name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-gray-900 text-sm truncate">{request.user_name}</h3>
                                <span className="inline-flex items-center px-1 py-0.5 text-xs bg-yellow-100 text-yellow-700 font-bold rounded border border-yellow-300 flex-shrink-0">
                                  Pending
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{request.user_email}</p>
                              <p className="text-xs text-gray-400">Sent {formatTimeAgo(request.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-3 border-t border-gray-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${request.connected_user_id}`);
                              }}
                              className="flex-1 py-2.5 text-xs bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 min-h-[36px]"
                            >
                              View Profile
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWithdrawRequest(request.id, request.user_name);
                              }}
                              className="flex-1 py-2.5 text-xs bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 min-h-[36px]"
                            >
                              Withdraw
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Members;