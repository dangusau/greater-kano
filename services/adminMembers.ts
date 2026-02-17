import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

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
  // --------------------------------------
  // Fetch all members
  // --------------------------------------
  async getMembers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      return { data: data ?? [], error }
    } catch (err) {
      return { data: [], error: err }
    }
  },

  // --------------------------------------
  // Verify member
  // --------------------------------------
  async verifyMember(memberId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          user_status: 'verified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .select()

      return { data: data?.[0] ?? null, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // --------------------------------------
  // Unverify member
  // --------------------------------------
  async unverifyMember(memberId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          user_status: 'member',
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .select()

      return { data: data?.[0] ?? null, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // --------------------------------------
  // Delete member completely
  // Deletes from auth.users first, then profiles.
  // Assumes profile.id == auth.users.id.
  // --------------------------------------
  async deleteMember(profileId: string) {
  try {
    // Get the current user's session token
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    if (!token) {
      throw new Error('No active session')
    }

    // Call the Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: profileId }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: new Error(result.error || 'Delete failed') }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error('Unexpected error deleting member:', err)
    return { success: false, error: err }
  }
},
  // --------------------------------------
  // Get verified members
  // --------------------------------------
  async getVerifiedMembers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_status', 'verified')
        .order('created_at', { ascending: false })

      return { data: data ?? [], error }
    } catch (err) {
      return { data: [], error: err }
    }
  },

  // --------------------------------------
  // Get regular (non-verified) members
  // --------------------------------------
  async getRegularMembers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_status', 'member')
        .order('created_at', { ascending: false })

      return { data: data ?? [], error }
    } catch (err) {
      return { data: [], error: err }
    }
  },
}

