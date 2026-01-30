import { supabase } from './supabase'

export type AdminUser = {
  id: string
  email: string
  password?: string
  full_name: string
  permissions: string[]
  active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export type AdminFormData = {
  email: string
  password: string
  confirm_password: string
  full_name: string
  permissions: string[]
  active: boolean
}

export type Permission = {
  id: string
  name: string
  description: string
  category: string
}

// Available permissions for the system
export const AVAILABLE_PERMISSIONS: Permission[] = [
  // Dashboard
  { id: 'view_dashboard', name: 'View Dashboard', description: 'Can view the admin dashboard', category: 'Dashboard' },
  
  // User Management
  { id: 'view_users', name: 'View Users', description: 'Can view all users', category: 'User Management' },
  { id: 'edit_users', name: 'Edit Users', description: 'Can edit user information', category: 'User Management' },
  { id: 'approve_users', name: 'Approve Users', description: 'Can approve/reject user registrations', category: 'User Management' },
  { id: 'delete_users', name: 'Delete Users', description: 'Can delete users', category: 'User Management' },
  
  // Support Management
  { id: 'view_support', name: 'View Support Tickets', description: 'Can view support tickets', category: 'Support' },
  { id: 'reply_support', name: 'Reply to Tickets', description: 'Can reply to support tickets', category: 'Support' },
  { id: 'resolve_support', name: 'Resolve Tickets', description: 'Can resolve support tickets', category: 'Support' },
  
  // Announcements
  { id: 'view_announcements', name: 'View Announcements', description: 'Can view announcements', category: 'Announcements' },
  { id: 'create_announcements', name: 'Create Announcements', description: 'Can create announcements', category: 'Announcements' },
  { id: 'delete_announcements', name: 'Delete Announcements', description: 'Can delete announcements', category: 'Announcements' },
  
  // Admin Management
  { id: 'view_admins', name: 'View Admins', description: 'Can view admin users', category: 'Admin Management' },
  { id: 'create_admins', name: 'Create Admins', description: 'Can create new admin users', category: 'Admin Management' },
  { id: 'edit_admins', name: 'Edit Admins', description: 'Can edit admin users', category: 'Admin Management' },
  { id: 'delete_admins', name: 'Delete Admins', description: 'Can delete admin users', category: 'Admin Management' },
  
  // Settings
  { id: 'view_settings', name: 'View Settings', description: 'Can view system settings', category: 'Settings' },
  { id: 'edit_settings', name: 'Edit Settings', description: 'Can edit system settings', category: 'Settings' },
  
  // Analytics
  { id: 'view_analytics', name: 'View Analytics', description: 'Can view analytics data', category: 'Analytics' },
  { id: 'export_analytics', name: 'Export Analytics', description: 'Can export analytics data', category: 'Analytics' },
  
  // Content Management
  { id: 'manage_content', name: 'Manage Content', description: 'Can manage website content', category: 'Content' },
  { id: 'manage_pages', name: 'Manage Pages', description: 'Can manage website pages', category: 'Content' },
  
  // Reports
  { id: 'view_reports', name: 'View Reports', description: 'Can view system reports', category: 'Reports' },
  { id: 'generate_reports', name: 'Generate Reports', description: 'Can generate new reports', category: 'Reports' }
]

export const adminManagementService = {
  
  // ==============================
  // GET ALL ADMINS
  // ==============================
  async getAllAdmins() {
    try {
      console.log('Fetching all admin users...')
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching admins:', error)
        return { data: null, error }
      }

      console.log(`Fetched ${data?.length || 0} admin users`)
      return { data: data as AdminUser[], error: null }
    } catch (error) {
      console.error('Unexpected error in getAllAdmins:', error)
      return { data: null, error }
    }
  },

  // ==============================
  // GET ADMIN BY ID
  // ==============================
  async getAdminById(id: string) {
    try {
      console.log(`Fetching admin ${id}...`)
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching admin:', error)
        return { data: null, error }
      }

      return { data: data as AdminUser, error: null }
    } catch (error) {
      console.error('Unexpected error in getAdminById:', error)
      return { data: null, error }
    }
  },

  // ==============================
  // CREATE NEW ADMIN
  // ==============================
  async createAdmin(formData: AdminFormData) {
    try {
      console.log('Creating new admin...', formData)
      
      // Validate password match
      if (formData.password !== formData.confirm_password) {
        return { 
          data: null, 
          error: new Error('Passwords do not match') 
        }
      }

      // Check if email already exists
      const { data: existingAdmin, error: checkError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', formData.email)
        .single()

      if (existingAdmin) {
        return { 
          data: null, 
          error: new Error('An admin with this email already exists') 
        }
      }

      // Create admin data (remove confirm_password)
      const { confirm_password, ...adminData } = formData

      const { data, error } = await supabase
        .from('admin_users')
        .insert([adminData])
        .select()
        .single()

      if (error) {
        console.error('Error creating admin:', error)
        return { data: null, error }
      }

      console.log('Admin created successfully:', data)
      return { data: data as AdminUser, error: null }
    } catch (error) {
      console.error('Unexpected error in createAdmin:', error)
      return { data: null, error }
    }
  },

  // ==============================
  // UPDATE ADMIN
  // ==============================
  async updateAdmin(id: string, formData: Partial<AdminFormData>) {
    try {
      console.log(`Updating admin ${id}...`, formData)
      
      const updateData: any = {
        ...formData,
        updated_at: new Date().toISOString()
      }

      // Remove password fields if not provided
      if (!updateData.password) {
        delete updateData.password
        delete updateData.confirm_password
      } else {
        // Validate password match
        if (updateData.password !== updateData.confirm_password) {
          return { 
            data: null, 
            error: new Error('Passwords do not match') 
          }
        }
        delete updateData.confirm_password
      }

      const { data, error } = await supabase
        .from('admin_users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating admin:', error)
        return { data: null, error }
      }

      console.log('Admin updated successfully:', data)
      return { data: data as AdminUser, error: null }
    } catch (error) {
      console.error('Unexpected error in updateAdmin:', error)
      return { data: null, error }
    }
  },

  // ==============================
  // DELETE ADMIN
  // ==============================
  async deleteAdmin(id: string) {
    try {
      console.log(`Deleting admin ${id}...`)
      
      // First check if this is the last active admin
      const { data: activeAdmins, error: countError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('active', true)

      if (countError) {
        return { error: countError }
      }

      if (activeAdmins && activeAdmins.length <= 1) {
        const { data: adminToDelete } = await this.getAdminById(id)
        if (adminToDelete?.active) {
          return { 
            error: new Error('Cannot delete the last active admin. Deactivate instead.') 
          }
        }
      }

      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting admin:', error)
        return { error }
      }

      return { error: null }
    } catch (error) {
      console.error('Unexpected error in deleteAdmin:', error)
      return { error }
    }
  },

  // ==============================
  // TOGGLE ADMIN STATUS
  // ==============================
  async toggleAdminStatus(id: string, active: boolean) {
    try {
      console.log(`Setting admin ${id} active status to ${active}...`)
      
      // Prevent deactivating the last active admin
      if (!active) {
        const { data: activeAdmins, error: countError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('active', true)

        if (countError) {
          return { data: null, error: countError }
        }

        if (activeAdmins && activeAdmins.length <= 1) {
          // Check if this is the only active admin
          const isActiveAdmin = activeAdmins.some(admin => admin.id === id)
          if (isActiveAdmin) {
            return { 
              data: null, 
              error: new Error('Cannot deactivate the last active admin') 
            }
          }
        }
      }

      const { data, error } = await supabase
        .from('admin_users')
        .update({ 
          active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error toggling admin status:', error)
        return { data: null, error }
      }

      return { data: data as AdminUser, error: null }
    } catch (error) {
      console.error('Unexpected error in toggleAdminStatus:', error)
      return { data: null, error }
    }
  },

  // ==============================
  // UPDATE LAST LOGIN
  // ==============================
  async updateLastLogin(id: string) {
    try {
      await supabase
        .from('admin_users')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    } catch (error) {
      console.error('Error updating last login:', error)
    }
  },

  // ==============================
  // VALIDATE ADMIN CREDENTIALS
  // ==============================
  async validateAdminCredentials(email: string, password: string) {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .eq('active', true)
        .single()

      if (error) {
        return { data: null, error: new Error('Invalid credentials or inactive account') }
      }

      // Update last login
      await this.updateLastLogin(data.id)

      return { data: data as AdminUser, error: null }
    } catch (error) {
      console.error('Error validating admin credentials:', error)
      return { data: null, error: new Error('Authentication failed') }
    }
  },

  // ==============================
  // GET PERMISSIONS BY CATEGORY
  // ==============================
  getPermissionsByCategory() {
    const categories: Record<string, Permission[]> = {}
    
    AVAILABLE_PERMISSIONS.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = []
      }
      categories[permission.category].push(permission)
    })
    
    return categories
  },

  // ==============================
  // CHECK IF PERMISSION EXISTS
  // ==============================
  isValidPermission(permissionId: string): boolean {
    return AVAILABLE_PERMISSIONS.some(p => p.id === permissionId)
  },

  // ==============================
  // FORMAT PERMISSIONS FOR DISPLAY
  // ==============================
  formatPermissions(permissions: string[]): string {
    if (!permissions || permissions.length === 0) {
      return 'No permissions'
    }
    
    const permissionNames = permissions
      .map(pid => AVAILABLE_PERMISSIONS.find(p => p.id === pid)?.name)
      .filter(Boolean)
    
    return permissionNames.length > 2 
      ? `${permissionNames.slice(0, 2).join(', ')} +${permissionNames.length - 2} more`
      : permissionNames.join(', ')
  }
}