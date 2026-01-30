export interface MarketplaceListing {
  id: string;
  listing_id?: string; // Optional for database response
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  location: string;
  images: string[];
  views_count: number;
  is_sold: boolean;
  created_at: string;
  seller_name: string;
  seller_avatar: string;
  seller_verified: boolean;
  is_favorited: boolean;
  favorite_count: number;
}

export interface MarketplaceMessage {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
}

export interface Conversation {
  listing_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string;
  listing_title: string;
  listing_price: number;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}