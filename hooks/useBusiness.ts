import { useState, useCallback, useMemo } from 'react';
import { businessService } from '../services/supabase/business';
import { Business, BusinessFilters, UserVerificationStatus } from '../types/business';
import { useAuth } from '../contexts/AuthContext';

export const useBusiness = () => {
  const { userProfile } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userStatus = useMemo((): UserVerificationStatus => ({
    user_status: userProfile?.user_status || 'member',
    email: userProfile?.email || '',
    can_create_business: userProfile?.user_status === 'verified'
  }), [userProfile]);

  const getBusinesses = useCallback(async (filters?: BusinessFilters, forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await businessService.getBusinesses(filters, forceRefresh);
      setBusinesses(data);
      return data;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBusinesses = useCallback(async (filters?: BusinessFilters) => {
    try {
      setRefreshing(true);
      const data = await businessService.getBusinesses(filters, true);
      setBusinesses(data);
      return data;
    } catch {
      return [];
    } finally {
      setRefreshing(false);
    }
  }, []);

  const createBusiness = useCallback(async (businessData: any) => {
    try {
      setLoading(true);
      
      if (userProfile?.user_status !== 'verified') {
        throw new Error('Only verified members can create businesses');
      }

      const businessId = await businessService.createBusiness(businessData);
      
      setTimeout(() => {
        refreshBusinesses();
      }, 1000);
      
      return businessId;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create business');
    } finally {
      setLoading(false);
    }
  }, [userProfile, refreshBusinesses]);

  const addReview = useCallback(async (businessId: string, rating: number, comment?: string) => {
    try {
      const result = await businessService.addReview(businessId, rating, comment);
      
      setBusinesses(prev => prev.map(business => 
        business.id === businessId ? {
          ...business,
          average_rating: result.average_rating,
          review_count: result.review_count
        } : business
      ));
      
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to submit review');
    }
  }, []);

  const deleteBusiness = useCallback(async (businessId: string) => {
    try {
      setBusinesses(prev => prev.filter(b => b.id !== businessId));
      await businessService.deleteBusiness(businessId);
      
      setTimeout(() => {
        refreshBusinesses();
      }, 1000);
    } catch (error: any) {
      refreshBusinesses();
      throw new Error(error.message || 'Failed to delete business');
    }
  }, [refreshBusinesses]);

  return useMemo(() => ({
    businesses,
    loading,
    refreshing,
    userStatus,
    getBusinesses,
    refreshBusinesses,
    createBusiness,
    addReview,
    deleteBusiness,
    setBusinesses
  }), [businesses, loading, refreshing, userStatus, getBusinesses, refreshBusinesses, createBusiness, addReview, deleteBusiness]);
};