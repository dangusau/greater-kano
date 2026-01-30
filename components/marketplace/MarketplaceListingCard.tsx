import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Eye, User, Shield } from 'lucide-react';
import { MarketplaceListing } from '../../types/marketplace';
import { formatTimeAgo } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

interface MarketplaceListingCardProps {
  listing: MarketplaceListing;
  onToggleFavorite?: (listingId: string) => void;
}

const MarketplaceListingCard: React.FC<MarketplaceListingCardProps> = ({ 
  listing, 
  onToggleFavorite 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isOwner = useMemo(() => listing.seller_id === user?.id, [listing.seller_id, user?.id]);

  const handleCardClick = () => {
    navigate(`/marketplace/${listing.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOwner || !onToggleFavorite) return;
    onToggleFavorite(listing.id);
  };

  const getSellerInitials = (): string => {
    return listing.seller_name?.charAt(0).toUpperCase() || 'U';
  };

  const getConditionBadgeStyle = (): string => {
    switch (listing.condition) {
      case 'new':
        return 'bg-gradient-to-r from-green-100 to-green-50 border border-green-200 text-green-700';
      case 'used':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-200 text-yellow-700';
      case 'refurbished':
        return 'bg-gradient-to-r from-purple-100 to-purple-50 border border-purple-200 text-purple-700';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 text-gray-700';
    }
  };

  const getCategoryBadgeStyle = (): string => {
    return 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700';
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent) {
      parent.innerHTML = `
        <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div class="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <p class="text-blue-400 text-xs font-medium">No Image</p>
          </div>
        </div>
      `;
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group bg-white rounded-xl border border-blue-200/50 overflow-hidden cursor-pointer 
                hover:shadow-lg hover:scale-[1.02] hover:border-blue-300 
                active:scale-[0.995] transition-all duration-300 
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      role="button"
      tabIndex={0}
      aria-label={`View ${listing.title} - ₦${listing.price.toLocaleString()}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
    >
      <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden border-b border-blue-100">
        {listing.images[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-200 flex items-center justify-center mb-2">
              <User size={20} className="text-blue-400" />
            </div>
            <p className="text-blue-500 text-xs font-medium text-center">No Image</p>
            <p className="text-blue-400 text-xs mt-1 text-center">Tap for details</p>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {!isOwner && (
          <button 
            className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow 
                      hover:bg-white hover:shadow-md hover:scale-110 
                      active:scale-95 transition-all duration-200 
                      focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[36px] min-w-[36px]"
            onClick={handleFavoriteClick}
            aria-label={listing.is_favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              size={16}
              fill={listing.is_favorited ? '#EF4444' : 'none'}
              strokeWidth={2.5}
              className={`transition-colors duration-200 ${
                listing.is_favorited 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-gray-600 hover:text-red-500'
              }`}
            />
          </button>
        )}
        
        {isOwner && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-700 
                        text-white text-xs font-semibold rounded-full shadow border border-blue-500/30">
            <div className="flex items-center gap-1">
              <Shield size={8} />
              <span>Your Listing</span>
            </div>
          </div>
        )}
        
        {listing.seller_verified && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-600 
                        text-white text-xs font-medium rounded-full shadow flex items-center gap-1">
            <Shield size={8} />
            <span>Verified</span>
          </div>
        )}
        
        <div className={`absolute bottom-2 left-2 px-2 py-1 text-xs font-medium rounded-full ${getConditionBadgeStyle()}`}>
          {listing.condition.toUpperCase()}
        </div>
      </div>

      <div className="p-3">
        <div className="mb-2">
          <h3 className="text-sm font-bold text-gray-900 truncate leading-tight mb-1">
            {listing.title}
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ₦{listing.price.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <div className="p-1 rounded bg-blue-50 border border-blue-100">
              <MapPin size={12} className="text-blue-500" />
            </div>
            <span className="truncate max-w-[100px] font-medium">{listing.location}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <div className="p-1 rounded bg-gray-50 border border-gray-100">
              <Eye size={12} className="text-gray-500" />
            </div>
            <span className="font-medium">{listing.views_count}</span>
            <span className="text-gray-400 text-xs">views</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full 
                          flex items-center justify-center text-white font-bold text-xs shadow 
                          border-2 border-white">
              {getSellerInitials()}
            </div>
            {listing.seller_verified && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-600 
                            rounded-full flex items-center justify-center border-2 border-white">
                <Shield size={6} className="text-white" fill="white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-xs text-gray-800 font-semibold truncate">
                    {listing.seller_name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(listing.created_at)}
                </span>
              </div>
              
              {listing.favorite_count > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <Heart size={10} className="text-red-400" fill="#FCA5A5" />
                  <span className="font-medium text-gray-700">{listing.favorite_count}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getCategoryBadgeStyle()}`}>
            {listing.category}
          </span>
        </div>
      </div>

      <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-300/30 rounded-xl pointer-events-none transition-all duration-300" />
    </div>
  );
};

export default MarketplaceListingCard;