// services/adminMembers.ts
import { supabase } from './supabase'

export interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  user_status: 'verified' | 'member'
  created_at: string
  updated_at?: string
}

export const adminMembersService = {
  // Fetch all members
  async getMembers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, user_status, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching members:', error)
        return { data: [], error }
      }
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching members:', err)
      return { data: [], error: err }
    }
  },

  // Verify a member (change user_status to 'verified')
  async verifyMember(memberId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          user_status: 'verified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .select('id, user_status, updated_at')

      if (error) {
        console.error('Error verifying member:', error)
        return { data: null, error }
      }
      
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error verifying member:', err)
      return { data: null, error: err }
    }
  },

  // Unverify a member (change user_status to 'member')
  async unverifyMember(memberId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          user_status: 'member',
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .select('id, user_status, updated_at')

      if (error) {
        console.error('Error unverifying member:', error)
        return { data: null, error }
      }
      
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error unverifying member:', err)
      return { data: null, error: err }
    }
  },

  // Get verified members only
  async getVerifiedMembers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, user_status, created_at')
        .eq('user_status', 'verified')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching verified members:', error)
        return { data: [], error }
      }
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching verified members:', err)
      return { data: [], error: err }
    }
  },

  // Get regular members only (not verified)
  async getRegularMembers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, user_status, created_at')
        .eq('user_status', 'member')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching regular members:', error)
        return { data: [], error }
      }
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching regular members:', err)
      return { data: [], error: err }
    }
  }
}