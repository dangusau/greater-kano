import { supabase } from './client';

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  sender_email: string;
  status: string;
  created_at: string;
}

export interface Friend {
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_email: string;
  connected_at: string;
  user_status: 'verified' | 'member';
}

export interface SentRequest {
  id: string;
  connected_user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string;
  created_at: string;
}

export interface ConnectionStatus {
  exists: boolean;
  status?: string;
  isSender?: boolean;
}

export const connectionsService = {
  async getReceivedRequests(): Promise<ConnectionRequest[]> {
    const { data, error } = await supabase.rpc('get_received_connection_requests');
    if (error) throw error;
    return data || [];
  },

  async getSentRequests(): Promise<SentRequest[]> {
    const { data, error } = await supabase.rpc('get_sent_connection_requests');
    if (error) throw error;
    return data || [];
  },

  async getFriends(): Promise<Friend[]> {
    const { data, error } = await supabase.rpc('get_friends_list');
    if (error) throw error;
    return data || [];
  },

  async acceptRequest(requestId: string): Promise<void> {
    const { error } = await supabase.rpc('accept_connection_request', {
      p_request_id: requestId
    });
    if (error) throw error;
  },

  async rejectRequest(requestId: string): Promise<void> {
    const { error } = await supabase.rpc('reject_connection_request', {
      p_request_id: requestId
    });
    if (error) throw error;
  },

  async withdrawRequest(requestId: string): Promise<void> {
    const { error } = await supabase.rpc('withdraw_connection_request', {
      p_request_id: requestId
    });
    if (error) throw error;
  },

  async getConnectionStatus(otherUserId: string): Promise<string> {
    const { data, error } = await supabase.rpc('get_connection_status', {
      p_other_user_id: otherUserId
    });
    if (error) return 'not_connected';
    return data || 'not_connected';
  },

  async checkConnection(userId: string): Promise<ConnectionStatus> {
    try {
      const { data, error } = await supabase.rpc('check_connection_exists', {
        p_other_user_id: userId
      });
      if (error) throw error;
      return data || { exists: false };
    } catch {
      return { exists: false };
    }
  },

  async sendConnectionRequest(userId: string): Promise<{ id: string }> {
    const { data, error } = await supabase.rpc('send_connection_request', {
      p_connected_user_id: userId
    });
    if (error) throw error;
    return data;
  }
};