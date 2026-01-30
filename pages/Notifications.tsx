// pages/Notifications.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check } from 'lucide-react';
import { notificationService } from '../services/supabase/notifications';
import { Notification } from '../types/notifications';
import { formatTimeAgo } from '../utils/formatters';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getUserNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await notificationService.markAsRead(notification.id);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    }

    // Only help_support is clickable - redirects to ticket
    if (notification.type === 'help_support' && notification.data?.ticket_id) {
      navigate(`/support/ticket/${notification.data.ticket_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 border">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={20} />
              <h1 className="text-lg font-bold">Notifications</h1>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-2xl mx-auto p-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
                  !notification.is_read 
                    ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{notification.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {notification.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      {!notification.is_read && (
                        <Check className="text-blue-500" size={16} />
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700">{notification.message}</p>
                
                {/* Show click hint only for help_support */}
                {notification.type === 'help_support' && (
                  <div className="mt-2 text-sm text-blue-600">
                    Click to view ticket →
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;