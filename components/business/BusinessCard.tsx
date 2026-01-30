import React from 'react';
import { Star, MapPin, CheckCircle, Building } from 'lucide-react';
import { Business } from '../../types/business';
import { Link } from 'react-router-dom';
import VerifiedBadge from '../components/VerifiedBadge';

interface Props {
  business: Business;
}

const BusinessCard: React.FC<Props> = ({ business }) => {
  return (
    <Link to={`/businesses/${business.id}`} className="block">
      <div className="bg-white rounded-xl border border-blue-200 overflow-hidden hover:border-blue-400 transition-shadow">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-500 relative">
          {business.banner_url ? (
            <img
              src={business.banner_url}
              alt={`${business.name} banner`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building size={32} className="text-white/80" />
            </div>
          )}
          
          {/* Logo */}
          <div className="absolute -bottom-4 left-3">
            <div className="w-12 h-12 bg-white rounded-lg border-2 border-white flex items-center justify-center overflow-hidden">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={`${business.name} logo`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <Building size={20} className="text-blue-600" />
              )}
            </div>
          </div>

          
        </div>

        {/* Content */}
        <div className="pt-6 pb-3 px-3">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-xs truncate">{business.name}</h3>
              {business.owner_verified && <VerifiedBadge size={1} />}
            </div>
            <div className="flex items-center gap-0.5">
              <Star size={12} className="text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-xs">{business.average_rating?.toFixed(1) || '5.0'}</span>
            </div>
          </div>

          <p className="text-gray-600 text-xs line-clamp-2 mb-2">
            {business.description?.substring(0, 60)}
            {business.description?.length > 60 ? '...' : ''}
          </p>

          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {business.category}
            </span>
            <div className="flex items-center gap-0.5 text-gray-500 text-xs">
              <MapPin size={10} />
              <span className="truncate max-w-[80px]">{business.location_axis}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BusinessCard;