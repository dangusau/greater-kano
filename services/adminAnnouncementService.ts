import { supabase } from './supabase'

export type NotificationType = 
  | 'friend_request'
  | 'friend_request_accepted'
  | 'business_approved'
  | 'business_rejected'
  | 'system_message'
  | 'help_support'
  | 'new_message'
  | 'marketplace_interest'
  | 'connection_suggestion'

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: any
  is_read: boolean
  is_archived: boolean
  action_url: string | null
  created_at: string
}

export type User = {
  id: string
  email: string
  first_name: string
  last_name?: string
  phone?: string
  avatar_url?: string
  role?: string
  approval_status?: string
  business_name?: string
  created_at: string
}

export type AnnouncementFormData = {
  title: string
  message: string
  type: NotificationType
  selectedUserIds: string[]
  sendToAll: boolean
  action_url?: string
}

export type SentAnnouncement = {
  id: string
  title: string
  message: string
  action_url: string | null
  sent_at: string
  sent_by: string
  total_recipients: number
  read_count: number
  unread_count: number
}

export const adminAnnouncementService = {
  
  // ==============================
  // GET ALL SENT ANNOUNCEMENTS (GROUPED)
  // ==============================
  async getSentAnnouncements() {
    try {
      console.log('Fetching grouped announcements...')
      
      // First, get distinct announcements by their data.sent_by and title/message
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('id, title, message, action_url, data, created_at')
        .eq('type', 'system_message')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching announcements:', error)
        return { data: null, error }
      }

      // Group notifications by sent_by and message content
      const groupedAnnouncements: Record<string, SentAnnouncement> = {}

      notifications?.forEach(notification => {
        const sentBy = notification.data?.sent_by
        const messageHash = `${notification.title}|${notification.message}`
        const key = `${sentBy}_${messageHash}`

        if (!groupedAnnouncements[key]) {
          groupedAnnouncements[key] = {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            action_url: notification.action_url,
            sent_at: notification.created_at,
            sent_by: sentBy,
            total_recipients: 0,
            read_count: 0,
            unread_count: 0
          }
        }
      })

      // Now get stats for each announcement group
      for (const key in groupedAnnouncements) {
        const announcement = groupedAnnouncements[key]
        
        // Count recipients for this announcement
        const { data: recipients, error: statsError } = await supabase
          .from('notifications')
          .select('id, is_read')
          .eq('type', 'system_message')
          .eq('title', announcement.title)
          .eq('message', announcement.message)
          .eq('data->>sent_by', announcement.sent_by)

        if (!statsError && recipients) {
          announcement.total_recipients = recipients.length
          announcement.read_count = recipients.filter(r => r.is_read).length
          announcement.unread_count = recipients.filter(r => !r.is_read).length
        }
      }

      const announcementsList = Object.values(groupedAnnouncements)
      
      console.log(`Fetched ${announcementsList.length} announcement groups`)
      return { data: announcementsList, error: null }
    } catch (error) {
      console.error('Unexpected error in getSentAnnouncements:', error)
      return { data: null, error }
    }
  },

  // ==============================
  // GET ALL APPROVED USERS FOR SELECTION
  // ==============================
  async getAllUsers() {
    try {
      console.log('Fetching approved users...')
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          first_name, 
          last_name, 
          phone, 
          avatar_url, 
          role, 
          approval_status,
          business_name,
          created_at
        `)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        return { data: null, error }
      }

      console.log(`Fetched ${data?.length || 0} approved users`)
      return { data: data as User[], error: null }
    } catch (error) {
      console.error('Unexpected error in getAllUsers:', error)
      return { data: null, error }
    }
  },

  // ==============================
  // SEND ANNOUNCEMENT
  // ==============================
  async sendAnnouncement(formData: AnnouncementFormData) {
    try {
      console.log('Sending announcement...', formData)
      
      // Get current admin user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return { 
          data: null, 
          error: new Error('Admin authentication failed') 
        }
      }

      // If sending to all users, get all APPROVED user IDs
      let userIds: string[] = []
      
      if (formData.sendToAll) {
        const { data: users, error: usersError } = await this.getAllUsers()
        if (usersError) {
          return { data: null, error: usersError }
        }
        userIds = users?.map(user => user.id) || []
      } else {
        // Filter only approved users from selected IDs
        const { data: selectedUsers, error: usersError } = await supabase
          .from('profiles')
          .select('id, approval_status')
          .in('id', formData.selectedUserIds)
          .eq('approval_status', 'approved')

        if (usersError) {
          return { data: null, error: usersError }
        }

        userIds = selectedUsers?.map(user => user.id) || []
      }

      if (userIds.length === 0) {
        return { 
          data: null, 
          error: new Error('No approved recipients selected') 
        }
      }

      console.log(`Sending to ${userIds.length} approved users`)

      // Prepare notifications data
      const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'system_message' as NotificationType,
        title: formData.title,
        message: formData.message,
        data: {
          sent_by: user.id,
          sent_at: new Date().toISOString(),
          announcement: true,
          announcement_group: `${user.id}_${formData.title}|${formData.message}`
        },
        is_read: false,
        is_archived: false,
        action_url: formData.action_url || null,
        created_at: new Date().toISOString()
      }))

      // Insert all notifications
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select()

      if (error) {
        console.error('Error sending announcements:', error)
        return { data: null, error }
      }

      console.log(`Successfully sent ${data?.length || 0} notifications`)
      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error in sendAnnouncement:', error)
      return { data: null, error }
    }
  },

  // ==============================
  // GET ANNOUNCEMENT DETAILS
  // ==============================
  async getAnnouncementDetails(announcementId: string) {
    try {
      // Get the announcement
      const { data: announcement, error: announcementError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', announcementId)
        .single()

      if (announcementError) {
        return { data: null, error: announcementError }
      }

      // Get all recipients of this announcement (same title, message, and sent_by)
      const { data: recipients, error: recipientsError } = await supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          is_read,
          created_at,
          profiles:user_id (
            id,
            email,
            first_name,
            last_name,
            avatar_url,
            business_name
          )
        `)
        .eq('type', 'system_message')
        .eq('title', announcement.title)
        .eq('message', announcement.message)
        .eq('data->>sent_by', announcement.data?.sent_by)

      if (recipientsError) {
        return { data: null, error: recipientsError }
      }

      return {
        data: {
          announcement,
          recipients: recipients || []
        },
        error: null
      }
    } catch (error) {
      console.error('Error getting announcement details:', error)
      return { data: null, error }
    }
  },

  // ==============================
  // DELETE ANNOUNCEMENT (ALL COPIES)
  // ==============================
  async deleteAnnouncement(announcementId: string) {
    try {
      // First get the announcement to find all copies
      const { data: announcement, error: fetchError } = await supabase
        .from('notifications')
        .select('title, message, data')
        .eq('id', announcementId)
        .single()

      if (fetchError) {
        return { error: fetchError }
      }

      // Delete all notifications with same title, message, and sent_by
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('type', 'system_message')
        .eq('title', announcement.title)
        .eq('message', announcement.message)
        .eq('data->>sent_by', announcement.data?.sent_by)

      if (error) {
        console.error('Error deleting announcement:', error)
        return { error }
      }

      return { error: null }
    } catch (error) {
      console.error('Unexpected error in deleteAnnouncement:', error)
      return { error }
    }
  },

  // ==============================
  // GET USER DISPLAY NAME
  // ==============================
  getUserDisplayName(user: User): string {
    if (user.business_name) {
      return user.business_name
    }
    const firstName = user.first_name || ''
    const lastName = user.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName || user.email.split('@')[0] || 'User'
  }
}