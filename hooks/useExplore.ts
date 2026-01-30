import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { exploreService } from '../services/supabase/explore';
import { Job, Event, RSVPResult, JobFilters, EventFilters } from '../types/explore';

export const useExplore = () => {
  const { userProfile, user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);

  const isVerified = useMemo(() => 
    userProfile?.user_status === 'verified', 
    [userProfile]
  );

  const showAlertAndHide = useCallback(() => {
    setShowVerificationAlert(true);
    setTimeout(() => setShowVerificationAlert(false), 3000);
  }, []);

  const getJobs = useCallback(async (filters?: JobFilters, forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await exploreService.getJobs(filters, forceRefresh);
      setJobs(data);
      return data;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshJobs = useCallback(async (filters?: JobFilters) => {
    try {
      setRefreshing(true);
      const data = await exploreService.getJobs(filters, true);
      setJobs(data);
      return data;
    } finally {
      setRefreshing(false);
    }
  }, []);

  const createJob = useCallback(async (jobData: any) => {
    try {
      if (!isVerified) {
        throw new Error('Only verified members can create job listings.');
      }
      
      setLoading(true);
      const jobId = await exploreService.createJob(jobData);
      
      const optimisticJob: Job = {
        id: jobId,
        company_id: '',
        title: jobData.title,
        description: jobData.description,
        salary: jobData.salary,
        job_type: jobData.job_type,
        location: jobData.location,
        contact_info: jobData.contact_info || {},
        experience_level: jobData.experience_level,
        category: jobData.category,
        views_count: 0,
        created_at: new Date().toISOString(),
        company_name: 'Your Company',
        company_avatar: '',
        company_verified: true
      };
      
      setJobs(prev => [optimisticJob, ...prev]);
      
      setTimeout(() => {
        refreshJobs();
      }, 1000);
      
      return jobId;
    } catch (error: any) {
      if (error.message.includes('Only verified members')) {
        showAlertAndHide();
        throw error;
      }
      throw new Error('Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isVerified, refreshJobs, showAlertAndHide]);

  const getEvents = useCallback(async (filters?: EventFilters, forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await exploreService.getEvents(filters, forceRefresh);
      setEvents(data);
      return data;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshEvents = useCallback(async (filters?: EventFilters) => {
    try {
      setRefreshing(true);
      const data = await exploreService.getEvents(filters, true);
      setEvents(data);
      return data;
    } finally {
      setRefreshing(false);
    }
  }, []);

  const createEvent = useCallback(async (eventData: any) => {
    try {
      if (!isVerified) {
        throw new Error('Only verified members can create events.');
      }
      
      setLoading(true);
      const eventId = await exploreService.createEvent(eventData);
      
      const optimisticEvent: Event = {
        id: eventId,
        organizer_id: '',
        title: eventData.title,
        description: eventData.description,
        event_date: eventData.event_date,
        location: eventData.location,
        image_url: eventData.image_url || '',
        rsvp_count: 0,
        created_at: new Date().toISOString(),
        organizer_name: 'You',
        organizer_avatar: '',
        organizer_verified: true,
        user_rsvp_status: null
      };
      
      setEvents(prev => [optimisticEvent, ...prev]);
      
      setTimeout(() => {
        refreshEvents();
      }, 1000);
      
      return eventId;
    } catch (error: any) {
      if (error.message.includes('Only verified members')) {
        showAlertAndHide();
        throw error;
      }
      throw new Error('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isVerified, refreshEvents, showAlertAndHide]);

  const toggleRSVP = useCallback(async (eventId: string, rsvpStatus: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const oldRSVPStatus = event.user_rsvp_status;
    const oldRSVPCount = event.rsvp_count;
    
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        return oldRSVPStatus ? {
          ...e,
          user_rsvp_status: null,
          rsvp_count: e.rsvp_count - 1
        } : {
          ...e,
          user_rsvp_status: rsvpStatus,
          rsvp_count: e.rsvp_count + 1
        };
      }
      return e;
    }));
    
    try {
      const result = await exploreService.toggleEventRSVP(eventId, rsvpStatus);
      setEvents(prev => prev.map(e => {
        if (e.id === eventId) {
          return {
            ...e,
            rsvp_count: result.rsvp_count,
            user_rsvp_status: result.rsvp_status
          };
        }
        return e;
      }));
      return result;
    } catch {
      setEvents(prev => prev.map(e => {
        if (e.id === eventId) {
          return {
            ...e,
            user_rsvp_status: oldRSVPStatus,
            rsvp_count: oldRSVPCount
          };
        }
        return e;
      }));
      throw new Error('Failed to update RSVP. Please try again.');
    }
  }, [events]);

  const incrementJobViews = useCallback(async (jobId: string) => {
    setJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        return {
          ...job,
          views_count: job.views_count + 1
        };
      }
      return job;
    }));
    
    exploreService.incrementJobViews(jobId);
  }, []);

  return {
    jobs,
    events,
    loading,
    refreshing,
    isVerified,
    showVerificationAlert,
    getJobs,
    refreshJobs,
    createJob,
    getEvents,
    refreshEvents,
    createEvent,
    toggleRSVP,
    incrementJobViews,
    showAlertAndHide,
    setJobs,
    setEvents,
    setShowVerificationAlert
  };
};