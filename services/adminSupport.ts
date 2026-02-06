// services/adminSupport.ts - UPDATED TO MATCH YOUR SCHEMA
import { supabase } from './supabase'

// Type definitions - MATCH YOUR support_tickets TABLE
export type SupportTicket = {
  id: string
  user_id: string
  user_name: string
  user_email: string
  subject: string
  message: string
  category: string
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to?: string
  closed_at?: string
  created_at: string
  updated_at: string
}

// Type definitions - MATCH YOUR support_ticket_replies TABLE
export type TicketReply = {
  id: string
  ticket_id: string
  user_id: string
  message: string
  is_admin: boolean
  attachments?: string[]
  created_at: string
  updated_at: string
  user_name: string
  user_email: string
}

export type TicketWithReplies = SupportTicket & {
  replies: TicketReply[]
}

export const adminSupportService = {
  
  // ========================
  // GET ALL SUPPORT TICKETS (WITH USER NAMES)
  // ========================
  async getSupportTickets(status?: string) {
    try {
      console.log('Fetching all support tickets with user names...')
      
      const { data, error } = await supabase
        .rpc('admin_get_support_tickets', {
          period_start: null,
          period_end: null,
          status_filter: status || null,
          limit_count: 100,
          offset_val: 0
        })

      if (error) {
        console.error('Error fetching tickets:', error)
        return { data: null, error }
      }

      console.log(`Fetched ${data?.length || 0} tickets with user names`)
      return { data: data as SupportTicket[], error: null }
    } catch (error) {
      console.error('Unexpected error in getSupportTickets:', error)
      return { data: null, error }
    }
  },

  // =============================
  // GET SINGLE TICKET WITH REPLIES AND USER NAMES
  // =============================
  async getSupportTicketById(ticketId: string) {
    try {
      console.log(`Fetching ticket ${ticketId} with replies and user names...`)
      
      const { data, error } = await supabase
        .rpc('admin_get_support_ticket_with_replies', { ticket_id: ticketId })
        .single()

      if (error) {
        console.error('Error fetching ticket:', error)
        return { data: null, error }
      }

      if (!data || data.error) {
        return { data: null, error: new Error(data?.error || 'Ticket not found') }
      }

      // Transform the data to match our types
      const ticketWithReplies: TicketWithReplies = {
        ...data.ticket,
        replies: data.replies || []
      }

      console.log(`Fetched ticket with ${ticketWithReplies.replies?.length || 0} replies`)
      return { data: ticketWithReplies, error: null }
    } catch (error) {
      console.error('Unexpected error in getSupportTicketById:', error)
      return { data: null, error }
    }
  },

  // ======================
  // REPLY TO TICKET (MATCHES YOUR support_ticket_replies TABLE)
  // ======================
  async replyToTicket(ticketId: string, message: string) {
    try {
      console.log(`Replying to ticket ${ticketId}...`)
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('Authentication error:', authError)
        return { 
          data: null, 
          error: new Error('You must be logged in as an admin to reply') 
        }
      }

      console.log(`User ${user.id} is replying...`)

      // Prepare reply data - MATCHES support_ticket_replies TABLE
      const replyData = {
        ticket_id: ticketId,
        user_id: user.id,
        message: message.trim(),
        is_admin: true
        // Note: No 'created_by' field, using 'user_id' instead
      }

      console.log('Inserting reply with data:', replyData)

      // Insert reply
      const { data, error } = await supabase
        .from('support_ticket_replies')
        .insert(replyData)
        .select()
        .single()

      if (error) {
        console.error('Error inserting reply:', {
          code: error.code,
          message: error.message,
          details: error.details
        })
        return { data: null, error }
      }

      console.log('Reply inserted successfully:', data)

      // Update ticket status to in_progress
      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)

      if (updateError) {
        console.error('Error updating ticket:', updateError)
      }

      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error in replyToTicket:', error)
      return { data: null, error }
    }
  },

  // ========================
  // UPDATE TICKET STATUS (MATCHES YOUR support_tickets TABLE)
  // ========================
  async updateTicketStatus(ticketId: string, status: SupportTicket['status']) {
    try {
      console.log(`Updating ticket ${ticketId} status to ${status}...`)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { 
          data: null, 
          error: new Error('You must be logged in as an admin') 
        }
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
        assigned_to: user.id  // Using assigned_to instead of admin_id
      }

      // If closing or resolving the ticket, set closed_at
      if (status === 'resolved' || status === 'closed') {
        updateData.closed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select()
        .single()

      if (error) {
        console.error('Error updating ticket status:', error)
        return { data: null, error }
      }

      console.log('Ticket status updated successfully')
      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error in updateTicketStatus:', error)
      return { data: null, error }
    }
  },

  // ========================
  // GET SUPPORT ANALYTICS
  // ========================
  async getSupportAnalytics() {
    try {
      console.log('Fetching support analytics...')
      
      const { data, error } = await supabase
        .rpc('admin_get_support_analytics', {
          period_start: null,
          period_end: null
        })
        .single()

      if (error) {
        console.error('Error fetching analytics:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error in getSupportAnalytics:', error)
      return { data: null, error }
    }
  },

  // ========================
  // ASSIGN TICKET TO ADMIN (NEW FUNCTION)
  // ========================
  async assignTicket(ticketId: string, adminId: string) {
    try {
      console.log(`Assigning ticket ${ticketId} to admin ${adminId}...`)
      
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: adminId,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single()

      if (error) {
        console.error('Error assigning ticket:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error in assignTicket:', error)
      return { data: null, error }
    }
  }
}