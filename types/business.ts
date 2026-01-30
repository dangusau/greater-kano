export interface Business {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  business_type: 'products' | 'services';
  category: string;
  location_axis: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  logo_url: string;
  banner_url: string;
  is_registered: boolean;
  verification_status: 'pending' | 'approved' | 'rejected';
  average_rating: number;
  review_count: number;
  reviews: Review[];
  created_at: string;
  updated_at: string;
  owner_name?: string;
  owner_avatar?: string;
  owner_verified?: boolean;
}

export interface Review {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_verified?: boolean;
  rating: number;
  comment: string;
  created_at: string;
}

export interface BusinessFilters {
  business_type?: 'products' | 'services';
  category?: string;
  location_axis?: string;
  search?: string;
  min_rating?: number;
  limit?: number;
  offset?: number;
}

export interface UserVerificationStatus {
  user_status: 'verified' | 'member';
  email: string;
  can_create_business: boolean;
}

export const LOCATION_AXIS = [
  'Central / Old City',
  'Sabon Gari / Kantin Kwari',
  'Farm Center / Beirut',
  'France Road',
  'Zoo Road',
  'Zaria Road',
  'Dawanau',
  'Sharada / Challawa',
  'Hotoro',
  'Gyadi-Gyadi / Tarauni',
  'Jigawa Road',
  'Mariri / Sheka',
  'Bompai',
  'Transport (Kano Line / Sabon Gari Park)',
  'Others'
] as const;