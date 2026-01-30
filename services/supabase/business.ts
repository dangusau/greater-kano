// Updated services/supabase/business.ts - Fixed RPC calls
import { supabase } from './client';
import { storageService } from './storage';
import { Business, BusinessFilters, UserVerificationStatus, Review } from '../../types/business';
import { appCache } from '../../shared/services/UniversalCache';

const CACHE_KEYS = {
  BUSINESSES: 'gkbc_businesses_cache',
  USER_STATUS: 'gkbc_user_status_cache',
  BUSINESS_DETAILS: 'gkbc_business_details_'
};

const CACHE_TTL = {
  BUSINESSES: 5 * 60 * 1000,
  USER_STATUS: 10 * 60 * 1000,
  BUSINESS_DETAILS: 5 * 60 * 1000
};

export const businessService = {
  async getBusinesses(filters?: BusinessFilters, forceRefresh = false): Promise<Business[]> {
    try {
      const cacheKey = `${CACHE_KEYS.BUSINESSES}_${JSON.stringify(filters || {})}`;
      
      if (!forceRefresh) {
        const cached = await appCache.get<Business[]>(cacheKey);
        if (cached) return cached;
      }
      
      const { data, error } = await supabase.rpc('get_businesses_with_owners', {
        p_business_type: filters?.business_type,
        p_category: filters?.category,
        p_location_axis: filters?.location_axis,
        p_search: filters?.search,
        p_min_rating: filters?.min_rating,
        p_limit: filters?.limit || 20,
        p_offset: filters?.offset || 0
      });

      if (error) {
        const cached = await appCache.get<Business[]>(cacheKey);
        return cached || [];
      }
      
      const businesses = data || [];
      await appCache.set(cacheKey, businesses, CACHE_TTL.BUSINESSES);
      return businesses;
    } catch {
      const cacheKey = `${CACHE_KEYS.BUSINESSES}_${JSON.stringify(filters || {})}`;
      const cached = await appCache.get<Business[]>(cacheKey);
      return cached || [];
    }
  },

  async createBusiness(businessData: {
    name: string;
    description: string;
    business_type: 'products' | 'services';
    category: string;
    location_axis: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
    logo_file?: File;
    banner_file?: File;
    is_registered?: boolean;
  }): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Please sign in to create a business');
      }

      let logo_url: string | undefined;
      let banner_url: string | undefined;

      if (businessData.logo_file) {
        const [logoUrl] = await storageService.uploadBusinessImages(
          [businessData.logo_file],
          user.id
        );
        logo_url = logoUrl;
      }

      if (businessData.banner_file) {
        const [bannerUrl] = await storageService.uploadBusinessImages(
          [businessData.banner_file],
          user.id
        );
        banner_url = bannerUrl;
      }

      const { data, error } = await supabase.rpc('create_business_with_verification_check', {
        p_name: businessData.name,
        p_description: businessData.description,
        p_business_type: businessData.business_type,
        p_category: businessData.category,
        p_location_axis: businessData.location_axis,
        p_address: businessData.address || null,
        p_email: businessData.email || null,
        p_phone: businessData.phone || null,
        p_website: businessData.website || null,
        p_logo_url: logo_url || null,
        p_banner_url: banner_url || null,
        p_is_registered: businessData.is_registered || false
      });

      if (error) {
        if (error.message.includes('Only verified users can create businesses')) {
          throw new Error('Only verified members can create businesses. Please contact support.');
        }
        throw new Error('Failed to create business. Please try again.');
      }

      await this.clearBusinessCaches();
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create business');
    }
  },

  async getUserVerificationStatus(forceRefresh = false): Promise<UserVerificationStatus> {
    try {
      if (!forceRefresh) {
        const cached = await appCache.get<UserVerificationStatus>(CACHE_KEYS.USER_STATUS);
        if (cached) return cached;
      }
      
      const { data } = await supabase.rpc('get_user_verification_status');
      
      const status = data || { user_status: 'member', email: '', can_create_business: false };
      await appCache.set(CACHE_KEYS.USER_STATUS, status, CACHE_TTL.USER_STATUS);
      
      return status;
    } catch {
      const cached = await appCache.get<UserVerificationStatus>(CACHE_KEYS.USER_STATUS);
      return cached || { user_status: 'member', email: '', can_create_business: false };
    }
  },

  async addReview(businessId: string, rating: number, comment?: string): Promise<{ average_rating: number; review_count: number }> {
    try {
      const { data, error } = await supabase.rpc('add_business_review', {
        p_business_id: businessId,
        p_rating: rating,
        p_comment: comment || null
      });

      if (error) throw error;
      
      await appCache.remove(`${CACHE_KEYS.BUSINESS_DETAILS}${businessId}`);
      await this.clearBusinessCaches();
      
      return data;
    } catch {
      throw new Error('Failed to submit review. Please try again.');
    }
  },

  async getBusinessDetails(businessId: string, forceRefresh = false): Promise<{ business: Business; reviews: Review[] }> {
    try {
      const cacheKey = `${CACHE_KEYS.BUSINESS_DETAILS}${businessId}`;
      
      if (!forceRefresh) {
        const cached = await appCache.get<{ business: Business; reviews: Review[] }>(cacheKey);
        if (cached) return cached;
      }
      
      const { data, error } = await supabase.rpc('get_business_details', {
        p_business_id: businessId
      });

      if (error) {
        const cached = await appCache.get<{ business: Business; reviews: Review[] }>(cacheKey);
        if (cached) return cached;
        throw error;
      }
      
      const result = data;
      await appCache.set(cacheKey, result, CACHE_TTL.BUSINESS_DETAILS);
      
      return result;
    } catch {
      throw new Error('Failed to load business details');
    }
  },

  async getCategories(): Promise<{ category: string; business_type: string; count: number }[]> {
    try {
      const { data, error } = await supabase.rpc('get_business_categories');
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  async getLocationCounts(): Promise<{ location_axis: string; count: number }[]> {
    try {
      const { data, error } = await supabase.rpc('get_location_axis_counts');
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  async deleteBusiness(businessId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('delete_business', {
        p_business_id: businessId
      });

      if (error) throw error;
      await this.clearBusinessCaches();
    } catch {
      throw new Error('Failed to delete business');
    }
  },

  async clearBusinessCaches(): Promise<void> {
    const keys = await appCache.getAllKeys();
    for (const key of keys) {
      if (key.startsWith(CACHE_KEYS.BUSINESSES) || key.startsWith(CACHE_KEYS.BUSINESS_DETAILS)) {
        await appCache.remove(key);
      }
    }
  }
};