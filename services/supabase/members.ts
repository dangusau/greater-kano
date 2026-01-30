import { supabase } from './client';
import { Member } from '../../types/index';

export const membersService = {
  async getMembers(
    search?: string, 
    businessType?: string, 
    marketArea?: string, 
    page = 0, 
    limit = 20
  ): Promise<Member[]> {
    const offset = page * limit;
    
    try {
      const { data, error } = await supabase.rpc('get_member_directory', {
        p_search: search || null,
        p_business_type: businessType || null,
        p_market_area: marketArea || null,
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;
      return data || [];
    } catch {
      throw new Error('Failed to load members');
    }
  },

  async sendConnectionRequest(userId: string): Promise<{ id: string }> {
    try {
      const { data, error } = await supabase.rpc('send_connection_request', {
        p_connected_user_id: userId
      });

      if (error) throw error;
      return data;
    } catch {
      throw new Error('Failed to send connection request');
    }
  },

  async getMemberById(userId: string): Promise<Member | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as Member;
    } catch {
      return null;
    }
  },

  async searchMembers(query: string): Promise<Member[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,business_name.ilike.%${query}%`)
        .limit(50);

      if (error) throw error;
      return data as Member[];
    } catch {
      return [];
    }
  }
};