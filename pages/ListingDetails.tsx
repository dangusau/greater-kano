import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, MapPin, Eye, MessageCircle, Shield, User, Star, Clock, CheckCircle } from 'lucide-react';
import { useMarketplace } from '../hooks/useMarketplace';
import { MarketplaceListing } from '../types/marketplace';
import { formatTimeAgo } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { messagingService } from '../services/supabase/messaging';

/**
 * ListingDetails Component with caching and optimized for all user types
 */
const ListingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { getListingById, toggleFavorite } = useMarketplace();
  
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [sending, setSending] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  
  // Cache for this component
  const componentCacheRef = useRef<Map<string, { data: MarketplaceListing, timestamp: number }>>(new Map());
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Load listing with caching
  const loadListing = useCallback(async (forceRefresh = false) => {
    try {
      if (!id) return;
      
      // Try to get cached data first
      if (!forceRefresh) {
        const cached = componentCacheRef.current.get(id);
        if (cached) {
          const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
          if (!isExpired) {
            setListing(cached.data);
            setLoading(false);
            
            // Background refresh
            setTimeout(async () => {
              try {
                const freshData = await getListingById(id, true);
                if (freshData) {
                  componentCacheRef.current.set(id, {
                    data: freshData,
                    timestamp: Date.now()
                  });
                  setListing(freshData);
                }
              } catch (error) {
                console.error('Background refresh failed:', error);
              }
            }, 100);
            
            return;
          } else {
            componentCacheRef.current.delete(id);
          }
        }
      }
      
      // Fetch fresh data
      const listingData = await getListingById(id, forceRefresh);
      if (listingData) {
        // Cache the data
        componentCacheRef.current.set(id, {
          data: listingData,
          timestamp: Date.now()
        });
        setListing(listingData);
      }
    } catch (error) {
      console.error('Error loading listing:', error);
    } finally {
      setLoading(false);
    }
  }, [id, getListingById, CACHE_DURATION]);

  useEffect(() => {
    if (id) {
      loadListing();
    }
  }, [id, loadListing]);

  // Refresh listing when returning to page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && id) {
        loadListing(true); // Force refresh when page becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, loadListing]);

  // Optimistic favorite toggle
  const handleFavorite = async () => {
    if (!listing || favoriteLoading || !user) return;
    
    try {
      setFavoriteLoading(true);
      
      // Optimistic update
      const optimisticUpdate = {
        is_favorited: !listing.is_favorited,
        favorite_count: listing.favorite_count + (listing.is_favorited ? -1 : 1)
      };
      
      setListing(prev => prev ? { ...prev, ...optimisticUpdate } : null);
      
      // Update component cache
      if (componentCacheRef.current.has(id!)) {
        const cached = componentCacheRef.current.get(id!);
        if (cached) {
          componentCacheRef.current.set(id!, {
            ...cached,
            data: { ...cached.data, ...optimisticUpdate }
          });
        }
      }
      
      // Perform actual toggle
      const result = await toggleFavorite(listing.id);
      
      // Update with actual result
      setListing(prev => prev ? { ...prev, ...result } : null);
      
      // Update component cache with actual result
      if (componentCacheRef.current.has(id!)) {
        const cached = componentCacheRef.current.get(id!);
        if (cached) {
          componentCacheRef.current.set(id!, {
            ...cached,
            data: { ...cached.data, ...result }
          });
        }
      }
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      
      // Revert optimistic update on error
      if (listing) {
        setListing(listing); // Restore original
      }
      
      // Revert cache
      if (componentCacheRef.current.has(id!) && listing) {
        componentCacheRef.current.set(id!, {
          data: listing,
          timestamp: Date.now()
        });
      }
      
      alert('Failed to update favorite. Please try again.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Contact Seller function - works for all authenticated users
  const handleContactSeller = async () => {
  if (!listing || !user) {
    alert('Please sign in to contact sellers');
    navigate('/login');
    return;
  }
  
  if (listing.is_sold) {
    alert('This item has been sold.');
    return;
  }
  
  if (listing.seller_id === user.id) {
    alert('This is your own listing.');
    return;
  }
  
  try {
    setSending(true);
    
    // 1. Get or create marketplace conversation
    const conversationId = await messagingService.getOrCreateConversation(
      listing.seller_id,
      'marketplace'
    );
    
    // 2. Prepare pre-filled message
    const prefillMessage = `Hi, I'm interested in your listing "${listing.title}"`;
    
    // 3. Navigate to chat window
    navigate(`/messages/${conversationId}`, {
      state: {
        otherUser: {
          id: listing.seller_id,
          name: listing.seller_name,
          status: listing.seller_verified ? 'verified' : 'member'
        },
        context: 'marketplace',
        listing: {
          id: listing.id,
          title: listing.title,
          price: listing.price
        },
        prefillMessage: prefillMessage
      }
    });
    
  } catch (error: any) {
    console.error('Error contacting seller:', error);
    
    if (error.message?.includes('Not authenticated')) {
      alert('Please login to contact sellers');
      navigate('/login');
    } else {
      alert('Failed to contact seller. Please try again.');
    }
  } finally {
    setSending(false);
  }
};

  const handlePreviousImage = () => {
    if (listing && listing.images.length > 0) {
      setSelectedImage(prev => 
        prev === 0 ? listing.images.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (listing && listing.images.length > 0) {
      setSelectedImage(prev => 
        prev === listing.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: listing?.title || 'Marketplace Listing',
        text: `Check out "${listing?.title}" for ₦${listing?.price?.toLocaleString()} on GKBC Marketplace`,
        url: window.location.href,
      };

      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (clipboardError) {
        console.error('Clipboard error:', clipboardError);
      }
    }
  };

  const handleSellerProfileClick = () => {
    if (listing?.seller_id) {
      navigate(`/profile/${listing.seller_id}`);
    }
  };

  const isOwner = listing?.seller_id === user?.id;
  const currentUserVerified = userProfile?.user_status === 'verified';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white safe-area">
        {/* Header Skeleton */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-blue-200 safe-area-top">
          <div className="p-4 flex items-center justify-between">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl animate-pulse border border-blue-200"></div>
            <div className="flex gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl animate-pulse border border-blue-200"></div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl animate-pulse border border-blue-200"></div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="p-4">
          {/* Image Skeleton */}
          <div className="h-80 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl animate-pulse mb-4 border border-blue-200"></div>
          
          {/* Details Skeleton */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="w-2/3 h-8 bg-gradient-to-r from-blue-100 to-blue-50 rounded animate-pulse border border-blue-200"></div>
              <div className="w-1/4 h-8 bg-gradient-to-r from-blue-100 to-blue-50 rounded animate-pulse border border-blue-200"></div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-1/3 h-6 bg-gradient-to-r from-blue-100 to-blue-50 rounded animate-pulse border border-blue-200"></div>
              <div className="w-1/3 h-6 bg-gradient-to-r from-blue-100 to-blue-50 rounded animate-pulse border border-blue-200"></div>
              <div className="w-1/3 h-6 bg-gradient-to-r from-blue-100 to-blue-50 rounded animate-pulse border border-blue-200"></div>
            </div>
            
            <div className="h-32 bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl animate-pulse border border-blue-200"></div>
            
            {/* Seller Info Skeleton */}
            <div className="pt-6 border-t border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-50 rounded-full animate-pulse border border-blue-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="w-1/2 h-4 bg-gradient-to-r from-blue-100 to-blue-50 rounded animate-pulse border border-blue-200"></div>
                  <div className="w-1/3 h-3 bg-gradient-to-r from-blue-100 to-blue-50 rounded animate-pulse border border-blue-200"></div>
                </div>
                <div className="w-24 h-10 bg-gradient-to-r from-blue-100 to-blue-50 rounded-lg animate-pulse border border-blue-200"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center safe-area">
        <div className="text-center p-6 max-w-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200">
            <Shield className="text-red-500" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Listing Not Found</h2>
          <p className="text-gray-600 mb-6">
            This listing may have been removed or is no longer available.
          </p>
          <button 
            onClick={() => navigate('/marketplace')}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all border border-blue-500 min-h-[44px]"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white safe-area">
      {/* Fixed Header with blur effect */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-blue-200 safe-area-top">
        <div className="p-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center bg-white border border-blue-200 rounded-xl hover:bg-blue-50 active:scale-95 transition-all min-h-[44px] min-w-[44px] shadow-sm"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-blue-600" />
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center bg-white border border-blue-200 rounded-xl hover:bg-blue-50 active:scale-95 transition-all min-h-[44px] min-w-[44px] shadow-sm"
              aria-label="Share listing"
            >
              <Share2 size={18} className="text-blue-600" />
            </button>
            
            {!isOwner && user && (
              <button 
                onClick={handleFavorite}
                disabled={favoriteLoading}
                className="w-10 h-10 flex items-center justify-center bg-white border border-blue-200 rounded-xl hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] shadow-sm group"
                aria-label={listing.is_favorited ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart
                  size={18}
                  fill={listing.is_favorited ? '#EF4444' : 'none'}
                  strokeWidth={2.5}
                  className={`transition-all duration-200 ${
                    listing.is_favorited 
                      ? 'text-red-500 group-hover:text-red-600' 
                      : 'text-blue-600 group-hover:text-red-500'
                  }`}
                />
                {favoriteLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative">
        <div className="h-80 bg-gradient-to-br from-blue-100 to-indigo-100 relative overflow-hidden">
          {listing.images[selectedImage] ? (
            <img
              src={listing.images[selectedImage]}
              alt={listing.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-200">
                  <Eye size={24} className="text-blue-400" />
                </div>
                <p className="text-blue-500 font-medium">No image available</p>
              </div>
            </div>
          )}
          
          {/* Image Navigation */}
          {listing.images.length > 1 && (
            <>
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <button
                  onClick={handlePreviousImage}
                  className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition-all min-h-[44px] min-w-[44px] shadow-lg"
                  aria-label="Previous image"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={handleNextImage}
                  className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 active:scale-95 transition-all min-h-[44px] min-w-[44px] shadow-lg"
                  aria-label="Next image"
                >
                  <ArrowLeft size={20} className="rotate-180" />
                </button>
              </div>
              
              {/* Image Counter */}
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
                {selectedImage + 1}/{listing.images.length}
              </div>
            </>
          )}
        </div>
        
        {/* Image Thumbnails */}
        {listing.images.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide">
            {listing.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all min-h-[44px] min-w-[44px] ${
                  selectedImage === idx 
                    ? 'border-blue-500 shadow-md ring-2 ring-blue-200 ring-opacity-50' 
                    : 'border-gray-300 hover:border-blue-300'
                }`}
                aria-label={`View image ${idx + 1}`}
              >
                <img 
                  src={img} 
                  alt={`Thumbnail ${idx + 1}`} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Listing Details Content */}
      <div className="p-4 pb-24">
        {/* Title and Price */}
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-gray-900 pr-2 leading-tight">{listing.title}</h1>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ₦{listing.price.toLocaleString()}
            </span>
            {listing.original_price && listing.original_price > listing.price && (
              <span className="text-sm text-gray-500 line-through">
                ₦{listing.original_price.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-gray-600 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <MapPin size={16} className="text-blue-500" />
            <span className="font-medium text-sm">{listing.location}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <Eye size={16} className="text-gray-500" />
            <span className="font-medium text-sm">{listing.views_count} views</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <Heart size={16} className="text-red-400" fill="#FCA5A5" />
            <span className="font-medium text-sm">{listing.favorite_count}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <Clock size={16} className="text-gray-500" />
            <span className="font-medium text-sm">{formatTimeAgo(listing.created_at)}</span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <span className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium">
            {listing.category}
          </span>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            listing.condition === 'new' 
              ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-200'
              : listing.condition === 'used'
              ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border border-yellow-200'
              : 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 border border-purple-200'
          }`}>
            {listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1)}
          </span>
          {listing.is_sold && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-red-100 to-red-50 text-red-700 border border-red-200 rounded-full text-sm font-medium">
              Sold
            </span>
          )}
          {listing.seller_verified && (
            <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 border border-green-200 rounded-full text-sm font-medium flex items-center gap-1">
              <Shield size={12} />
              Verified Seller
            </span>
          )}
        </div>

        {/* Description */}
        <div className="mb-8">
          <h3 className="font-bold mb-3 text-lg text-gray-900 flex items-center gap-2">
            <span>Description</span>
          </h3>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {listing.description || 'No description provided.'}
            </p>
          </div>
        </div>

        {/* Seller Information */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-900">Seller Information</h3>
            {!isOwner && (
              <button
                onClick={handleContactSeller}
                disabled={sending || listing.is_sold || !user}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all text-sm shadow-lg hover:shadow-xl border border-blue-700 min-h-[44px]"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : listing.is_sold ? (
                  <span>Item Sold</span>
                ) : !user ? (
                  <span>Sign In to Contact</span>
                ) : (
                  <>
                    <MessageCircle size={16} />
                    <span>Contact Seller</span>
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <button 
                onClick={handleSellerProfileClick}
                className="relative group"
                aria-label={`View ${listing.seller_name}'s profile`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-md group-hover:scale-105 transition-transform min-h-[44px] min-w-[44px]">
                  {listing.seller_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                {listing.seller_verified && (
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-green-500 to-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <CheckCircle size={10} className="fill-white" />
                  </div>
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <button 
                    onClick={handleSellerProfileClick}
                    className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-left text-sm md:text-base"
                  >
                    {listing.seller_name}
                  </button>
                  {listing.seller_verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs rounded-full font-medium">
                      <Shield size={8} className="fill-white" />
                      <span>Verified</span>
                    </span>
                  )}
                  {isOwner && (
                    <span className="px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-medium rounded-full">
                      Owner
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  listed {formatTimeAgo(listing.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Tips */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-yellow-600" />
            <h4 className="font-bold text-yellow-800">Safety Tips</h4>
          </div>
          <ul className="text-sm text-yellow-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 font-bold mt-0.5">•</span>
              <span>Meet in a public place during daylight hours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 font-bold mt-0.5">•</span>
              <span>Inspect item thoroughly before payment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 font-bold mt-0.5">•</span>
              <span>Never pay in advance or use wire transfers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 font-bold mt-0.5">•</span>
              <span>Avoid sharing personal or financial information</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Fixed Bottom Action Bar - Only for non-owners */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-blue-200 p-4 z-40 safe-area-bottom">
          <div className="flex gap-3">
            {/* Favorite Button */}
            <button 
              onClick={handleFavorite}
              disabled={favoriteLoading || !user}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-xl font-medium hover:from-gray-200 hover:to-gray-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all border border-gray-300 shadow-sm min-h-[44px]"
            >
              <Heart
                size={18}
                fill={listing.is_favorited ? '#EF4444' : 'none'}
                strokeWidth={2.5}
                className={listing.is_favorited ? 'text-red-500' : 'text-gray-600'}
              />
              <span>{listing.is_favorited ? 'Favorited' : 'Favorite'}</span>
              {favoriteLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>
            
            {/* Contact Seller Button */}
            <button
              onClick={handleContactSeller}
              disabled={sending || listing.is_sold || !user}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all border border-blue-700 min-h-[44px]"
            >
              {sending ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </div>
              ) : listing.is_sold ? (
                'Item Sold'
              ) : !user ? (
                'Sign In'
              ) : (
                'Contact Seller'
              )}
            </button>
          </div>
        </div>
      )}

      {/* CSS for scrollbar hide */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ListingDetails;