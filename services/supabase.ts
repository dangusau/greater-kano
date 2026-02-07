/// src/services/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: true
  }
})

// ========== TYPES ==========
export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  user_status: 'verified' | 'member';
  created_at: string;
  updated_at: string;
}

// ========== BASIC FUNCTIONS ==========
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getCurrentProfile = async (): Promise<UserProfile | null> => {
  const user = await getCurrentUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return profile as UserProfile
}

export const getUserStatus = async (): Promise<'verified' | 'member' | null> => {
  const profile = await getCurrentProfile()
  return profile?.user_status || null
}

// ========== PASSWORD RESET FUNCTIONS ==========
/**
 * Sends a password reset email to the user
 * @param email - User's email address
 * @param redirectTo - URL to redirect after password reset
 */
export const sendPasswordResetEmail = async (
  email: string, 
  redirectTo: string = `${window.location.origin}/reset-password`
) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    // Critical auth failure - keep error logging
    console.error('Failed to send password reset email:', error);
    
    // Handle specific error cases
    if (error?.message?.includes('429')) {
      throw new Error('Too many attempts. Please try again in a few minutes.');
    }
    
    if (error?.message?.includes('Email not confirmed')) {
      throw new Error('Please confirm your email address before resetting password.');
    }
    
    throw new Error('Failed to send password reset email. Please try again.');
  }
};

/**
 * Updates user's password (should be called after user clicks reset link)
 * @param newPassword - New password to set
 */
export const updateUserPassword = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    // Critical auth failure - keep error logging
    console.error('Failed to update password:', error);
    
    if (error?.message?.includes('invalid refresh token')) {
      throw new Error('Password reset link has expired. Please request a new one.');
    }
    
    throw new Error('Failed to update password. Please try again.');
  }
};

// ========== PERMISSIONS ==========
export const hasMemberAccess = async (): Promise<boolean> => {
  const status = await getUserStatus()
  return status === 'member'
}

export const getUserPermissions = async () => {
  const status = await getUserStatus()
  
  return status === 'member' ? {
    marketListings: true,
    jobListings: true,
    eventListings: true,
    friendChat: true,
    socialFeed: true,
    marketplaceChat: true,
    showVerificationBadge: true,
  } : {
    marketListings: false,
    jobListings: false,
    eventListings: false,
    friendChat: false,
    socialFeed: true,
    marketplaceChat: true,
    showVerificationBadge: false,
  }
}

// ========== ADMIN FUNCTIONS ==========
export const isUserAdmin = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser()
    if (!user) return false
    
    const { data } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .single()
    
    return !!data
  } catch {
    return false
  }
}

export const getVerifiedUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_status', 'verified')
    .order('created_at', { ascending: false })
  
  return { data: data as UserProfile[] | null, error }
}

export const approveUserAsMember = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      user_status: 'member',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
  
  return { data: data as UserProfile[] | null, error }
}

// ========== TEST ==========
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_status')
      .limit(1)
    
    if (error) {
      // Critical DB connection error - keep logging
      console.error('Database connection error:', error.message);
      return false
    }
    
    return true
  } catch (error: any) {
    // Critical DB connection error - keep logging
    console.error('Connection failed:', error.message);
    return false
  }
}
