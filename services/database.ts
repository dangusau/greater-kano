// services/database.ts
import { supabase } from './supabase';

// ============================================
// TYPES (for reference within this file)
// ============================================

export interface DashboardStats {
  totalMembers: number;
  totalPioneers: number;
  totalBusinesses: number;
  pendingApprovals: number;
  totalPosts: number;
  totalEvents: number;
  totalMessages: number;
  verifiedMembers: number; // ADDED THIS - verified members from profiles table
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
  location?: string;
  metadata: any;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface GrowthDataPoint {
  month: string;
  members: number;
  pioneers: number;
}

export interface PlatformMetrics {
  activeUsers: number;
  newRegistrations: number;
  engagementRate: number;
}

export interface ContentMetrics {
  totalComments: number;
  totalMedia: number;
  weeklyComments: number;
  weeklyMedia: number;
}

export interface SystemMetrics {
  databaseStatus: string;
  apiResponseTime: string;
  uptime: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  permissions: string[];
  active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}


// services/database.ts - Adding activity tracking functions

// If you don't have this file, create it. If you do, add these functions:



// Activity tracking interface
export interface ActivityFilters {
  type?: 'event' | 'job' | 'classified';
  status?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

// Activity statistics
export interface ActivityStats {
  total: number;
  byType: {
    events: number;
    jobs: number;
    classifieds: number;
  };
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  dailyCounts: Array<{ date: string; count: number }>;
}

// Get activities with filters
export const getActivities = async (filters: ActivityFilters = {}) => {
  try {
    let eventsQuery = supabase.from('events').select('*');
    let jobsQuery = supabase.from('jobs').select('*');
    let classifiedsQuery = supabase.from('classifieds').select('*');

    // Apply date filters
    if (filters.startDate) {
      const startDateStr = filters.startDate.toISOString();
      eventsQuery = eventsQuery.gte('created_at', startDateStr);
      jobsQuery = jobsQuery.gte('created_at', startDateStr);
      classifiedsQuery = classifiedsQuery.gte('created_at', startDateStr);
    }
    
    if (filters.endDate) {
      const endDateStr = filters.endDate.toISOString();
      eventsQuery = eventsQuery.lte('created_at', endDateStr);
      jobsQuery = jobsQuery.lte('created_at', endDateStr);
      classifiedsQuery = classifiedsQuery.lte('created_at', endDateStr);
    }

    // Execute queries in parallel
    const [events, jobs, classifieds] = await Promise.all([
      eventsQuery,
      jobsQuery,
      classifiedsQuery
    ]);

    // Combine and filter results
    const allActivities = [
      ...(events.data || []).map(event => ({
        ...event,
        type: 'event' as const,
        status: new Date(event.start_time) > new Date() ? 'active' : 'completed'
      })),
      ...(jobs.data || []).map(job => ({
        ...job,
        type: 'job' as const,
        status: 'active'
      })),
      ...(classifieds.data || []).map(classified => ({
        ...classified,
        type: 'classified' as const,
        status: classified.condition === 'sold' ? 'sold' : 'active'
      }))
    ];

    // Apply additional filters
    return allActivities.filter(activity => {
      if (filters.type && activity.type !== filters.type) return false;
      if (filters.status && activity.status !== filters.status) return false;
      if (filters.category && activity.category !== filters.category) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          activity.title.toLowerCase().includes(searchLower) ||
          (activity.description && activity.description.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};

// Get activity statistics
export const getActivityStats = async (timeRange: '24h' | '7d' | '30d' | '90d' = '7d') => {
  try {
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    const startDateStr = startDate.toISOString();

    // Get counts for each type
    const [eventsCount, jobsCount, classifiedsCount] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', startDateStr),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', startDateStr),
      supabase.from('classifieds').select('*', { count: 'exact', head: true }).gte('created_at', startDateStr)
    ]);

    // Get daily counts for the last 7 days
    const dailyCounts = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const { count } = await supabase
        .from('classifieds')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDay.toISOString());

      dailyCounts.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: count || 0
      });
    }

    // Get category breakdown for classifieds
    const { data: classifieds } = await supabase
      .from('classifieds')
      .select('category')
      .gte('created_at', startDateStr);

    const byCategory: Record<string, number> = {};
    classifieds?.forEach(item => {
      if (item.category) {
        byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      }
    });

