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

 async deleteMember(profileId: string) {
  try {
    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return { success: false, error: new Error('No active session') }
    }

    const accessToken = session.access_token
    if (!accessToken) {
      return { success: false, error: new Error('Access token missing') }
    }

    // Call Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, // required
      },
      body: JSON.stringify({ userId: profileId }),
    })

    const result = await response.json().catch(async () => {
      const text = await response.text()
      throw new Error(`Server returned ${response.status}: ${text}`)
    })

    if (!response.ok) {
      return { success: false, error: new Error(result.error || `Request failed with status ${response.status}`) }
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


