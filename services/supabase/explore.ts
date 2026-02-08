import { supabase } from '../supabase';
import { appCache } from '../../shared/services/UniversalCache';
import { Job, Event, RSVPResult, JobFilters, EventFilters } from '../../types/explore';

const CACHE_KEYS = {
  JOBS: 'gkbc_jobs_cache',
  EVENTS: 'gkbc_events_cache'
};

const CACHE_TTL = {
  JOBS: 5 * 60 * 1000,
  EVENTS: 5 * 60 * 1000
};

export const exploreService = {
  async getJobs(filters?: JobFilters, forceRefresh = false): Promise<Job[]> {
    try {
      const cacheKey = `${CACHE_KEYS.JOBS}_${JSON.stringify(filters || {})}`;
      
      if (!forceRefresh) {
        const cached = await appCache.get(cacheKey);
        if (cached) return cached as Job[];
      }
      
      const { data, error } = await supabase.rpc('get_jobs_list', {
        p_job_type: filters?.jobType,
        p_search: filters?.search,
        p_limit: filters?.limit || 20,
        p_offset: filters?.offset || 0
      });

      if (error) {
        const cached = await appCache.get(cacheKey);
        if (cached) return cached as Job[];
        throw new Error('Failed to load jobs. Please try again.');
      }
      
      const jobs = data || [];
      await appCache.set(cacheKey, jobs, CACHE_TTL.JOBS);
      
      return jobs;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to load jobs. Please try again.');
    }
  },

  async createJob(jobData: {
    title: string;
    description: string;
    salary: string;
    job_type: string;
    location: string;
    experience_level?: string;
    category?: string;
    contact_info?: Record<string, any>;
  }): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_job_with_verification_check', {
        p_title: jobData.title,
        p_description: jobData.description,
        p_salary: jobData.salary,
        p_job_type: jobData.job_type,
        p_location: jobData.location,
        p_experience_level: jobData.experience_level || null,
        p_category: jobData.category || null,
        p_contact_info: jobData.contact_info || {}
      });

      if (error) {
        if (error.message.includes('Only verified users can create jobs')) {
          throw new Error('Only verified members can create job listings.');
        }
        throw new Error('Failed to create job. Please try again.');
      }

      await appCache.removePattern(CACHE_KEYS.JOBS);
      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create job. Please try again.');
    }
  },

  async getEvents(filters?: EventFilters, forceRefresh = false): Promise<Event[]> {
    try {
      const cacheKey = `${CACHE_KEYS.EVENTS}_${JSON.stringify(filters || {})}`;
      
      if (!forceRefresh) {
        const cached = await appCache.get(cacheKey);
        if (cached) return cached as Event[];
      }
      
      const { data, error } = await supabase.rpc('get_events_list', {
        p_upcoming_only: filters?.upcomingOnly ?? true,
        p_search: filters?.search,
        p_limit: filters?.limit || 20,
        p_offset: filters?.offset || 0
      });

      if (error) {
        const cached = await appCache.get(cacheKey);
        if (cached) return cached as Event[];
        throw new Error('Failed to load events. Please try again.');
      }
      
      const events = data || [];
      await appCache.set(cacheKey, events, CACHE_TTL.EVENTS);
      
      return events;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to load events. Please try again.');
    }
  },

  async createEvent(eventData: {
    title: string;
    description: string;
    event_date: string;
    location: string;
    image_url?: string;
  }): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_event_with_verification_check', {
        p_title: eventData.title,
        p_description: eventData.description,
        p_event_date: eventData.event_date,
        p_location: eventData.location,
        p_image_url: eventData.image_url || null
      });

      if (error) {
        if (error.message.includes('Only verified users can create events')) {
          throw new Error('Only verified members can create events.');
        }
        throw new Error('Failed to create event. Please try again.');
      }

      await appCache.removePattern(CACHE_KEYS.EVENTS);
      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create event. Please try again.');
    }
  },

  async toggleEventRSVP(eventId: string, rsvpStatus: string = 'going'): Promise<RSVPResult> {
    try {
      const { data, error } = await supabase.rpc('toggle_event_rsvp', {
        p_event_id: eventId,
        p_rsvp_status: rsvpStatus
      });

      if (error) {
        throw new Error('Failed to update RSVP. Please try again.');
      }
      
      await appCache.removePattern(CACHE_KEYS.EVENTS);
      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to update RSVP. Please try again.');
    }
  },

  async incrementJobViews(jobId: string): Promise<void> {
    try {
      await supabase.rpc('increment_job_views', {
        p_job_id: jobId
      });
    } catch (error) {
      // Silent fail for view increments
    }
  }
};