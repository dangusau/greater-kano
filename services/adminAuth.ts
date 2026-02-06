// services/adminAuth.ts - SECURE VERSION
import { supabase } from './supabase';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  permissions: string[];
  active: boolean;
  role: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

class SecureAdminAuthService {
  private static instance: SecureAdminAuthService;
  private currentAdmin: AdminUser | null = null;

  static getInstance(): SecureAdminAuthService {
    if (!SecureAdminAuthService.instance) {
      SecureAdminAuthService.instance = new SecureAdminAuthService();
    }
    return SecureAdminAuthService.instance;
  }

  // Use Supabase Auth for login (secure)
  async login(email: string, password: string): Promise<{ 
    success: boolean; 
    admin?: AdminUser; 
    error?: string 
  }> {
    try {
      // 1. First, authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError || !authData.user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // 2. Check if this user is an admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email.trim())
        .eq('active', true)
        .single();

      if (adminError || !adminUser) {
        // Not an admin - sign them out
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'You do not have admin privileges'
        };
      }

      // 3. Update last login
      await supabase
        .from('admin_users')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .eq('id', adminUser.id);

      // 4. Create admin session
      const adminSession: AdminUser = {
        id: adminUser.id,
        email: adminUser.email,
        full_name: adminUser.full_name,
        permissions: adminUser.permissions || [],
        active: adminUser.active !== false,
        role: adminUser.role || 'admin',
        last_login: new Date().toISOString(),
        created_at: adminUser.created_at,
        updated_at: new Date().toISOString()
      };
      
      this.currentAdmin = adminSession;
      
      // 5. Store session (8 hour expiry)
      localStorage.setItem('admin_session', JSON.stringify({
        admin: adminSession,
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        auth_token: authData.session?.access_token
      }));
      
      return { success: true, admin: adminSession };
      
    } catch (error: any) {
      console.error('Admin login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  async logout(): Promise<void> {
    // Sign out from Supabase Auth
    await supabase.auth.signOut();
    
    // Clear local session
    localStorage.removeItem('admin_session');
    this.currentAdmin = null;
  }

  async getCurrentAdmin(): Promise<AdminUser | null> {
    // Check if we have a valid Supabase session first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await this.logout();
      return null;
    }

    if (this.currentAdmin) return this.currentAdmin;
    
    const sessionStr = localStorage.getItem('admin_session');
    if (!sessionStr) return null;
    
    try {
      const storedSession = JSON.parse(sessionStr);
      
      // Check session expiry
      if (new Date(storedSession.expires_at) < new Date()) {
        await this.logout();
        return null;
      }
      
      // Verify user is still admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', storedSession.admin.email)
        .eq('active', true)
        .single();

      if (!adminUser) {
        await this.logout();
        return null;
      }

      this.currentAdmin = {
        ...storedSession.admin,
        permissions: adminUser.permissions || []
      };
      
      return this.currentAdmin;
      
    } catch (error) {
      await this.logout();
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    // Check both Supabase Auth and admin status
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const admin = await this.getCurrentAdmin();
    return !!admin && admin.active === true;
  }

  // Check specific permissions
  async hasPermission(permission: string): Promise<boolean> {
    const admin = await this.getCurrentAdmin();
    if (!admin) return false;
    
    return admin.permissions.includes('super_admin') || 
           admin.permissions.includes(permission);
  }

  // Refresh session
  async refreshSession(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (!session) {
        await this.logout();
        return false;
      }
      
      // Update stored session expiry
      const sessionStr = localStorage.getItem('admin_session');
      if (sessionStr) {
        const storedSession = JSON.parse(sessionStr);
        storedSession.expires_at = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
        storedSession.auth_token = session.access_token;
        localStorage.setItem('admin_session', JSON.stringify(storedSession));
      }
      
      return true;
    } catch (error) {
      await this.logout();
      return false;
    }
  }
}

export const adminAuth = SecureAdminAuthService.getInstance();