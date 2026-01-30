import { supabase } from './client';
import { storageService } from './storage';
import { MarketplaceListing, MarketplaceMessage, Conversation, MarketplaceReview } from '../../types/marketplace';

export const marketplaceService = {
  async getListings(filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    search?: string;
    condition?: string;
    limit?: number;
    offset?: number;
  }): Promise<MarketplaceListing[]> {
    try {
      const { data, error } = await supabase.rpc('get_marketplace_listings', {
        p_category: filters?.category,
        p_min_price: filters?.minPrice,
        p_max_price: filters?.maxPrice,
        p_location: filters?.location,
        p_search: filters?.search,
        p_condition: filters?.condition,
        p_limit: filters?.limit || 20,
        p_offset: filters?.offset || 0
      });

      if (error) {
        throw error;
      }
      
      const listings = (data || []).map((item: any) => ({
        id: item.id,
        seller_id: item.seller_id,
        title: item.title,
        description: item.description || '',
        price: item.price,
        category: item.category,
        condition: item.condition,
        location: item.location,
        images: item.images || [],
        views_count: item.views_count || 0,
        is_sold: item.is_sold || false,
        created_at: item.created_at,
        seller_name: item.seller_name || 'Anonymous',
        seller_avatar: item.seller_avatar || '',
        seller_verified: item.seller_verified || false,
        is_favorited: item.is_favorited || false,
        favorite_count: item.favorite_count || 0
      }));
      
      return listings;
    } catch {
      return [];
    }
  },

  async getListingById(listingId: string): Promise<MarketplaceListing | null> {
    try {
      const { data, error } = await supabase.rpc('get_listing_by_id', {
        p_listing_id: listingId
      });

      if (error) {
        throw error;
      }
      
      if (data) {
        return {
          id: data.id,
          seller_id: data.seller_id,
          title: data.title,
          description: data.description || '',
          price: data.price,
          category: data.category,
          condition: data.condition,
          location: data.location,
          images: data.images || [],
          views_count: data.views_count || 0,
          is_sold: data.is_sold || false,
          created_at: data.created_at,
          seller_name: data.seller_name || 'Anonymous',
          seller_avatar: data.seller_avatar || '',
          seller_verified: data.seller_verified || false,
          is_favorited: data.is_favorited || false,
          favorite_count: data.favorite_count || 0
        };
      }
      
      return null;
    } catch {
      return null;
    }
  },

  async createListing(listingData: {
    title: string;
    description: string;
    price: number;
    category: string;
    condition: 'new' | 'used' | 'refurbished';
    location: string;
    images: File[];
  }): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Please sign in to create listings');
      }

      let imageUrls: string[] = [];
      if (listingData.images && listingData.images.length > 0) {
        try {
          imageUrls = await storageService.uploadMarketplaceImages(
            listingData.images, 
            user.id
          );
        } catch {
          imageUrls = [];
        }
      }

      const { data, error } = await supabase.rpc('create_listing', {
        p_title: listingData.title,
        p_description: listingData.description || '',
        p_price: listingData.price,
        p_category: listingData.category,
        p_condition: listingData.condition,
        p_location: listingData.location,
        p_images: imageUrls
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      throw error;
    }
  },

  async toggleFavorite(listingId: string): Promise<{ is_favorited: boolean; favorite_count: number }> {
    try {
      const { data, error } = await supabase.rpc('toggle_listing_favorite', {
        p_listing_id: listingId
      });

      if (error) {
        throw error;
      }
      
      return data;
    } catch {
      throw new Error('Failed to update favorite');
    }
  },

  async deleteListing(listingId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('delete_listing', {
        p_listing_id: listingId
      });

      if (error) throw error;
    } catch {
      throw new Error('Failed to delete listing');
    }
  },

  async sendMessage(listingId: string, receiverId: string, message: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('send_marketplace_message', {
        p_listing_id: listingId,
        p_receiver_id: receiverId,
        p_message: message
      });

      if (error) throw error;
      return data;
    } catch {
      throw new Error('Failed to send message');
    }
  },

  async getMessages(listingId: string, otherUserId: string): Promise<MarketplaceMessage[]> {
    try {
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        p_listing_id: listingId,
        p_other_user_id: otherUserId
      });

      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  async getConversations(): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_conversations');

      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  async addReview(listingId: string, rating: number, comment: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('add_marketplace_review', {
        p_listing_id: listingId,
        p_rating: rating,
        p_comment: comment
      });

      if (error) throw error;
      return data;
    } catch {
      throw new Error('Failed to add review');
    }
  },

  async markAsSold(listingId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_listing_sold', {
        p_listing_id: listingId
      });

      if (error) throw error;
    } catch {
      throw new Error('Failed to mark as sold');
    }
  },

  async getListingStats(): Promise<{
    totalListings: number;
    activeListings: number;
    soldListings: number;
    averagePrice: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_listing_stats');
      
      if (error) {
        return {
          totalListings: 0,
          activeListings: 0,
          soldListings: 0,
          averagePrice: 0
        };
      }
      
      return data || {
        totalListings: 0,
        activeListings: 0,
        soldListings: 0,
        averagePrice: 0
      };
    } catch {
      return {
        totalListings: 0,
        activeListings: 0,
        soldListings: 0,
        averagePrice: 0
      };
    }
  },

  async searchListings(searchParams: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    condition?: string;
    sellerVerified?: boolean;
    sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular';
  }): Promise<MarketplaceListing[]> {
    try {
      const filters: any = {};
      
      if (searchParams.query) filters.search = searchParams.query;
      if (searchParams.category) filters.category = searchParams.category;
      if (searchParams.minPrice) filters.minPrice = searchParams.minPrice;
      if (searchParams.maxPrice) filters.maxPrice = searchParams.maxPrice;
      if (searchParams.location) filters.location = searchParams.location;
      if (searchParams.condition) filters.condition = searchParams.condition;
      
      const listings = await this.getListings(filters);
      
      let filteredListings = listings;
      if (searchParams.sellerVerified !== undefined) {
        filteredListings = listings.filter(listing => 
          listing.seller_verified === searchParams.sellerVerified
        );
      }
      
      if (searchParams.sortBy) {
        switch (searchParams.sortBy) {
          case 'newest':
            filteredListings.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            break;
          case 'price_low':
            filteredListings.sort((a, b) => a.price - b.price);
            break;
          case 'price_high':
            filteredListings.sort((a, b) => b.price - a.price);
            break;
          case 'popular':
            filteredListings.sort((a, b) => {
              const aScore = (b.views_count * 0.3) + (b.favorite_count * 0.7);
              const bScore = (a.views_count * 0.3) + (a.favorite_count * 0.7);
              return bScore - aScore;
            });
            break;
        }
      }
      
      return filteredListings;
    } catch {
      return [];
    }
  },

  async getSimilarListings(listingId: string, limit: number = 4): Promise<MarketplaceListing[]> {
    try {
      const currentListing = await this.getListingById(listingId);
      if (!currentListing) {
        return [];
      }
      
      const similarListings = await this.getListings({
        category: currentListing.category,
        limit
      });
      
      return similarListings
        .filter(listing => listing.id !== listingId)
        .slice(0, limit);
    } catch {
      return [];
    }
  },

  async getUserListings(userId: string): Promise<MarketplaceListing[]> {
    try {
      const allListings = await this.getListings();
      return allListings.filter(listing => listing.seller_id === userId);
    } catch {
      return [];
    }
  },

  async getUserFavorites(userId: string): Promise<MarketplaceListing[]> {
    try {
      const allListings = await this.getListings();
      return allListings.filter(listing => listing.is_favorited);
    } catch {
      return [];
    }
  },

  validateListingData(listingData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!listingData.title || listingData.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters');
    }
    
    if (!listingData.price || listingData.price <= 0) {
      errors.push('Price must be greater than 0');
    }
    
    if (!listingData.category) {
      errors.push('Category is required');
    }
    
    if (!listingData.location || listingData.location.trim().length < 2) {
      errors.push('Valid location is required');
    }
    
    if (!listingData.condition) {
      errors.push('Condition is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  formatPrice(price: number): string {
    return `₦${price.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  },

  getTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
  },

  getPlaceholderImage(category: string): string {
    const placeholders: Record<string, string> = {
      'Electronics': '/placeholder-electronics.jpg',
      'Fashion': '/placeholder-fashion.jpg',
      'Vehicles': '/placeholder-vehicles.jpg',
      'Property': '/placeholder-property.jpg',
      'Services': '/placeholder-services.jpg',
      'Others': '/placeholder-others.jpg'
    };
    
    return placeholders[category] || '/placeholder-default.jpg';
  },

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }
};