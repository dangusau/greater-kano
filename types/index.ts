export interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  media_urls: string[];
  media_type: 'text' | 'image' | 'video' | 'gallery';
  location: string | null;
  tags: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  updated_at: string;
  has_liked: boolean;
  has_shared: boolean;
}

export interface Comment {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  has_liked: boolean;
}

export interface Pioneer {
  id: string;
  name: string;
  title: string;
  image_url: string;
}

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string;
  email: string;
  phone?: string;
  role: string;
  bio: string;
  user_status: 'verified' | 'member';
  business_name: string;
  business_type: string;
  location: string;
  market_area: string;
  address?: string;
  contact_info?: any;
  profile_header_url?: string;
  header_image_url?: string;
  last_seen?: string;
  approval_status?: string;
  payment_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Connection status from current user's perspective
  connection_status?: 'pending_sent' | 'pending_received' | 'accepted' | 'rejected' | 'not_connected' | null;
}

export interface MembersFilter {
  search: string;
  business_type: string;
  market_area: string;
}

// Connection types for the Members system
export interface ConnectionRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  sender_email: string;
  status: string;
  created_at: string;
}

export interface Friend {
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_email: string;
  connected_at: string;
  user_status: 'verified' | 'member';
}

export interface SentRequest {
  id: string;
  connected_user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string;
  created_at: string;
}

export interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ConnectionStatus {
  exists: boolean;
  status?: string;
  isSender?: boolean;
}

// Notification types (for connection notifications)
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'connection_request' | 'connection_accepted' | 'message' | 'system' | 'post_like' | 'comment' | 'share';
  read: boolean;
  created_at: string;
  metadata?: {
    sender_id?: string;
    sender_name?: string;
    post_id?: string;
    comment_id?: string;
    connection_id?: string;
  };
}

// Profile type (extends Member)
export interface Profile extends Member {
  is_online?: boolean;
  mutual_connections?: number;
  posts_count?: number;
  connections_count?: number;
}

// Chat types (for messaging between connected members)
export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  media_url?: string;
  media_type?: 'text' | 'image' | 'video' | 'file';
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message?: ChatMessage;
  unread_count: number;
  created_at: string;
  updated_at: string;
  other_user: {
    id: string;
    name: string;
    avatar: string;
    is_online: boolean;
  };
}