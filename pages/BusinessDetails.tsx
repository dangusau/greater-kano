import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Phone, Mail, Globe, Share2, User, CheckCircle, AlertCircle } from 'lucide-react';
import { businessService } from '../services/supabase/business';
import { Business, Review } from '../types/business';
import { formatTimeAgo } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import VerifiedBadge from '../components/VerifiedBadge';
import { appCache } from '../shared/services/UniversalCache';

const CACHE_KEY_PREFIX = 'gkbc_business_details_';
const CACHE_TTL = 5 * 60 * 1000;

const BusinessDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState<string>('');

  const isVerified = userProfile?.user_status === 'verified';
  const isOwner = useMemo(() => business?.owner_id === user?.id, [business, user]);

  const loadBusiness = useCallback(async (forceRefresh = false) => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError('');
      
      if (!forceRefresh) {
        const cacheKey = CACHE_KEY_PREFIX + id;
        const cached = await appCache.get<{ business: Business; reviews: Review[] }>(cacheKey);
        if (cached) {
          setBusiness(cached.business);
          setReviews(cached.reviews || []);
          setLoading(false);
          setTimeout(() => refreshBusiness(), 100);
          return;
        }
      }
      
      await fetchBusiness();
    } catch {
      setError('Failed to load business details');
      setLoading(false);
    }
  }, [id]);

  const fetchBusiness = useCallback(async () => {
    if (!id) return;
    
    try {
      const data = await businessService.getBusinessDetails(id, true);
      if (data?.business) {
        setBusiness(data.business);
        setReviews(data.reviews || []);
        
        const cacheKey = CACHE_KEY_PREFIX + id;
        await appCache.set(cacheKey, data, CACHE_TTL);
      } else {
        setBusiness(null);
        setReviews([]);
      }
    } catch {
      const cacheKey = CACHE_KEY_PREFIX + id;
      const cached = await appCache.get<{ business: Business; reviews: Review[] }>(cacheKey);
      if (cached) {
        setBusiness(cached.business);
        setReviews(cached.reviews || []);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refreshBusiness = useCallback(async () => {
    if (!id || refreshing) return;
    
    try {
      setRefreshing(true);
      const data = await businessService.getBusinessDetails(id, true);
      if (data?.business) {
        setBusiness(data.business);
        setReviews(data.reviews || []);
        
        const cacheKey = CACHE_KEY_PREFIX + id;
        await appCache.set(cacheKey, data, CACHE_TTL);
      }
    } catch {
      // Silent fail - keep existing data
    } finally {
      setRefreshing(false);
    }
  }, [id, refreshing]);

  const checkUserReview = useCallback(() => {
    if (user && reviews.length > 0) {
      const userReview = reviews.find(review => review.user_id === user.id);
      setHasSubmittedReview(!!userReview);
    } else {
      setHasSubmittedReview(false);
    }
  }, [user, reviews]);

  useEffect(() => {
    if (id) {
      loadBusiness();
      const refreshInterval = setInterval(refreshBusiness, 30000);
      return () => clearInterval(refreshInterval);
    }
  }, [id, loadBusiness, refreshBusiness]);

  useEffect(() => {
    checkUserReview();
  }, [checkUserReview]);

  const handleAddReview = useCallback(async () => {
    if (!business || !newReview.comment.trim() || !user) return;
    
    if (business.owner_id === user.id) {
      setError('You cannot review your own business');
      return;
    }
    
    if (hasSubmittedReview) {
      setError('You have already submitted a review');
      return;
    }
    
    setSubmittingReview(true);
    setError('');
    
    const optimisticReview: Review = {
      id: `temp_${Date.now()}`,
      user_id: user.id,
      user_name: 'You',
      user_avatar: '',
      user_verified: isVerified,
      rating: newReview.rating,
      comment: newReview.comment,
      created_at: new Date().toISOString()
    };
    
    const optimisticReviews = [optimisticReview, ...reviews];
    setReviews(optimisticReviews);
    setHasSubmittedReview(true);
    
    const totalReviews = optimisticReviews.length;
    const totalRating = optimisticReviews.reduce((sum, review) => sum + review.rating, 0);
    const optimisticAverageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
    
    if (business) {
      setBusiness({
        ...business,
        average_rating: optimisticAverageRating,
        review_count: totalReviews
      });
    }
    
    const oldReview = { ...newReview };
    setNewReview({ rating: 5, comment: '' });
    
    try {
      const result = await businessService.addReview(business.id, oldReview.rating, oldReview.comment);
      
      if (business) {
        setBusiness({
          ...business,
          average_rating: result.average_rating,
          review_count: result.review_count
        });
      }
      
      setTimeout(refreshBusiness, 500);
    } catch {
      if (business) {
        setBusiness(business);
      }
      setReviews(reviews.filter(r => !r.id.startsWith('temp_')));
      setHasSubmittedReview(false);
      setNewReview(oldReview);
      setError('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  }, [business, newReview, user, hasSubmittedReview, isVerified, reviews, refreshBusiness]);

  const getAnonymousName = useCallback((userId: string, index: number): string => {
    const colors = ['Blue', 'Green', 'Red', 'Yellow', 'Purple', 'Orange', 'Pink', 'Teal'];
    const animals = ['Lion', 'Tiger', 'Bear', 'Wolf', 'Fox', 'Eagle', 'Dolphin', 'Hawk', 'Spider'];
    
    const colorIndex = Math.abs(userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
    const animalIndex = Math.abs(userId.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0)) % animals.length;
    
    return `${colors[colorIndex]} ${animals[animalIndex]}`;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white safe-area">
        <div className="animate-pulse">
          <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300 mb-3"></div>
          <div className="p-3">
            <div className="flex items-end gap-3 mb-4">
              <div className="w-20 h-20 bg-gray-300 rounded-xl border border-blue-200"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-5/6 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center safe-area">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center border border-blue-200 mx-auto mb-3">
            <AlertCircle className="text-blue-500" size={24} />
          </div>
          <h2 className="text-sm font-bold text-gray-900 mb-2">Business Not Found</h2>
          <p className="text-gray-600 text-xs mb-4">The business doesn't exist or has been removed.</p>
          <button 
            onClick={() => navigate('/businesses')}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 border border-blue-800 min-h-[36px] text-xs"
            aria-label="Back to businesses"
          >
            Back to Businesses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white safe-area">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-blue-200 z-10 p-3 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-blue-200 hover:bg-blue-50 active:scale-95 transition-all min-h-[36px] min-w-[36px]"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-blue-600" />
        </button>
        <h1 className="font-bold text-gray-900 text-xs truncate mx-2">{business.name}</h1>
        <button 
          className="p-2 rounded-xl border border-blue-200 hover:bg-blue-50 active:scale-95 transition-all min-h-[36px] min-w-[36px]"
          aria-label="Share business"
        >
          <Share2 size={16} className="text-blue-600" />
        </button>
      </div>

      {/* Banner */}
      <div className="h-48 bg-gradient-to-r from-blue-500 to-blue-500 relative overflow-hidden border-b border-blue-300">
        {business.banner_url ? (
          <img
            src={business.banner_url}
            alt={business.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Globe size={24} className="text-white/80" />
              </div>
              <p className="text-white/90 font-medium text-xs">Business Banner</p>
            </div>
          </div>
        )}
        
        {isOwner && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold rounded-full border border-blue-800">
            Your Business
          </div>
        )}
      </div>

      {/* Business Info */}
      <div className="p-3 -mt-10 relative">
        <div className="flex items-end gap-3 mb-4">
          <div className="relative w-20 h-20 bg-white border-4 border-white rounded-xl shadow-lg overflow-hidden border border-blue-300">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                <Globe size={20} className="text-blue-600" />
              </div>
            )}
            {business.owner_verified && (
              <div className="absolute -top-1 -right-1">
                <VerifiedBadge size={1} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              <h1 className="text-sm font-bold text-gray-900 truncate">{business.name}</h1>
              {business.owner_verified && <VerifiedBadge size={12} />}
              {business.is_registered && business.verification_status === 'approved' && (
                <div className="flex-shrink-0">
                  <div className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full border border-green-600 flex items-center gap-1">
                    <CheckCircle size={8} />
                    Verified
                  </div>
                </div>
              )}
            </div>
            
            {business.owner_name && (
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs text-gray-600">By</span>
                <span className="text-xs font-medium text-gray-800 flex items-center gap-1">
                  {business.owner_name}
                  {business.owner_verified && <VerifiedBadge size={12} />}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-gray-600">
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-gray-900 text-xs">{business.average_rating.toFixed(1)}</span>
                <span className="text-gray-500 text-xs">({business.review_count})</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-blue-500" />
                <span className="font-medium text-xs">{business.location_axis}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Type & Category */}
        <div className="flex gap-1 mb-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${business.business_type === 'products' 
            ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 text-blue-700' 
            : 'bg-gradient-to-r from-green-50 to-green-100 border-green-300 text-green-700'}`}>
            {business.business_type === 'products' ? 'Products' : 'Services'}
          </span>
          <span className="px-2 py-1 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 text-gray-700 rounded-full text-xs font-medium">
            {business.category}
          </span>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-blue-200 p-3 mb-4">
          <h3 className="font-bold text-gray-900 mb-2 text-xs border-b border-blue-100 pb-2">About</h3>
          <p className="text-gray-700 text-xs whitespace-pre-line leading-relaxed">{business.description}</p>
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-3 mb-4">
          <h3 className="font-bold text-gray-900 mb-3 text-xs border-b border-blue-200 pb-2">Contact Information</h3>
          <div className="space-y-3">
            {business.address && (
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-white border border-blue-200">
                  <MapPin size={14} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-1">Address</p>
                  <p className="text-gray-900 font-medium text-xs">{business.address}</p>
                </div>
              </div>
            )}
            {business.phone && (
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-white border border-blue-200">
                  <Phone size={14} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-1">Phone</p>
                  <a href={`tel:${business.phone}`} className="text-blue-700 font-medium hover:text-blue-800 text-xs">
                    {business.phone}
                  </a>
                </div>
              </div>
            )}
            {business.email && (
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-white border border-blue-200">
                  <Mail size={14} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-1">Email</p>
                  <a href={`mailto:${business.email}`} className="text-blue-700 font-medium hover:text-blue-800 truncate block text-xs">
                    {business.email}
                  </a>
                </div>
              </div>
            )}
            {business.website && (
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-white border border-blue-200">
                  <Globe size={14} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-1">Website</p>
                  <a 
                    href={business.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-700 font-medium hover:text-blue-800 truncate block text-xs"
                  >
                    {business.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-xs">{error}</p>
          </div>
        )}

        {/* Reviews Section */}
        {!isOwner && (
          <div className="pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-xs">Reviews</h3>
                <p className="text-xs text-gray-600">({business.review_count} reviews)</p>
              </div>
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-gray-900 text-xs">{business.average_rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Add Review Form */}
            {user && !hasSubmittedReview && (
              <div className="bg-white rounded-xl border border-blue-200 p-3 mb-4">
                <h4 className="font-bold text-gray-900 mb-3 text-xs border-b border-blue-100 pb-2">Add Your Review</h4>
                
                <div className="flex gap-1 mb-3 justify-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                      className="p-1.5 hover:scale-110 active:scale-95 transition-transform min-h-[36px] min-w-[36px]"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        size={20}
                        className={`transition-colors ${
                          star <= newReview.rating 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                
                <div className="text-center mb-3">
                  <span className="text-gray-700 font-medium text-xs">Selected: {newReview.rating} star{newReview.rating !== 1 ? 's' : ''}</span>
                </div>
                
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your experience..."
                  className="w-full p-2.5 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-3 min-h-[100px] text-xs"
                  rows={3}
                  maxLength={500}
                />
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>Your review will be anonymous</span>
                  </div>
                  <span>{newReview.comment.length}/500</span>
                </div>
                
                <button
                  onClick={handleAddReview}
                  disabled={!newReview.comment.trim() || submittingReview}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all border border-blue-800 min-h-[44px] text-xs"
                  aria-label="Submit review"
                >
                  {submittingReview ? (
                    <span className="flex items-center justify-center gap-1">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Review'
                  )}
                </button>
              </div>
            )}

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 mb-2 text-xs">Recent Reviews</h4>
                {reviews.slice(0, 5).map((review, index) => (
                  <div key={review.id || index} className="bg-white rounded-xl border border-blue-200 p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="relative">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white">
                          {getAnonymousName(review.user_id || `review_${index}`, index).charAt(0)}
                        </div>
                        {review.user_verified && (
                          <div className="absolute -top-1 -right-1">
                            <VerifiedBadge size={10} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-gray-900 text-xs">
                              {getAnonymousName(review.user_id || `review_${index}`, index)}
                            </span>
                            {review.user_verified && <VerifiedBadge size={10} />}
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={10}
                                className={i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{formatTimeAgo(review.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-xs leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center border border-gray-300 mx-auto mb-2">
                  <Star size={20} className="text-gray-400" />
                </div>
                <h4 className="font-bold text-gray-700 mb-1 text-xs">No Reviews Yet</h4>
                <p className="text-gray-500 text-xs">Be the first to review this business!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {refreshing && (
        <div className="fixed bottom-3 right-3 p-1.5 bg-blue-600 text-white rounded-full shadow-lg animate-pulse">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default BusinessDetails;