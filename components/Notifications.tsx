import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  MessageSquare, 
  Users,
  Settings,
  Filter,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  UserMinus
} from 'lucide-react';
import { supabase } from '../services/supabase';

// ONLY 4 notification types as specified
type NotificationType = 'friend_request' | 'friend_accepted' | 'comment' | 'system';

type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  is_handled: boolean; // NEW: Track if request has been handled (for friend requests)
  action_url?: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  created_at: string;
};

const Notifications = () => {
  const navigate = useNavigate();
  
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    today: 0,
    friendRequests: 0
  });

  // Initialize
  useEffect(() => {
    initializeNotifications();
    
    return () => {
      const channel = supabase.channel('notifications-page');
      channel.unsubscribe();
    };
  }, []);

  // Filter notifications when activeFilter changes
  useEffect(() => {
    filterNotifications();
  }, [notifications, activeFilter]);

  // Initialize notifications
  const initializeNotifications = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      await fetchNotifications(user.id);
      setupRealtimeSubscriptions(user.id);
      calculateStats();
      
    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      setNotifications(data || []);
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      today: notifications.filter(n => new Date(n.created_at) >= today).length,
      friendRequests: notifications.filter(n => n.type === 'friend_request' && !n.is_handled).length
    };
    
    setStats(stats);
  };

  // Filter notifications
  const filterNotifications = () => {
    let filtered = [...notifications];
    
    if (activeFilter === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    } else if (activeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === activeFilter);
    }
    
    setFilteredNotifications(filtered);
    calculateStats();
  };

  // Set up real-time subscriptions
  const setupRealtimeSubscriptions = (userId: string) => {
    const channel = supabase.channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(notif => 
                notif.id === payload.new.id ? { ...notif, ...payload.new } : notif
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
          
          setTimeout(calculateStats, 100);
        }
      )
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  };

  // MARK AS READ - Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // MARK ALL AS READ - Mark ALL notifications as read (but don't delete)
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);
      
      if (unreadIds.length === 0) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      
      if (error) throw error;
      
      // Update all notifications to is_read = true
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      
      setSelectedNotifications([]);
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // CLEAR ALL - Delete ALL notifications
  const clearAllNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      if (notifications.length === 0) return;
      
      const notificationIds = notifications.map(n => n.id);
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);
      
      if (error) throw error;
      
      // Clear all notifications from state
      setNotifications([]);
      setSelectedNotifications([]);
      
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  // ACCEPT FRIEND REQUEST FUNCTION
  const handleAcceptRequest = async (notification: Notification) => {
    try {
      const connectionId = notification.data?.connection_id;
      const senderId = notification.sender_id;
      
      if (!connectionId || !senderId) {
        console.error('Missing connectionId or senderId:', { connectionId, senderId, notification });
        return;
      }

      // 1. Update connection status to 'accepted'
      const { error: connectionError } = await supabase
        .from('connections')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (connectionError) {
        console.error('Error updating connection:', connectionError);
        return;
      }

      // 2. Update notification to mark it as handled and read
      const { error: notificationError } = await supabase
        .from('notifications')
        .update({
          is_handled: true,
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      if (notificationError) {
        console.error('Error updating notification:', notificationError);
        return;
      }

      // 3. Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notification.id 
            ? { ...notif, is_handled: true, is_read: true }
            : notif
        )
      );
      
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  // DECLINE FRIEND REQUEST FUNCTION
  const handleDeclineRequest = async (notification: Notification) => {
    try {
      const connectionId = notification.data?.connection_id;
      
      if (connectionId) {
        // Delete the connection request
        const { error: connectionError } = await supabase
          .from('connections')
          .delete()
          .eq('id', connectionId);

        if (connectionError) {
          console.error('Error deleting connection:', connectionError);
        }
      }

      // Update notification as handled and delete it
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notification.id);

      // Update local state
      setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
      
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  // Delete selected notifications
  const deleteSelectedNotifications = async () => {
    try {
      if (selectedNotifications.length === 0) return;
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', selectedNotifications);
      
      if (error) throw error;
      
      setNotifications(prev => 
        prev.filter(notif => !selectedNotifications.includes(notif.id))
      );
      
      setSelectedNotifications([]);
      
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  // Toggle selection
  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // Select all
  const selectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'friend_request':
      case 'friend_accepted':
        navigate('/members');
        break;
        
      case 'comment':
        if (notification.data?.post_id) {
          navigate(`/feed/post/${notification.data.post_id}`);
        } else {
          navigate('/feed');
        }
        break;
        
      case 'system':
        // System notifications might have custom URLs
        if (notification.action_url) {
          navigate(notification.action_url);
        }
        break;
        
      default:
        break;
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: NotificationType) => {
    const iconSize = viewMode === 'compact' ? 16 : 20;
    
    switch (type) {
      case 'friend_request':
        return <UserPlus size={iconSize} className="text-blue-500" />;
      case 'friend_accepted':
        return <UserCheck size={iconSize} className="text-green-500" />;
      case 'comment':
        return <MessageSquare size={iconSize} className="text-purple-500" />;
      case 'system':
        return <AlertCircle size={iconSize} className="text-yellow-500" />;
      default:
        return <Bell size={iconSize} className="text-gray-500" />;
    }
  };

  // Get notification background color
  const getNotificationBgColor = (type: NotificationType, isHandled: boolean = false) => {
    if (isHandled) {
      return 'bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 opacity-80';
    }
    
    switch (type) {
      case 'friend_request':
        return 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500';
      case 'friend_accepted':
        return 'bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500';
      case 'comment':
        return 'bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500';
      case 'system':
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500';
      default:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-500';
    }
  };

  // Get notification time
  const getNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
    const diffInDays = Math.floor(diffInMinutes / 1440);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mo ago`;
    return `${Math.floor(diffInDays / 365)}y ago`;
  };

  // Get filter options - Only our 4 types
  const filterOptions = [
    { id: 'all', label: 'All', icon: Bell, count: stats.total },
    { id: 'unread', label: 'Unread', icon: BellRing, count: stats.unread },
    { id: 'friend_request', label: 'Requests', icon: UserPlus, count: stats.friendRequests },
    { id: 'friend_accepted', label: 'Accepted', icon: CheckCircle2, count: notifications.filter(n => n.type === 'friend_accepted').length },
    { id: 'comment', label: 'Comments', icon: MessageSquare, count: notifications.filter(n => n.type === 'comment').length },
    { id: 'system', label: 'System', icon: AlertCircle, count: notifications.filter(n => n.type === 'system').length },
  ];

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 safe-area">
        <div className="max-w-screen-sm mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-48"></div>
          </div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 rounded-lg w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded-lg w-3/4"></div>
              </div>
            ))}
          </div>
          
          {/* Notifications Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded-lg w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded-lg w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 safe-area">
      <div className="max-w-screen-sm mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="relative">
                  <BellRing className="text-blue-600" size={28} />
                  {stats.unread > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {stats.unread > 9 ? '9+' : stats.unread}
                    </span>
                  )}
                </div>
                Notifications
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Stay updated with your latest activities
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'compact' : 'list')}
                className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
                title={viewMode === 'list' ? 'Compact view' : 'List view'}
              >
                {viewMode === 'list' ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              
              <button
                onClick={markAllAsRead}
                disabled={stats.unread === 0}
                className="px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
              >
                <CheckCircle size={16} className="inline mr-1" />
                Mark all read
              </button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Total</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
                <Bell className="opacity-80" size={20} />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Unread</p>
                  <p className="text-xl font-bold">{stats.unread}</p>
                </div>
                <BellRing className="opacity-80" size={20} />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Today</p>
                  <p className="text-xl font-bold">{stats.today}</p>
                </div>
                <Clock className="opacity-80" size={20} />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90">Requests</p>
                  <p className="text-xl font-bold">{stats.friendRequests}</p>
                </div>
                <UserPlus className="opacity-80" size={20} />
              </div>
            </div>
          </div>
          
          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Sparkles className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} selected
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      selectedNotifications.forEach(id => markAsRead(id));
                      setSelectedNotifications([]);
                    }}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm"
                  >
                    <CheckCircle size={14} className="inline mr-1" />
                    Mark read
                  </button>
                  
                  <button
                    onClick={deleteSelectedNotifications}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors text-sm"
                  >
                    <Trash2 size={14} className="inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Filter size={18} />
              Filter by
            </h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedNotifications.length === filteredNotifications.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {filterOptions.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as any)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                  activeFilter === filter.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <filter.icon size={16} />
                {filter.label}
                {filter.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    activeFilter === filter.id
                      ? 'bg-white/20'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Clear All Button - Separate from Mark All Read */}
        {notifications.length > 0 && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={clearAllNotifications}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-sm text-sm"
            >
              <Trash2 size={16} className="inline mr-1" />
              Clear All Notifications
            </button>
          </div>
        )}
        
        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="text-blue-400" size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-600 text-sm mb-4">
                {activeFilter === 'all' 
                  ? "You're all caught up! When you receive new notifications, they'll appear here."
                  : `No ${activeFilter === 'unread' ? 'unread' : activeFilter} notifications found.`
                }
              </p>
              {activeFilter !== 'all' && (
                <button
                  onClick={() => setActiveFilter('all')}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg text-sm"
                >
                  View all notifications
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative cursor-pointer transition-all duration-300 ${
                  viewMode === 'compact' ? 'p-4' : 'p-5'
                } ${getNotificationBgColor(notification.type, notification.is_handled)} rounded-xl shadow-sm hover:shadow-lg border border-white/50 backdrop-blur-sm`}
              >
                {/* Selection checkbox */}
                <div 
                  className="absolute left-3 top-3 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(notification.id);
                  }}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedNotifications.includes(notification.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white/80 border-gray-300 group-hover:border-blue-400'
                  }`}>
                    {selectedNotifications.includes(notification.id) && (
                      <Check size={12} className="text-white" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-3 ml-8">
                  {/* Icon */}
                  <div className={`flex-shrink-0 ${
                    viewMode === 'compact' ? 'w-8 h-8' : 'w-10 h-10'
                  } rounded-full bg-white/80 flex items-center justify-center shadow-sm`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className={`font-bold text-gray-900 ${
                          viewMode === 'compact' ? 'text-sm' : 'text-base'
                        }`}>
                          {notification.title}
                        </h3>
                        <p className={`text-gray-700 ${
                          viewMode === 'compact' ? 'text-xs' : 'text-sm'
                        } mt-1`}>
                          {notification.message}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Unread indicator */}
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                        
                        {/* Time */}
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {getNotificationTime(notification.created_at)}
                        </span>
                        
                        {/* Action arrow */}
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                    
                    {/* Sender info */}
                    {notification.sender_name && (
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center gap-1">
                          {notification.sender_avatar ? (
                            <img 
                              src={notification.sender_avatar} 
                              alt={notification.sender_name}
                              className="w-6 h-6 rounded-full object-cover border border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {notification.sender_name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-medium text-gray-700">
                            {notification.sender_name}
                          </span>
                        </div>
                        
                        {/* Quick actions for friend requests - Only show if not handled */}
                        {notification.type === 'friend_request' && !notification.is_handled && (
                          <div className="flex gap-1 ml-auto">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleAcceptRequest(notification);
                              }}
                              className="px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm"
                            >
                              <UserCheck size={12} className="inline mr-1" />
                              Accept
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleDeclineRequest(notification);
                              }}
                              className="px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-sm"
                            >
                              <UserMinus size={12} className="inline mr-1" />
                              Decline
                            </button>
                          </div>
                        )}
                        
                        {/* Show accepted status for handled friend requests */}
                        {notification.type === 'friend_request' && notification.is_handled && (
                          <div className="ml-auto">
                            <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-green-50 text-green-700 text-xs rounded-lg">
                              <CheckCircle2 size={10} className="inline mr-1" />
                              Accepted
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Bottom actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/50">
                  <div className="flex items-center gap-3">
                    {!notification.is_read && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await markAsRead(notification.id);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <CheckCircle size={12} />
                        Mark as read
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(notification.id);
                      }}
                      className="text-xs text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
                    >
                      {selectedNotifications.includes(notification.id) ? 'Deselect' : 'Select'}
                    </button>
                  </div>
                  
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await supabase
                        .from('notifications')
                        .delete()
                        .eq('id', notification.id);
                      setNotifications(prev => prev.filter(n => n.id !== notification.id));
                    }}
                    className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Empty state for no notifications at all */}
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="text-blue-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">No notifications yet</h3>
            <p className="text-gray-600 text-sm mb-6">
              You'll receive notifications here when you get friend requests, connection acceptances, 
              comments on your posts, or system messages.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/members')}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg text-sm"
              >
                <Users size={16} className="inline mr-2" />
                Browse Members
              </button>
              <button
                onClick={() => navigate('/feed')}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg text-sm"
              >
                <MessageSquare size={16} className="inline mr-2" />
                View Feed
              </button>
            </div>
          </div>
        )}
        
        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                Showing {filteredNotifications.length} of {notifications.length} notifications
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={markAllAsRead}
                  disabled={stats.unread === 0}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark all as read
                </button>
                
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;