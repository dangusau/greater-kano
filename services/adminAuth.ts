import { supabase } from './supabase';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  permissions: string[];
  active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

class AdminAuthService {
  private static instance: AdminAuthService;
  private currentAdmin: AdminUser | null = null;

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  async login(email: string, password: string): Promise<{ 
    success: boolean; 
    admin?: AdminUser; 
    error?: string 
  }> {
    try {
      // Find admin by email and password
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email.trim())
        .eq('password', password.trim())
        .eq('active', true)
        .single();
      
      if (error || !adminUser) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Update last login
      await supabase
        .from('admin_users')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', adminUser.id);

      // Create admin session
      const adminSession: AdminUser = {
        id: adminUser.id,
        email: adminUser.email,
        full_name: adminUser.full_name,
        permissions: adminUser.permissions || [],
        active: adminUser.active !== false,
        last_login: new Date().toISOString(),
        created_at: adminUser.created_at,
        updated_at: new Date().toISOString()
      };
      
      this.currentAdmin = adminSession;
      
      // Store session (8 hour expiry)
      localStorage.setItem('admin_session', JSON.stringify({
        admin: adminSession,
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      }));
      
      return { success: true, admin: adminSession };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('admin_session');
    this.currentAdmin = null;
  }

  async getCurrentAdmin(): Promise<AdminUser | null> {
    if (this.currentAdmin) return this.currentAdmin;
    
    const sessionStr = localStorage.getItem('admin_session');
    if (!sessionStr) return null;
    
    try {
      const session = JSON.parse(sessionStr);
      
      // Check session expiry
      if (new Date(session.expires_at) < new Date()) {
        await this.logout();
        return null;
      }
      
      this.currentAdmin = session.admin;
      return this.currentAdmin;
      
    } catch (error) {
      await this.logout();
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const admin = await this.getCurrentAdmin();
    return !!admin && admin.active === true;
  }
}

export const adminAuth = AdminAuthService.getInstance();