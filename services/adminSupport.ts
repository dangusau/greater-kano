import { supabase } from './supabase'

// Type definitions
export type SupportTicket = {
  id: string
  user_id: string
  subject: string
  message: string
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category?: string
  created_at: string
  updated_at: string
  resolved_at?: string
  admin_id?: string
  admin_notes?: string
}

export type TicketReply = {
  id: string
  ticket_id: string
  message: string
  is_admin: boolean
  created_at: string
  created_by: string
  updated_at: string
}

export const adminSupportService = {
  
  // ========================
  // GET ALL SUPPORT TICKETS
  // ========================
  async getSupportTickets() {
    try {
      console.log('Fetching all support tickets...')
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching tickets:', error)
        return { data: null, error }
      }

      console.log(`Fetched ${data?.length || 0} tickets`)
      return { data: data as SupportTicket[], error: null }
    } catch (error) {
      console.error('Unexpected error in getSupportTickets:', error)
      return { data: null, error }
    }
  },

  // =============================
  // GET SINGLE TICKET WITH REPLIES
  // =============================
  async getSupportTicketById(ticketId: string) {
    try {
      console.log(`Fetching ticket ${ticketId}...`)
      
      // Get ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single()

      if (ticketError) {
        console.error('Error fetching ticket:', ticketError)
        return { data: null, error: ticketError }
      }

      // Get replies
      const { data: replies, error: repliesError } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (repliesError) {
        console.error('Error fetching replies:', repliesError)
        // Return ticket without replies
        return { 
          data: { 
            ...ticket, 
            replies: [] 
          }, 
          error: null 
        }
      }

      console.log(`Fetched ticket with ${replies?.length || 0} replies`)
      return { 
        data: { 
          ...ticket as SupportTicket, 
          replies: replies as TicketReply[] 
        }, 
        error: null 
      }
    } catch (error) {
      console.error('Unexpected error in getSupportTicketById:', error)
      return { data: null, error }
    }
  },

  // ======================
  // REPLY TO TICKET
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

      // Prepare reply data - ONLY fields that exist in the table
      const replyData = {
        ticket_id: ticketId,
        message: message.trim(),
        is_admin: true,
        created_by: user.id
        // NO title field - it doesn't exist in the schema
      }

      console.log('Inserting reply with data:', replyData)

      // Insert reply
      const { data, error } = await supabase
        .from('ticket_replies')
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

      // Update ticket status to in_progress and update timestamp
      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)

      if (updateError) {
        console.error('Error updating ticket:', updateError)
        // Continue anyway - the reply was successful
      }

      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error in replyToTicket:', error)
      return { data: null, error }
    }
  },

  // ========================
  // UPDATE TICKET STATUS
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
        admin_id: user.id
      }

      // If resolving the ticket, set resolved_at
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
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
  // ADD ADMIN NOTES
  // ========================
  async addAdminNotes(ticketId: string, notes: string) {
    try {
      console.log(`Adding admin notes to ticket ${ticketId}...`)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { 
          data: null, 
          error: new Error('You must be logged in as an admin') 
        }
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .update({ 
          admin_notes: notes,
          admin_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single()

      if (error) {
        console.error('Error adding admin notes:', error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error in addAdminNotes:', error)
      return { data: null, error }
    }
  }
}