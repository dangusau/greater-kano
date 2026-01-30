// services/supabase/notificationService.ts
import { supabase } from './client';
import { Notification } from '../../types/notifications';

// Cache keys
const CACHE_KEYS = {
  NOTIFICATIONS: (userId: string) => `notifications_${userId}`,
  NOTIFICATIONS_TIMESTAMP: (userId: string) => `notifications_ts_${userId}`,
  UNREAD_COUNT: (userId: string) => `unread_count_${userId}`,
  UNREAD_COUNT_TIMESTAMP: (userId: string) => `unread_count_ts_${userId}`
};

class NotificationService {
  // Cache utility functions
  private getFromCache<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      return JSON.parse(cached);
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  private saveToCache(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  private isCacheValid(timestampKey: string, maxAgeMinutes: number = 2): boolean {
    try {
      const timestamp = localStorage.getItem(timestampKey);
      if (!timestamp) return false;
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < maxAgeMinutes * 60 * 1000;
    } catch (error) {
      return false;
    }
  }

  // Get unread notification count with caching
  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      // Check cache first
      const cacheKey = CACHE_KEYS.UNREAD_COUNT(user.id);
      const timestampKey = CACHE_KEYS.UNREAD_COUNT_TIMESTAMP(user.id);
      
      const cachedCount = this.getFromCache<number>(cacheKey);
      const isCacheValid = this.isCacheValid(timestampKey, 1); // 1 minute cache
      
      if (cachedCount !== null && isCacheValid) {
        return cachedCount;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .eq('is_archived', false);

      if (error) throw error;
      
      const countValue = count || 0;
      
      // Save to cache
      this.saveToCache(cacheKey, countValue);
      localStorage.setItem(timestampKey, Date.now().toString());
      
      return countValue;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  // Get notifications for user with caching
  async getUserNotifications(): Promise<Notification[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Check cache first
      const cacheKey = CACHE_KEYS.NOTIFICATIONS(user.id);
      const timestampKey = CACHE_KEYS.NOTIFICATIONS_TIMESTAMP(user.id);
      
      const cachedData = this.getFromCache<Notification[]>(cacheKey);
      const isCacheValid = this.isCacheValid(timestampKey, 2); // 2 minutes cache
      
      if (cachedData && isCacheValid) {
        console.log('📦 Loading notifications from cache');
        return cachedData;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const notifications = data || [];
      
      // Save to cache
      this.saveToCache(cacheKey, notifications);
      localStorage.setItem(timestampKey, Date.now().toString());
      
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      
      // Return cached data if available
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cacheKey = CACHE_KEYS.NOTIFICATIONS(user.id);
        const cachedData = this.getFromCache<Notification[]>(cacheKey);
        if (cachedData) {
          console.log('⚠️  Using stale cache due to error');
          return cachedData;
        }
      }
      
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
      
      // Clear cache for user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS(user.id));
        localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS_TIMESTAMP(user.id));
        localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT(user.id));
        localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT_TIMESTAMP(user.id));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      
      // Clear cache
      localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS(user.id));
      localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS_TIMESTAMP(user.id));
      localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT(user.id));
      localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT_TIMESTAMP(user.id));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Archive notification
  async archiveNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      // Clear cache for user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS(user.id));
        localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS_TIMESTAMP(user.id));
        localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT(user.id));
        localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT_TIMESTAMP(user.id));
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      // Clear cache for user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS(user.id));
        localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS_TIMESTAMP(user.id));
        localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT(user.id));
        localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT_TIMESTAMP(user.id));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Delete all notifications
  async deleteAllNotifications(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (error) throw error;
      
      // Clear cache
      localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS(user.id));
      localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS_TIMESTAMP(user.id));
      localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT(user.id));
      localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT_TIMESTAMP(user.id));
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(callback: (payload: any) => void) {
    let unsubscribe = () => {};
    
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Notification update:', payload);
            callback(payload);
            
            // Clear cache on changes
            localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS(user.id));
            localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS_TIMESTAMP(user.id));
            localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT(user.id));
            localStorage.removeItem(CACHE_KEYS.UNREAD_COUNT_TIMESTAMP(user.id));
          }
        )
        .subscribe();
      
      unsubscribe = () => {
        supabase.removeChannel(channel);
      };
    });
    
    return unsubscribe;
  }

  // Handle friend request acceptance
  async handleFriendRequest(notificationId: string, accept: boolean): Promise<void> {
    try {
      // Get notification details
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (notificationError) throw notificationError;
      
      if (accept) {
        // Update connection status to 'connected'
        const connectionId = notification.data?.connection_id;
        if (connectionId) {
          const { error: connectionError } = await supabase
            .from('connections')
            .update({ 
              status: 'connected',
              updated_at: new Date().toISOString()
            })
            .eq('id', connectionId);

          if (connectionError) throw connectionError;
        }
        
        // Mark notification as handled
        await supabase
          .from('notifications')
          .update({ is_handled: true })
          .eq('id', notificationId);
          
      } else {
        // Delete the connection request
        const connectionId = notification.data?.connection_id;
        if (connectionId) {
          await supabase
            .from('connections')
            .delete()
            .eq('id', connectionId);
        }
        
        // Delete the notification
        await this.deleteNotification(notificationId);
      }
      
      // Clear cache
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS(user.id));
        localStorage.removeItem(CACHE_KEYS.NOTIFICATIONS_TIMESTAMP(user.id));
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
      throw error;
    }
  }

  // Get notification stats
  async getNotificationStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total: 0, unread: 0, today: 0, friendRequests: 0 };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (error) throw error;

      const notifications = data || [];
      
      return {
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length,
        today: notifications.filter(n => new Date(n.created_at) >= today).length,
        friendRequests: notifications.filter(n => 
          n.type === 'connection_request' && !n.is_handled
        ).length
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, unread: 0, today: 0, friendRequests: 0 };
    }
  }
}

export const notificationService = new NotificationService();