export type ConversationContext = 'marketplace' | 'connection';
export type MessageType = 'text' | 'image' | 'video' | 'audio';

export interface Conversation {
  id: string;
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  last_message?: string;
  last_message_at: string;
  unread_count: number;
  context: ConversationContext;
  listing_id?: string;
  listing_title?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  type: MessageType;
  content?: string;
  listing_id?: string;
  listing_title?: string;
  media_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCounts {
  total: number;
  marketplace: number;
  connection: number;
}

export interface ConnectionUser {
  id: string;
  username: string;  // This is a display name, not a database column
  avatar_url?: string;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  price: number;
  user_id: string;
  images?: string[];
}