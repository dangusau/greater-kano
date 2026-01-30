// services/adminBusinesses.ts
import { supabase } from './supabase'

export const adminBusinessesService = {
  // Fetch all businesses
  async getBusinesses() {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          id,
          owner_id,
          name,
          description,
          business_type,
          category,
          location_axis,
          email,
          phone,
          website,
          logo_url,
          banner_url,
          is_registered,
          verification_status,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching businesses:', error)
        return { data: [], error }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching businesses:', err)
      return { data: [], error: err }
    }
  },

  // Approve a business
  async approveBusiness(businessId: string, adminId: string) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({
          verification_status: 'approved',
          verified_by: adminId,
          verified_at: new Date().toISOString(),
        })
        .eq('id', businessId)
        .select('id, verification_status')

      if (error) {
        console.error('Error approving business:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error approving business:', err)
      return { data: null, error: err }
    }
  },

  // Reject a business
  async rejectBusiness(businessId: string, adminId: string, reason: string) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({
          verification_status: 'rejected',
          verified_by: adminId,
          verified_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', businessId)
        .select('id, verification_status')

      if (error) {
        console.error('Error rejecting business:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error rejecting business:', err)
      return { data: null, error: err }
    }
  },

  // Delete a business
  async deleteBusiness(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId)
        .select('id')

      if (error) {
        console.error('Error deleting business:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error deleting business:', err)
      return { data: null, error: err }
    }
  },
}
