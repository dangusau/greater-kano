// Update types/explore.ts
export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  salary: string;
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote';
  location: string;
  contact_info: Record<string, any>;
  experience_level?: string;
  category?: string;
  is_verified?: boolean;
  views_count: number;
  created_at: string;
  company_name: string;
  company_avatar: string;
  company_verified?: boolean;
  contact_email?: string;
  contact_phone?: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  image_url: string;
  rsvp_count: number;
  created_at: string;
  organizer_name: string;
  organizer_avatar: string;
  organizer_verified?: boolean;
  user_rsvp_status: string | null;
}

export interface RSVPResult {
  action: string;
  rsvp_status: string | null;
  rsvp_count: number;
}

export interface JobFilters {
  jobType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface EventFilters {
  upcomingOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface UserVerificationStatus {
  user_status: 'verified' | 'member';
  email: string;
  can_create_job: boolean;
  can_create_event: boolean;
}