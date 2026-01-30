// services/supabase/supportService.ts
import { supabase } from './client';

// Cache keys
const CACHE_KEYS = {
  USER_TICKETS: (userId: string) => `support_tickets_${userId}`,
  TICKET_DETAILS: (ticketId: string) => `support_ticket_${ticketId}`,
  TICKET_REPLIES: (ticketId: string) => `support_replies_${ticketId}`,
  TICKETS_TIMESTAMP: (userId: string) => `support_tickets_ts_${userId}`
};

class SupportService {
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

  private isCacheValid(timestampKey: string, maxAgeMinutes: number = 5): boolean {
    try {
      const timestamp = localStorage.getItem(timestampKey);
      if (!timestamp) return false;
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < maxAgeMinutes * 60 * 1000;
    } catch (error) {
      return false;
    }
  }

  private clearCacheForUser(userId: string): void {
    localStorage.removeItem(CACHE_KEYS.USER_TICKETS(userId));
    localStorage.removeItem(CACHE_KEYS.TICKETS_TIMESTAMP(userId));
  }

  // Submit a new support ticket
  async submitSupportTicket(ticketData: {
    subject: string;
    message: string;
    category?: string;
    priority?: string;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: ticketData.subject,
          message: ticketData.message,
          category: ticketData.category || 'general',
          priority: ticketData.priority || 'normal',
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Clear cache for user
      this.clearCacheForUser(user.id);
      
      return data;
    } catch (error) {
      console.error('Error submitting ticket:', error);
      throw error;
    }
  }

  // Get user's support tickets with caching
  async getUserSupportTickets() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Check cache first
      const cacheKey = CACHE_KEYS.USER_TICKETS(user.id);
      const timestampKey = CACHE_KEYS.TICKETS_TIMESTAMP(user.id);
      
      const cachedData = this.getFromCache<any[]>(cacheKey);
      const isCacheValid = this.isCacheValid(timestampKey, 5); // 5 minutes cache
      
      if (cachedData && isCacheValid) {
        console.log('📦 Loading tickets from cache');
        return cachedData;
      }

      // Fetch from server
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const tickets = data || [];
      
      // Save to cache
      this.saveToCache(cacheKey, tickets);
      localStorage.setItem(timestampKey, Date.now().toString());
      
      return tickets;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      
      // Return cached data if available (even if stale)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cacheKey = CACHE_KEYS.USER_TICKETS(user.id);
        const cachedData = this.getFromCache<any[]>(cacheKey);
        if (cachedData) {
          console.log('⚠️  Using stale cache due to error');
          return cachedData;
        }
      }
      
      return [];
    }
  }

  // Get ticket by ID with caching
  async getTicketById(ticketId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Check cache first
      const cacheKey = CACHE_KEYS.TICKET_DETAILS(ticketId);
      const cachedData = this.getFromCache<any>(cacheKey);
      const isCacheValid = this.isCacheValid(`${cacheKey}_timestamp`, 2); // 2 minutes cache
      
      if (cachedData && isCacheValid) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      // Save to cache
      this.saveToCache(cacheKey, data);
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      
      return data;
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  }

  // Get ticket replies with caching
  async getTicketReplies(ticketId: string) {
    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.TICKET_REPLIES(ticketId);
      const cachedData = this.getFromCache<any[]>(cacheKey);
      const isCacheValid = this.isCacheValid(`${cacheKey}_timestamp`, 1); // 1 minute cache
      
      if (cachedData && isCacheValid) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('support_ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const replies = data || [];
      
      // Save to cache
      this.saveToCache(cacheKey, replies);
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      
      return replies;
    } catch (error) {
      console.error('Error fetching ticket replies:', error);
      return [];
    }
  }

  // Add ticket reply
  async addTicketReply(ticketId: string, message: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // First, get ticket to verify ownership
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('user_id, status')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;
      if (ticket.user_id !== user.id) {
        throw new Error('Unauthorized');
      }

      const { data, error } = await supabase
        .from('support_ticket_replies')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          message: message,
          is_admin: false
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update ticket status if it was resolved/closed
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        await supabase
          .from('support_tickets')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', ticketId);
      }
      
      // Clear relevant caches
      localStorage.removeItem(CACHE_KEYS.TICKET_REPLIES(ticketId));
      this.clearCacheForUser(user.id);
      
      return data;
    } catch (error) {
      console.error('Error adding ticket reply:', error);
      throw error;
    }
  }

  // Close a ticket
  async closeTicket(ticketId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Clear cache
      this.clearCacheForUser(user.id);
      localStorage.removeItem(CACHE_KEYS.TICKET_DETAILS(ticketId));
      
      return true;
    } catch (error) {
      console.error('Error closing ticket:', error);
      throw error;
    }
  }

  // Format date for display
  formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get status color
  getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  // Get priority color
  getPriorityColor(priority: string) {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  // Get category icon
  getCategoryIcon(category: string) {
    const icons = {
      technical: '🛠️',
      account: '👤',
      bug: '🐛',
      feature: '✨',
      payment: '💳',
      general: '📧',
      other: '📄'
    };
    return icons[category as keyof typeof icons] || icons.general;
  }

  // Subscribe to ticket updates (for real-time)
  subscribeToTicket(ticketId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`ticket:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_ticket_replies',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          console.log('Ticket update:', payload);
          callback(payload);
          
          // Clear cache for this ticket's replies
          localStorage.removeItem(CACHE_KEYS.TICKET_REPLIES(ticketId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const supportService = new SupportService();