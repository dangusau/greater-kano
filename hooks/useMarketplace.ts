import { useState, useCallback } from 'react';
import { marketplaceService } from '../services/supabase/marketplace';
import { MarketplaceListing, Conversation, MarketplaceMessage } from '../types/marketplace';
import { appCache } from '../shared/services/UniversalCache';

export const useMarketplace = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const CACHE_KEY = 'marketplace_listings';
  const CACHE_TTL = 5 * 60 * 1000;

  const generateCacheKey = useCallback((filters?: any): string => {
    if (!filters) return CACHE_KEY;
    return `${CACHE_KEY}_${JSON.stringify(filters)}`;
  }, []);

  const getListings = useCallback(async (filters?: any, forceRefresh = false) => {
    try {
      const cacheKey = generateCacheKey(filters);
      
      if (!forceRefresh) {
        const cachedData = await appCache.get(cacheKey);
        if (cachedData) {
          setListings(cachedData);
          return cachedData;
        }
      }
      
      setLoading(true);
      const data = await marketplaceService.getListings(filters);
      setListings(data);
      
      if (data.length > 0) {
        await appCache.set(cacheKey, data, CACHE_TTL);
      }
      
      return data;
    } catch {
      const cacheKey = generateCacheKey(filters);
      const cachedData = await appCache.get(cacheKey);
      if (cachedData) {
        setListings(cachedData);
        return cachedData;
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [generateCacheKey]);

  const getListingById = useCallback(async (listingId: string, forceRefresh = false): Promise<MarketplaceListing | null> => {
    try {
      const cacheKey = `${CACHE_KEY}_${listingId}`;
      
      if (!forceRefresh) {
        const cachedListing = await appCache.get(cacheKey);
        if (cachedListing) {
          return cachedListing;
        }
      }
      
      setLoading(true);
      const listingData = await marketplaceService.getListingById(listingId);
      
      if (listingData) {
        await appCache.set(cacheKey, listingData, CACHE_TTL);
      }
      
      return listingData;
    } catch {
      const cacheKey = `${CACHE_KEY}_${listingId}`;
      const cachedListing = await appCache.get(cacheKey);
      if (cachedListing) {
        return cachedListing;
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createListing = useCallback(async (listingData: any) => {
    try {
      setLoading(true);
      
      const tempListing: MarketplaceListing = {
        id: 'temp-' + Date.now(),
        seller_id: 'current-user',
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        category: listingData.category,
        condition: listingData.condition,
        location: listingData.location,
        images: listingData.images.map(() => '/placeholder-image.jpg'),
        views_count: 0,
        is_sold: false,
        created_at: new Date().toISOString(),
        seller_name: 'You',
        seller_avatar: '',
        seller_verified: true,
        is_favorited: false,
        favorite_count: 0
      };
      
      setListings(prev => [tempListing, ...prev]);
      
      const listingId = await marketplaceService.createListing(listingData);
      
      await appCache.remove(CACHE_KEY);
      
      await getListings();
      return listingId;
    } catch {
      setListings(prev => prev.filter(l => !l.id.startsWith('temp-')));
      throw new Error('Failed to create listing');
    } finally {
      setLoading(false);
    }
  }, [getListings]);

  const toggleFavorite = useCallback(async (listingId: string) => {
    try {
      const currentListing = listings.find(l => l.id === listingId);
      if (!currentListing) return null;
      
      const optimisticUpdate = {
        is_favorited: !currentListing.is_favorited,
        favorite_count: currentListing.favorite_count + (currentListing.is_favorited ? -1 : 1)
      };
      
      setListings(prev => prev.map(listing => 
        listing.id === listingId 
          ? { ...listing, ...optimisticUpdate }
          : listing
      ));
      
      const result = await marketplaceService.toggleFavorite(listingId);
      
      setListings(prev => prev.map(listing => 
        listing.id === listingId 
          ? { ...listing, ...result }
          : listing
      ));
      
      await appCache.remove(CACHE_KEY);
      
      return result;
    } catch {
      const originalListing = listings.find(l => l.id === listingId);
      if (originalListing) {
        setListings(prev => prev.map(listing => 
          listing.id === listingId 
            ? { ...listing, ...originalListing }
            : listing
        ));
      }
      throw new Error('Failed to toggle favorite');
    }
  }, [listings]);

  const deleteListing = useCallback(async (listingId: string) => {
    try {
      setListings(prev => prev.filter(listing => listing.id !== listingId));
      
      await appCache.remove(CACHE_KEY);
      
      await marketplaceService.deleteListing(listingId);
    } catch {
      await getListings();
      throw new Error('Failed to delete listing');
    }
  }, [getListings]);

  const getConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await marketplaceService.getConversations();
      setConversations(data);
      return data;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getMessages = useCallback(async (listingId: string, otherUserId: string) => {
    try {
      setLoading(true);
      const data = await marketplaceService.getMessages(listingId, otherUserId);
      setMessages(data);
      return data;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (listingId: string, receiverId: string, message: string) => {
    try {
      const tempMessage: MarketplaceMessage = {
        id: 'temp-' + Date.now(),
        listing_id: listingId,
        sender_id: 'current-user',
        receiver_id: receiverId,
        message,
        is_read: false,
        created_at: new Date().toISOString(),
        sender_name: 'You',
        sender_avatar: ''
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      const messageId = await marketplaceService.sendMessage(listingId, receiverId, message);
      
      setMessages(prev => prev.map(msg => 
        msg.id.startsWith('temp-') 
          ? { ...msg, id: messageId }
          : msg
      ));
      
      return messageId;
    } catch {
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      throw new Error('Failed to send message');
    }
  }, []);

  const addReview = useCallback(async (listingId: string, rating: number, comment: string) => {
    try {
      const reviewId = await marketplaceService.addReview(listingId, rating, comment);
      return reviewId;
    } catch {
      throw new Error('Failed to add review');
    }
  }, []);

  return {
    listings,
    conversations,
    messages,
    loading,
    getListings,
    getListingById,
    createListing,
    toggleFavorite,
    deleteListing,
    getConversations,
    getMessages,
    sendMessage,
    addReview,
    setListings,
    setConversations,
    setMessages
  };
};