    // Get status breakdown
    const { data: allClassifieds } = await supabase
      .from('classifieds')
      .select('condition')
      .gte('created_at', startDateStr);

    const byStatus: Record<string, number> = {};
    allClassifieds?.forEach(item => {
      const status = item.condition === 'sold' ? 'sold' : 'active';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    const stats: ActivityStats = {
      total: (eventsCount.count || 0) + (jobsCount.count || 0) + (classifiedsCount.count || 0),
      byType: {
        events: eventsCount.count || 0,
        jobs: jobsCount.count || 0,
        classifieds: classifiedsCount.count || 0
      },
      byStatus,
      byCategory,
      dailyCounts
    };

    return stats;
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    return null;
  }
};

// Get trending categories
export const getTrendingCategories = async (limit: number = 5) => {
  try {
    const { data: classifieds } = await supabase
      .from('classifieds')
      .select('category, created_at')
      .order('created_at', { ascending: false });

    if (!classifieds) return [];

    // Group by category and count
    const categoryCounts: Record<string, { total: number; recent: number }> = {};
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    classifieds.forEach(item => {
      if (!item.category) return;
      
      if (!categoryCounts[item.category]) {
        categoryCounts[item.category] = { total: 0, recent: 0 };
      }
      
      categoryCounts[item.category].total++;
      
      if (new Date(item.created_at) >= thirtyDaysAgo) {
        categoryCounts[item.category].recent++;
      }
    });

    // Calculate trends and sort
    const categories = Object.entries(categoryCounts)
      .map(([name, counts]) => {
        const trend = counts.recent > counts.total / 2 ? 'up' : counts.recent < counts.total / 3 ? 'down' : 'stable';
        const change = counts.total > 0 ? Math.round((counts.recent / counts.total) * 100) : 0;
        
        return {
          name,
          total: counts.total,
          recent: counts.recent,
          trend,
          change
        };
      })
      .sort((a, b) => b.recent - a.recent)
      .slice(0, limit);

    return categories;
  } catch (error) {
    console.error('Error fetching trending categories:', error);
    return [];
  }
};
// ============================================
// MAIN DATABASE SERVICE
// ============================================

export const db = {
  // ================= AUTHENTICATION =================
  auth: {
    // Regular user login
    login: async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        // Get user profile
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
            
          return { 
            data: { ...data, profile }, 
            error: null 
          };
        }
        
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    
    // User signup
    signup: async (email: string, password: string, fullName: string, phone?: string) => {
      try {
        // First create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone || ''
            }
          }
        });

        if (authError) throw authError;

        // Then create profile
        if (authData.user) {
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: email,
              first_name: firstName,
              last_name: lastName,
              phone: phone || '',
              approval_status: 'pending',
              role: 'member'
            });

          if (profileError) throw profileError;
          
          // Log activity
          await supabase.from('activity_logs').insert({
            user_id: authData.user.id,
            action: 'user_registered',
            ip_address: '127.0.0.1',
            user_agent: navigator.userAgent
          });
        }

        return { data: authData, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    
    // Logout
    logout: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        return { error };
      } catch (error) {
        return { error };
      }
    },
    
    // Get current user
    getCurrentUser: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return { data: null, error: null };
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        return { data: { ...user, profile }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Admin specific authentication
    adminLogin: async (email: string, password: string) => {
      try {
        // First, sign in with email/password
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        // Check if user exists in admin_users table
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', email)
          .eq('active', true)
          .single();

        if (adminError || !adminUser) {
          await supabase.auth.signOut();
          throw new Error('Unauthorized access. Admin privileges required.');
        }

        // Update last login
        await supabase
          .from('admin_users')
          .update({ 
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', adminUser.id);

        // Log activity
        await supabase.from('activity_logs').insert({
          user_id: authData.user?.id,
          action: 'admin_login',
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent,
          metadata: { email, admin_id: adminUser.id }
        });

        return { data: { ...authData, adminUser }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Check admin access
    checkAdminAccess: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return { isAdmin: false, adminUser: null };
        }

        const { data: adminUser, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', user.email)
          .eq('active', true)
          .single();

        return { 
          isAdmin: !!adminUser && !error, 
          adminUser,
          error: error || null 
        };
      } catch (error) {
        return { isAdmin: false, adminUser: null, error };
      }
    }
  },

  // ================= DASHBOARD FUNCTIONS =================
  dashboard: {
    // Get all dashboard statistics - UPDATED FOR MEMBERS ONLY
    getStats: async (): Promise<{ stats: DashboardStats; error: any }> => {
      try {
        const [
          membersData,
          pioneersData,
          businessesData,
          postsData,
          eventsData,
          messagesData,
          verifiedMembersData // NEW: Get verified members from profiles table
        ] = await Promise.all([
          // Get all members (profiles)
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          
          // Get pioneers
          supabase.from('pioneers').select('*', { count: 'exact', head: true }),
          
          // Get businesses
          supabase.from('businesses').select('*', { count: 'exact', head: true }),
          
          // Get posts
          supabase.from('posts').select('*', { count: 'exact', head: true }),
          
          // Get events
          supabase.from('events').select('*', { count: 'exact', head: true }),
          
          // Get messages
          supabase.from('messages').select('*', { count: 'exact', head: true }),
          
          // NEW: Get verified members from profiles table where user_status = 'verified'
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_status', 'verified')
        ]);

        return {
          stats: {
            totalMembers: membersData.count || 0,
            totalPioneers: pioneersData.count || 0,
            totalBusinesses: businessesData.count || 0,
            pendingApprovals: 0, // Hardcoded to 0 as per your schema
            totalPosts: postsData.count || 0,
            totalEvents: eventsData.count || 0,
            totalMessages: messagesData.count || 0,
            verifiedMembers: verifiedMembersData.count || 0 // NEW: Verified members count
          },
          error: null
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
          stats: {
            totalMembers: 0,
            totalPioneers: 0,
            totalBusinesses: 0,
            pendingApprovals: 0,
            totalPosts: 0,
            totalEvents: 0,
            totalMessages: 0,
            verifiedMembers: 0 // NEW: Verified members fallback
          },
          error
        };
      }
    },

    // Get recent activities
    getRecentActivities: async (limit: number = 10): Promise<{ data: ActivityLog[]; error: any }> => {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select(`
            *,
            profiles:user_id(first_name, last_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return { data: data || [], error: null };
      } catch (error) {
        console.error('Error fetching recent activities:', error);
        return { data: [], error };
      }
    },

    // Get growth data
    getGrowthData: async (months: number = 6): Promise<{ data: GrowthDataPoint[]; error: any }> => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const [profilesResult, pioneersResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString()),
          supabase
            .from('pioneers')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
        ]);

        const profiles = profilesResult.data || [];
        const pioneers = pioneersResult.data || [];

        // Group by month
        const monthsArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentDate = new Date();
        const result: GrowthDataPoint[] = [];

        for (let i = months - 1; i >= 0; i--) {
          const date = new Date();
          date.setMonth(currentDate.getMonth() - i);
          const monthKey = `${monthsArray[date.getMonth()]} '${date.getFullYear().toString().slice(-2)}`;

          const monthProfiles = profiles.filter(p => {
            const profileDate = new Date(p.created_at);
            return profileDate.getMonth() === date.getMonth() && 
                   profileDate.getFullYear() === date.getFullYear();
          });

          const monthPioneers = pioneers.filter(p => {
            const pioneerDate = new Date(p.created_at);
            return pioneerDate.getMonth() === date.getMonth() && 
                   pioneerDate.getFullYear() === date.getFullYear();
          });

          result.push({
            month: monthKey,
            members: monthProfiles.length,
            pioneers: monthPioneers.length
          });
        }

        return { data: result, error: null };
      } catch (error) {
        console.error('Error fetching growth data:', error);
        return { data: [], error };
      }
    }
  },

  // ================= ANALYTICS FUNCTIONS =================
  analytics: {
    // Get platform metrics
    getPlatformMetrics: async (): Promise<PlatformMetrics> => {
      try {
        // Get 24h active users (distinct users with activity in last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: activeUsersData } = await supabase
          .from('activity_logs')
          .select('user_id')
          .gte('created_at', twentyFourHoursAgo);

        const activeUsers = new Set(activeUsersData?.map(log => log.user_id)).size;

        // Get new registrations in last 24 hours
        const { count: newRegistrations } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', twentyFourHoursAgo);

        // Calculate engagement rate (users who posted/commented/liked in last 24h vs total active users)
        const { count: engagementActivities } = await supabase
          .from('activity_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', twentyFourHoursAgo)
          .in('action', ['post_created', 'comment_created', 'post_liked']);

        const engagementRate = activeUsers > 0 ? Math.round((engagementActivities || 0) / activeUsers * 100) : 0;

        return {
          activeUsers,
          newRegistrations: newRegistrations || 0,
          engagementRate
        };
      } catch (error) {
        console.error('Error fetching platform metrics:', error);
        return {
          activeUsers: 0,
          newRegistrations: 0,
          engagementRate: 0
        };
      }
    },

    // Get content metrics
    getContentMetrics: async (): Promise<ContentMetrics> => {
      try {
        const [
          { count: totalComments },
          { count: totalMedia },
          { count: weeklyComments },
          { count: weeklyMedia }
        ] = await Promise.all([
          supabase.from('comments').select('*', { count: 'exact', head: true }),
          supabase.from('media_items').select('*', { count: 'exact', head: true }),
          supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from('media_items')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        return {
          totalComments: totalComments || 0,
          totalMedia: totalMedia || 0,
          weeklyComments: weeklyComments || 0,
          weeklyMedia: weeklyMedia || 0
        };
      } catch (error) {
        console.error('Error fetching content metrics:', error);
        return {
          totalComments: 0,
          totalMedia: 0,
          weeklyComments: 0,
          weeklyMedia: 0
        };
      }
    },

    // Get system metrics
    getSystemMetrics: async (): Promise<SystemMetrics> => {
      try {
        // Database connection check
        const { error: dbError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        // API response time (mock for now, can be measured in real implementation)
        const apiResponseTime = '98ms';
        
        // Uptime (this would typically come from a monitoring service)
        const uptime = '99.9%';

        return {
          databaseStatus: dbError ? 'Error' : 'Connected',
          apiResponseTime,
          uptime
        };
      } catch (error) {
        console.error('Error fetching system metrics:', error);
        return {
          databaseStatus: 'Error',
          apiResponseTime: '0ms',
          uptime: '0%'
        };
      }
    }
  },

  // ================= MEMBERS MANAGEMENT =================
  members: {
    // Get all members with pagination
    getAll: async (page: number = 1, limit: number = 20, filters?: any) => {
      try {
        let query = supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters?.search) {
          query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        }
        
        if (filters?.status) {
          query = query.eq('user_status', filters.status);
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;

        if (error) throw error;

        return {
          data: data || [],
          pagination: {
            total: count || 0,
            page,
            limit,
            pages: Math.ceil((count || 0) / limit)
          },
          error: null
        };
      } catch (error) {
        console.error('Error fetching members:', error);
        return { data: [], pagination: null, error };
      }
    },

    // Get pending members - UPDATED: returns empty array since no pending approval in schema
    getPending: async () => {
      try {
        return { data: [], error: null };
      } catch (error) {
        console.error('Error fetching pending members:', error);
        return { data: [], error };
      }
    },

    // Get member by ID
    getById: async (id: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        return { data, error };
      } catch (error) {
        console.error('Error fetching member:', error);
        return { data: null, error };
      }
    },

    // Approve member - UPDATED: Only updates user_status to 'verified'
    approveMember: async (memberId: string, adminId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            user_status: 'verified',
            updated_at: new Date().toISOString()
          })
          .eq('id', memberId)
          .select()
          .single();
        
        if (!error && data) {
          // Log activity
          await supabase.from('activity_logs').insert({
            user_id: memberId,
            action: 'member_verified',
            metadata: { verified_by: adminId }
          });
        }
        
        return { data, error };
      } catch (error) {
        console.error('Error approving member:', error);
        return { data: null, error };
      }
    },

    // Reject member - UPDATED: Only updates user_status to 'member' (not verified)
    rejectMember: async (memberId: string, reason: string, adminId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            user_status: 'member',
            updated_at: new Date().toISOString()
          })
          .eq('id', memberId)
          .select()
          .single();
        
        if (!error && data) {
          // Log activity
          await supabase.from('activity_logs').insert({
            user_id: memberId,
            action: 'member_status_updated',
            metadata: { reason, updated_by: adminId, new_status: 'member' }
          });
        }
        
        return { data, error };
      } catch (error) {
        console.error('Error rejecting member:', error);
        return { data: null, error };
      }
    },

    // Update member
    updateMember: async (memberId: string, updates: any) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', memberId)
          .select()
          .single();
        
        if (!error && data) {
          // Log activity
          await supabase.from('activity_logs').insert({
            user_id: memberId,
            action: 'member_updated',
            metadata: updates
          });
        }
        
        return { data, error };
      } catch (error) {
        console.error('Error updating member:', error);
        return { data: null, error };
      }
    }
  },

  // ================= PIONEERS MANAGEMENT =================
  pioneers: {
    // Get all pioneers
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('pioneers')
          .select('*')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });

        return { data: data || [], error };
      } catch (error) {
        console.error('Error fetching pioneers:', error);
        return { data: [], error };
      }
    },

    // Get pioneer by ID
    getById: async (id: string) => {
      try {
        const { data, error } = await supabase
          .from('pioneers')
          .select('*')
          .eq('id', id)
          .single();

        return { data, error };
      } catch (error) {
        console.error('Error fetching pioneer:', error);
        return { data: null, error };
      }
    },

    // Create pioneer
    create: async (pioneerData: any) => {
      try {
        const { data, error } = await supabase
          .from('pioneers')
          .insert({
            ...pioneerData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!error && data) {
          // Log activity
          await supabase.from('activity_logs').insert({
            action: 'pioneer_created',
            metadata: { pioneer_id: data.id, name: data.name }
          });
        }
        
        return { data, error };
      } catch (error) {
        console.error('Error creating pioneer:', error);
        return { data: null, error };
      }
    },

    // Update pioneer
    update: async (id: string, pioneerData: any) => {
      try {
        const { data, error } = await supabase
          .from('pioneers')
          .update(pioneerData)
          .eq('id', id)
          .select()
          .single();
        
        if (!error && data) {
          // Log activity
          await supabase.from('activity_logs').insert({
            action: 'pioneer_updated',
            metadata: { pioneer_id: id, updates: pioneerData }
          });
        }
        
        return { data, error };
      } catch (error) {
        console.error('Error updating pioneer:', error);
        return { data: null, error };
      }
    },

    // Delete pioneer
    delete: async (id: string) => {
      try {
        const { error } = await supabase
          .from('pioneers')
          .delete()
          .eq('id', id);
        
        if (!error) {
          // Log activity
          await supabase.from('activity_logs').insert({
            action: 'pioneer_deleted',
            metadata: { pioneer_id: id }
          });
        }
        
        return { error };
      } catch (error) {
        console.error('Error deleting pioneer:', error);
        return { error };
      }
    }
  },

  // ================= BUSINESSES MANAGEMENT =================
  businesses: {
    // Get all businesses
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select(`
            *,
            owner:profiles!businesses_owner_id_fkey(first_name, last_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false });

        return { data: data || [], error };
      } catch (error) {
        console.error('Error fetching businesses:', error);
        return { data: [], error };
      }
    },

    // Get business by ID
    getById: async (id: string) => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select(`
            *,
            owner:profiles!businesses_owner_id_fkey(*)
          `)
          .eq('id', id)
          .single();

        return { data, error };
      } catch (error) {
        console.error('Error fetching business:', error);
        return { data: null, error };
      }
    },

    // Verify business
    verifyBusiness: async (businessId: string, adminId: string) => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .update({
            is_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', businessId)
          .select()
          .single();
        
        if (!error && data) {
          // Log activity
          await supabase.from('activity_logs').insert({
            user_id: adminId,
            action: 'business_verified',
            metadata: { business_id: businessId, business_name: data.name }
          });
        }
        
        return { data, error };
      } catch (error) {
        console.error('Error verifying business:', error);
        return { data: null, error };
      }
    }
  },

  // ================= ANNOUNCEMENTS =================
  announcements: {
    // Get all announcements
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('publish_at', { ascending: false })
          .order('created_at', { ascending: false });

        return { data: data || [], error };
      } catch (error) {
        console.error('Error fetching announcements:', error);
        return { data: [], error };
      }
    },

    // Create announcement
    create: async (announcementData: any) => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            ...announcementData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!error && data) {
          // Log activity
          await supabase.from('activity_logs').insert({
            action: 'announcement_created',
            metadata: { announcement_id: data.id, title: data.title }
          });
        }
        
        return { data, error };
      } catch (error) {
        console.error('Error creating announcement:', error);
        return { data: null, error };
      }
    },

    // Update announcement
    update: async (id: string, announcementData: any) => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .update({
            ...announcementData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();
        
        if (!error && data) {
          // Log activity
          await supabase.from('activity_logs').insert({
            action: 'announcement_updated',
            metadata: { announcement_id: id, title: data.title }
          });
        }
        
        return { data, error };
      } catch (error) {
        console.error('Error updating announcement:', error);
        return { data: null, error };
      }
    },

    // Delete announcement
    delete: async (id: string) => {
      try {
        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', id);
        
        if (!error) {
          // Log activity
          await supabase.from('activity_logs').insert({
            action: 'announcement_deleted',
            metadata: { announcement_id: id }
          });
        }
        
        return { error };
      } catch (error) {
        console.error('Error deleting announcement:', error);
        return { error };
      }
    }
  },

  // ================= POSTS =================
  posts: {
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles!posts_author_id_fkey(first_name, last_name, email, avatar_url),
            likes:post_likes(count),
            comments:comments(count)
          `)
          .order('created_at', { ascending: false });

        return { data: data || [], error };
      } catch (error) {
        console.error('Error fetching posts:', error);
        return { data: [], error };
      }
    },
    
    create: async (postData: any) => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .insert(postData)
          .select();
        
        if (!error && data) {
          // Log activity
          await supabase.from('activity_logs').insert({
            user_id: postData.author_id,
            action: 'post_created',
            metadata: { post_id: data[0]?.id, title: data[0]?.title }
          });
        }
        
        return { data, error };
      } catch (error) {
        console.error('Error creating post:', error);
        return { data: null, error };
      }
    },

    getCount: async () => {
      try {
        const { count, error } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true });
        return { count: count || 0, error };
      } catch (error) {
        console.error('Error counting posts:', error);
        return { count: 0, error };
      }
    }
  },

  // ================= EVENTS =================
  events: {
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            creator:profiles!events_created_by_fkey(first_name, last_name, avatar_url)
          `)
          .order('start_time', { ascending: true });
        return { data: data || [], error };
      } catch (error) {
        console.error('Error fetching events:', error);
        return { data: [], error };
      }
    },

    getCount: async () => {
      try {
        const { count, error } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true });
        return { count: count || 0, error };
      } catch (error) {
        console.error('Error counting events:', error);
        return { count: 0, error };
      }
    }
  },

  // ================= MESSAGES =================
  messages: {
    getCount: async () => {
      try {
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true });
        return { count: count || 0, error };
      } catch (error) {
        console.error('Error counting messages:', error);
        return { count: 0, error };
      }
    }
  },

  // ================= ACTIVITY LOGS =================
  activityLogs: {
    getAll: async (page: number = 1, limit: number = 50, filters?: any) => {
      try {
        let query = supabase
          .from('activity_logs')
          .select(`
            *,
            profiles:user_id(first_name, last_name, email, avatar_url)
          `, { count: 'exact' })
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters?.action) {
          query = query.eq('action', filters.action);
        }
        
        if (filters?.dateFrom) {
          query = query.gte('created_at', filters.dateFrom);
        }
        
        if (filters?.dateTo) {
          query = query.lte('created_at', filters.dateTo);
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;

        if (error) throw error;

        return {
          data: data || [],
          pagination: {
            total: count || 0,
            page,
            limit,
            pages: Math.ceil((count || 0) / limit)
          },
          error: null
        };
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        return { data: [], pagination: null, error };
      }
    }
  },

  // ================= PAYMENT VERIFICATIONS =================
  payments: {
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('payment_verifications')
          .select(`
            *,
            user:profiles!payment_verifications_user_id_fkey(first_name, last_name, email),
            verifier:profiles!payment_verifications_verified_by_fkey(first_name, last_name)
          `)
          .order('created_at', { ascending: false });

        return { data: data || [], error };
      } catch (error) {
        console.error('Error fetching payments:', error);
        return { data: [], error };
      }
    }
  }
};