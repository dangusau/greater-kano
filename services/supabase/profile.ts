// services/supabase/profile.ts
import { supabase } from '../supabase';

const cacheService = {
  saveToCache(key: string, data: any): void {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        key,
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  },

  getFromCache(key: string): any | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      if (now - cacheData.timestamp > 5 * 60 * 1000) {
        localStorage.removeItem(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to read from cache:', error);
      return null;
    }
  },

  clearAllProfileCaches(profileUserId: string): void {
    const prefix = `profile_${profileUserId}_`;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
};

export const profileService = {
  // Data fetching methods
  async getProfileData(profileUserId: string, viewerId: string) {
    const cacheKey = `profile_${profileUserId}_${viewerId}_data`;
    
    const cachedData = cacheService.getFromCache(cacheKey);
    if (cachedData) {
      console.log('Loading profile data from cache');
      this.refreshProfileDataInBackground(profileUserId, viewerId, cacheKey);
      return cachedData;
    }

    console.log('Loading profile data from database');
    const userId = profileUserId === 'current' ? (await supabase.auth.getUser()).data.user?.id : profileUserId;
    const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
    
    const { data, error } = await supabase.rpc('get_user_profile_data', {
      p_profile_user_id: userId,
      p_viewer_id: viewer
    });

    if (error) {
      console.error('Error loading profile data:', error);
      throw error;
    }

    cacheService.saveToCache(cacheKey, data);
    return data;
  },

  async getUserPosts(profileUserId: string, viewerId: string) {
    const cacheKey = `profile_${profileUserId}_${viewerId}_posts`;
    
    const cachedData = cacheService.getFromCache(cacheKey);
    if (cachedData) {
      console.log('Loading posts from cache');
      this.refreshPostsInBackground(profileUserId, viewerId, cacheKey);
      return cachedData;
    }

    console.log('Loading posts from database');
    const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
    
    const { data, error } = await supabase.rpc('get_user_posts', {
      p_profile_user_id: profileUserId,
      p_viewer_id: viewer
    });

    if (error) {
      console.error('Error loading posts:', error);
      throw error;
    }

    const result = data || [];
    cacheService.saveToCache(cacheKey, result);
    return result;
  },

  async getUserListings(profileUserId: string, viewerId: string) {
    const cacheKey = `profile_${profileUserId}_${viewerId}_listings`;
    
    const cachedData = cacheService.getFromCache(cacheKey);
    if (cachedData) {
      console.log('Loading listings from cache');
      this.refreshListingsInBackground(profileUserId, viewerId, cacheKey);
      return cachedData;
    }

    console.log('Loading listings from database');
    const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
    
    const { data, error } = await supabase.rpc('get_user_listings', {
      p_profile_user_id: profileUserId,
      p_viewer_id: viewer
    });

    if (error) {
      console.error('Error loading listings:', error);
      throw error;
    }

    const result = data || [];
    cacheService.saveToCache(cacheKey, result);
    return result;
  },

  async getUserBusinesses(profileUserId: string, viewerId: string) {
    const cacheKey = `profile_${profileUserId}_${viewerId}_businesses`;
    
    const cachedData = cacheService.getFromCache(cacheKey);
    if (cachedData) {
      console.log('Loading businesses from cache');
      this.refreshBusinessesInBackground(profileUserId, viewerId, cacheKey);
      return cachedData;
    }

    console.log('Loading businesses from database');
    const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
    
    const { data, error } = await supabase.rpc('get_user_businesses', {
      p_profile_user_id: profileUserId,
      p_viewer_id: viewer
    });

    if (error) {
      console.error('Error loading businesses:', error);
      throw error;
    }

    const result = data || [];
    cacheService.saveToCache(cacheKey, result);
    return result;
  },

  async getUserJobs(profileUserId: string, viewerId: string) {
    const cacheKey = `profile_${profileUserId}_${viewerId}_jobs`;
    
    const cachedData = cacheService.getFromCache(cacheKey);
    if (cachedData) {
      console.log('Loading jobs from cache');
      this.refreshJobsInBackground(profileUserId, viewerId, cacheKey);
      return cachedData;
    }

    console.log('Loading jobs from database');
    const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
    
    const { data, error } = await supabase.rpc('get_user_jobs', {
      p_profile_user_id: profileUserId,
      p_viewer_id: viewer
    });

    if (error) {
      console.error('Error loading jobs:', error);
      throw error;
    }

    const result = data || [];
    cacheService.saveToCache(cacheKey, result);
    return result;
  },

  async getUserEvents(profileUserId: string, viewerId: string) {
    const cacheKey = `profile_${profileUserId}_${viewerId}_events`;
    
    const cachedData = cacheService.getFromCache(cacheKey);
    if (cachedData) {
      console.log('Loading events from cache');
      this.refreshEventsInBackground(profileUserId, viewerId, cacheKey);
      return cachedData;
    }

    console.log('Loading events from database');
    const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
    
    const { data, error } = await supabase.rpc('get_user_events', {
      p_profile_user_id: profileUserId,
      p_viewer_id: viewer
    });

    if (error) {
      console.error('Error loading events:', error);
      throw error;
    }

    const result = data || [];
    cacheService.saveToCache(cacheKey, result);
    return result;
  },

  // Background refresh methods
  async refreshProfileDataInBackground(profileUserId: string, viewerId: string, cacheKey: string) {
    try {
      const userId = profileUserId === 'current' ? (await supabase.auth.getUser()).data.user?.id : profileUserId;
      const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
      
      const { data, error } = await supabase.rpc('get_user_profile_data', {
        p_profile_user_id: userId,
        p_viewer_id: viewer
      });

      if (!error && data) {
        cacheService.saveToCache(cacheKey, data);
        console.log('Background refresh: Profile data updated');
      }
    } catch (error) {
      console.warn('Background refresh failed for profile data:', error);
    }
  },

  async refreshPostsInBackground(profileUserId: string, viewerId: string, cacheKey: string) {
    try {
      const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
      
      const { data, error } = await supabase.rpc('get_user_posts', {
        p_profile_user_id: profileUserId,
        p_viewer_id: viewer
      });

      if (!error && data) {
        cacheService.saveToCache(cacheKey, data || []);
        console.log('Background refresh: Posts updated');
      }
    } catch (error) {
      console.warn('Background refresh failed for posts:', error);
    }
  },

  async refreshListingsInBackground(profileUserId: string, viewerId: string, cacheKey: string) {
    try {
      const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
      
      const { data, error } = await supabase.rpc('get_user_listings', {
        p_profile_user_id: profileUserId,
        p_viewer_id: viewer
      });

      if (!error && data) {
        cacheService.saveToCache(cacheKey, data || []);
        console.log('Background refresh: Listings updated');
      }
    } catch (error) {
      console.warn('Background refresh failed for listings:', error);
    }
  },

  async refreshBusinessesInBackground(profileUserId: string, viewerId: string, cacheKey: string) {
    try {
      const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
      
      const { data, error } = await supabase.rpc('get_user_businesses', {
        p_profile_user_id: profileUserId,
        p_viewer_id: viewer
      });

      if (!error && data) {
        cacheService.saveToCache(cacheKey, data || []);
        console.log('Background refresh: Businesses updated');
      }
    } catch (error) {
      console.warn('Background refresh failed for businesses:', error);
    }
  },

  async refreshJobsInBackground(profileUserId: string, viewerId: string, cacheKey: string) {
    try {
      const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
      
      const { data, error } = await supabase.rpc('get_user_jobs', {
        p_profile_user_id: profileUserId,
        p_viewer_id: viewer
      });

      if (!error && data) {
        cacheService.saveToCache(cacheKey, data || []);
        console.log('Background refresh: Jobs updated');
      }
    } catch (error) {
      console.warn('Background refresh failed for jobs:', error);
    }
  },

  async refreshEventsInBackground(profileUserId: string, viewerId: string, cacheKey: string) {
    try {
      const viewer = viewerId === 'current' ? (await supabase.auth.getUser()).data.user?.id : viewerId;
      
      const { data, error } = await supabase.rpc('get_user_events', {
        p_profile_user_id: profileUserId,
        p_viewer_id: viewer
      });

      if (!error && data) {
        cacheService.saveToCache(cacheKey, data || []);
        console.log('Background refresh: Events updated');
      }
    } catch (error) {
      console.warn('Background refresh failed for events:', error);
    }
  },

  clearProfileCache(profileUserId: string): void {
    cacheService.clearAllProfileCaches(profileUserId);
  },

  // Connection management using RPC functions
  async toggleConnection(targetUserId: string) {
    const { data, error } = await supabase.rpc('toggle_connection_request', {
      p_target_user_id: targetUserId
    });

    if (error) {
      console.error('Toggle connection RPC error:', error);
      throw error;
    }
    
    console.log('Toggle connection RPC result:', data);
    return data;
  },

  async sendConnectionRequest(targetUserId: string) {
    return this.toggleConnection(targetUserId);
  },

  async withdrawConnectionRequest(targetUserId: string) {
    return this.toggleConnection(targetUserId);
  },

  async disconnectUser(targetUserId: string) {
    return this.toggleConnection(targetUserId);
  },

  async acceptConnectionRequest(connectionId: string) {
    const { data, error } = await supabase.rpc('accept_connection_request', {
      p_request_id: connectionId
    });

    if (error) {
      console.error('Accept connection RPC error:', error);
      throw error;
    }
    
    console.log('Accept connection RPC result:', data);
    return { success: true, data };
  },

  async rejectConnectionRequest(connectionId: string) {
    const { data, error } = await supabase.rpc('reject_connection_request', {
      p_request_id: connectionId
    });

    if (error) {
      console.error('Reject connection RPC error:', error);
      throw error;
    }
    
    console.log('Reject connection RPC result:', data);
    return { success: true, data };
  },

  // Profile update methods
  async updateProfileData(profileData: any) {
    console.log('updateProfileData called with:', profileData);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const updateData: any = {
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      bio: profileData.bio || null,
      phone: profileData.phone || null,
      address: profileData.address || null,
      business_name: profileData.business_name || null,
      business_type: profileData.business_type || null,
      market_area: profileData.market_area || null,
      updated_at: new Date().toISOString()
    };

    console.log('Updating profile with:', updateData);

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    console.log('Profile updated successfully:', data);
    
    this.clearProfileCache(user.id);
    
    return { success: true, data };
  },

  async updateProfileAvatar(file: File) {
    console.log('updateProfileAvatar called with file:', file.name);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    console.log(`Uploading avatar to: ${filePath}`);

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    console.log('Avatar uploaded to:', publicUrl);

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    console.log('Avatar updated successfully');
    
    this.clearProfileCache(user.id);
    
    return { success: true, data };
  },

  async updateProfileHeader(file: File) {
    console.log('updateProfileHeader called with file:', file.name);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `header_${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    console.log(`Uploading header to: ${filePath}`);

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    console.log('Header uploaded to:', publicUrl);

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        header_image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    console.log('Header updated successfully');
    
    this.clearProfileCache(user.id);
    
    return { success: true, data };
  },

  async removeProfileAvatar() {
    console.log('removeProfileAvatar called');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    console.log('Avatar removed successfully');
    
    this.clearProfileCache(user.id);
    
    return { success: true, data };
  },

  async removeProfileHeader() {
    console.log('removeProfileHeader called');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        header_image_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    console.log('Header removed successfully');
    
    this.clearProfileCache(user.id);
    
    return { success: true, data };
  },

  // Content management methods
  async deletePost(postId: string) {
    const { error } = await supabase.rpc('delete_post', {
      p_post_id: postId
    });
    if (error) throw error;
  },

  async updatePost(postId: string, data: any) {
    const { error } = await supabase.rpc('update_post', {
      p_post_id: postId,
      p_content: data.content,
      p_privacy: data.privacy || 'public'
    });
    if (error) throw error;
  },

  async updateListing(listingId: string, data: any) {
    const { error } = await supabase.rpc('update_listing', {
      p_listing_id: listingId,
      p_title: data.title,
      p_description: data.description,
      p_price: data.price,
      p_category: data.category,
      p_condition: data.condition,
      p_location: data.location
    });
    if (error) throw error;
  },

  async deleteListing(listingId: string) {
    const { error } = await supabase.rpc('delete_listing', {
      p_listing_id: listingId
    });
    if (error) throw error;
  },

  async updateBusiness(businessId: string, data: any) {
    const { error } = await supabase.rpc('update_business', {
      p_business_id: businessId,
      p_name: data.name,
      p_description: data.description,
      p_business_type: data.business_type,
      p_category: data.category,
      p_location_axis: data.location_axis,
      p_address: data.address,
      p_email: data.email,
      p_phone: data.phone,
      p_website: data.website
    });
    if (error) throw error;
  },

  async deleteBusiness(businessId: string) {
    const { error } = await supabase.rpc('delete_business', {
      p_business_id: businessId
    });
    if (error) throw error;
  },

  async updateJob(jobId: string, data: any) {
    const { error } = await supabase.rpc('update_job', {
      p_job_id: jobId,
      p_title: data.title,
      p_description: data.description,
      p_salary: data.salary,
      p_job_type: data.job_type,
      p_location: data.location
    });
    if (error) throw error;
  },

  async deleteJob(jobId: string) {
    const { error } = await supabase.rpc('delete_job', {
      p_job_id: jobId
    });
    if (error) throw error;
  },

  async updateEvent(eventId: string, data: any) {
    const { error } = await supabase.rpc('update_event', {
      p_event_id: eventId,
      p_title: data.title,
      p_description: data.description,
      p_event_date: data.event_date,
      p_location: data.location
    });
    if (error) throw error;
  },

  async deleteEvent(eventId: string) {
    const { error } = await supabase.rpc('delete_event', {
      p_event_id: eventId
    });
    if (error) throw error;
  }
};