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
      // 1. Delete from auth.users (using Admin API)
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(profileId)

      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError)
        return { success: false, error: authDeleteError }
      }

      // 2. Delete from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId)

      if (profileError) {
        console.error('Error deleting profile:', profileError)
        // Auth user is already gone, but profile remains – log for manual cleanup
        return { success: false, error: profileError }
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
