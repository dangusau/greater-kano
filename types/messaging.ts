export type MessageType = 'text' | 'image' | 'video' | 'audio';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  content: string | null;
  media_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  other_user_status: 'verified' | 'member'; // Added this field
  context: 'connection' | 'marketplace';
  listing_id: string | null;
  listing_title: string | null;
  listing_price: number | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  is_other_user_online: boolean;
  other_user_last_seen: string | null;
}

export interface PendingMessage {
  id: string;
  content: string;
  type: MessageType;
  conversation_id: string;
  sender_id: string;
  created_at: number;
  media_url?: string;
  media_file?: File;
}

export interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  user_profile?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    last_seen: string | null;
    user_status: 'verified' | 'member'; // Added this field
  }
};