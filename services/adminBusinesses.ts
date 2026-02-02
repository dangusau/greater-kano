// services/adminBusinesses.ts
import { supabase } from './supabase'

/**
 * BUSINESS TYPE FROM YOUR TABLE
 */
export type Business = {
  id: string
  owner_id: string
  name: string
  description: string | null
  business_type: string
  category: string
  location_axis: string
  email: string | null
  phone: string | null
  website: string | null
  logo_url: string | null
  banner_url: string | null
  is_registered: boolean
  verification_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at?: string
  rejection_reason?: string | null

  // Owner (JOINED FROM profiles, optional)
  owner_first_name: string | null
  owner_last_name: string | null
  owner_email: string | null
}

/**
 * ADMIN BUSINESS SERVICE
 */
export const adminBusinessesService = {
  /**
   * Fetch all businesses + join owner profile safely
   */
  async getBusinesses() {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          owner:owner_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Map join result, safely handling missing profiles
      const formatted: Business[] = (data || []).map((b: any) => ({
        ...b,
        owner_first_name: b.owner?.first_name ?? null,
        owner_last_name: b.owner?.last_name ?? null,
        owner_email: b.owner?.email ?? null
      }))

      return { data: formatted, error: null }
    } catch (error: any) {
      console.error('getBusinesses error:', error)
      return { data: null, error }
    }
  },

  /**
   * Approve a business
   */
  async approveBusiness(businessId: string, adminId?: string) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({
          verification_status: 'approved',
          rejection_reason: null,
          is_registered: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId)

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      console.error('approveBusiness error:', error)
      return { data: null, error }
    }
  },

  /**
   * Reject a business (requires reason)
   */
  async rejectBusiness(businessId: string, reason: string, adminId?: string) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({
          verification_status: 'rejected',
          rejection_reason: reason,
          is_registered: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId)

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      console.error('rejectBusiness error:', error)
      return { data: null, error }
    }
  },

  /**
   * Delete a business completely
   */
  async deleteBusiness(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId)

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      console.error('deleteBusiness error:', error)
      return { data: null, error }
    }
  }
}
