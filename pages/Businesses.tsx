import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Store, Star, MapPin, Building, X, AlertCircle } from 'lucide-react';
import { useBusiness } from '../hooks/useBusiness';
import { LOCATION_AXIS } from '../types/business';
import CreateBusinessModal from '../components/business/CreateBusinessModal';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../contexts/AuthContext';

const Businesses: React.FC = () => {
  const { userProfile } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<'products' | 'services' | 'all'>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  
  const { 
    businesses, 
    loading, 
    getBusinesses, 
    createBusiness, 
    refreshBusinesses 
  } = useBusiness();

  const isVerified = useMemo(() => userProfile?.user_status === 'verified', [userProfile]);
  const canCreateBusiness = isVerified;

  const filters = useMemo(() => ({
    business_type: selectedType === 'all' ? undefined : selectedType,
    location_axis: selectedLocation === 'all' ? undefined : selectedLocation,
    search: searchQuery || undefined
  }), [selectedType, selectedLocation, searchQuery]);

  const handleCreateClick = useCallback(() => {
    if (!canCreateBusiness) {
      setShowVerificationAlert(true);
      setTimeout(() => setShowVerificationAlert(false), 3000);
      return;
    }
    setShowCreateModal(true);
  }, [canCreateBusiness]);

  const handleCreateBusiness = useCallback(async (businessData: any) => {
    try {
      return await createBusiness(businessData);
    } catch (error: any) {
      if (error.message.includes('Only verified members')) {
        setShowVerificationAlert(true);
        setTimeout(() => setShowVerificationAlert(false), 3000);
      }
      throw error;
    }
  }, [createBusiness]);

  const clearFilters = useCallback(() => {
    setSelectedType('all');
    setSelectedLocation('all');
    setSearchQuery('');
    setShowFilters(false);
  }, []);

  const loadData = useCallback(async () => {
    await getBusinesses(filters, false);
  }, [getBusinesses, filters]);

  useEffect(() => {
    loadData();
    
    const refreshInterval = setInterval(() => {
      refreshBusinesses(filters);
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [loadData, refreshBusinesses, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedType !== 'all') count++;
    if (selectedLocation !== 'all') count++;
    if (searchQuery) count++;
    return count;
  }, [selectedType, selectedLocation, searchQuery]);

  if (loading && businesses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white safe-area">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 border-b border-blue-800">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-sm font-bold mb-1">GKBC Business Directory</h1>
            <p className="text-blue-100 text-xs">Find reliable and trusted businesses</p>
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-blue-200 animate-pulse">
              <div className="flex gap-2">
                <div className="w-14 h-14 bg-gray-200 rounded-lg border border-blue-200"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-2.5 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-2.5 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20 safe-area">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 border-b border-blue-800">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-sm font-bold mb-1">GKBC Business Directory</h1>
          <p className="text-blue-100 text-xs">Find GKBC Businesses in Kano • Reliable and Verified</p>
        </div>
      </div>

      {/* Verification Alert */}
      {showVerificationAlert && (
        <div className="animate-fade-in px-3 pt-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-yellow-800 text-xs">Verified Members Only</h4>
              <p className="text-yellow-700 text-xs">Contact support to upgrade your account.</p>
            </div>
            <button 
              onClick={() => setShowVerificationAlert(false)}
              className="text-yellow-600 hover:text-yellow-800 min-h-[36px] min-w-[36px] p-1"
              aria-label="Close alert"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="sticky top-0 bg-white border-b border-blue-200 z-10 p-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search businesses..."
              className="w-full pl-10 pr-3 py-2.5 bg-white rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs min-h-[36px]"
              aria-label="Search businesses"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 bg-white rounded-lg border border-blue-300 hover:bg-blue-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label={showFilters ? "Hide filters" : "Show filters"}
          >
            <Filter size={16} className="text-blue-600" />
          </button>
          {activeFiltersCount > 0 && !showFilters && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </div>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <div className="bg-blue-50 border-b border-blue-200 p-3 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-gray-900 text-xs">Filters</h2>
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                aria-label="Clear all filters"
              >
                Clear All
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Business Type Filter */}
              <div>
                <label className="block text-xs text-gray-600 font-medium mb-1">
                  Business Type
                </label>
                <div className="flex border border-blue-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setSelectedType('all')}
                    className={`flex-1 py-2 text-center font-medium text-xs transition-colors min-h-[36px] ${
                      selectedType === 'all' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-blue-50'
                    }`}
                    aria-label="Show all business types"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedType('products')}
                    className={`flex-1 py-2 text-center font-medium text-xs transition-colors min-h-[36px] ${
                      selectedType === 'products' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-blue-50'
                    }`}
                    aria-label="Show product businesses"
                  >
                    Products
                  </button>
                  <button
                    onClick={() => setSelectedType('services')}
                    className={`flex-1 py-2 text-center font-medium text-xs transition-colors min-h-[36px] ${
                      selectedType === 'services' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-blue-50'
                    }`}
                    aria-label="Show service businesses"
                  >
                    Services
                  </button>
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-xs text-gray-600 font-medium mb-1">
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs min-h-[36px]"
                  aria-label="Filter by location"
                >
                  <option value="all">All Locations</option>
                  {LOCATION_AXIS.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Indicator */}
      {activeFiltersCount > 0 && !showFilters && (
        <div className="bg-blue-50 border-b border-blue-200 px-3 py-1.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-gray-600">Active filters:</span>
              {selectedType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                  {selectedType}
                  <button 
                    onClick={() => setSelectedType('all')}
                    className="ml-0.5 p-0.5"
                    aria-label={`Remove ${selectedType} filter`}
                  >
                    <X size={8} />
                  </button>
                </span>
              )}
              {selectedLocation !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                  {selectedLocation}
                  <button 
                    onClick={() => setSelectedLocation('all')}
                    className="ml-0.5 p-0.5"
                    aria-label={`Remove ${selectedLocation} filter`}
                  >
                    <X size={8} />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                  Search: {searchQuery.substring(0, 10)}{searchQuery.length > 10 ? '...' : ''}
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="ml-0.5 p-0.5"
                    aria-label="Clear search"
                  >
                    <X size={8} />
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              aria-label="Edit filters"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Businesses List */}
      <div className="max-w-7xl mx-auto">
        {businesses.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center border border-blue-200">
              <Store size={24} className="text-blue-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">No businesses found</h3>
            <p className="text-gray-600 text-xs mb-4">
              {canCreateBusiness 
                ? 'Be the first to list a business in this area!' 
                : 'No businesses found in this area.'}
            </p>
            <button
              onClick={handleCreateClick}
              className={`px-4 py-2.5 rounded-lg font-medium text-xs min-h-[36px] ${
                canCreateBusiness
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                  : 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed'
              }`}
              aria-label={canCreateBusiness ? "List your business" : "Upgrade to list business"}
              title={canCreateBusiness ? "List your business" : "Verified members only"}
            >
              {canCreateBusiness ? 'List Your Business' : 'Verified Members Only'}
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {businesses.map(business => (
              <Link 
                to={`/business/${business.id}`} 
                key={business.id} 
                className="block"
                aria-label={`View ${business.name} details`}
              >
                <div className="bg-white rounded-xl border border-blue-200 overflow-hidden hover:border-blue-400 transition-colors active:scale-[0.99]">
                  <div className="p-3">
                    <div className="flex gap-2">
                      {/* Business Logo */}
                      <div className="relative w-14 h-14 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-blue-200">
                        {business.logo_url ? (
                          <img 
                            src={business.logo_url} 
                            alt={business.name} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-100">
                            <Store size={20} className="text-blue-500" />
                          </div>
                        )}
                        {/* Verified Badge */}
                        {business.owner_verified && (
                          <div className="absolute -top-1 -right-1">
                            <VerifiedBadge size={1} />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Business Name and Rating */}
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-xs truncate">
                              {business.name}
                            </h3>
                            {/* Verified Badge */}
                            {business.owner_verified && (
                              <VerifiedBadge size={12} />
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-full border border-yellow-200">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-bold text-gray-800">
                              {business.average_rating?.toFixed(1) || '5.0'}
                            </span>
                          </div>
                        </div>

                        {/* Owner Name */}
                        {business.owner_name && (
                          <div className="flex items-center gap-0.5 mb-1">
                            <span className="text-xs text-gray-500">By</span>
                            <span className="text-xs font-medium text-gray-700 truncate">
                              {business.owner_name}
                            </span>
                            {business.owner_verified && (
                              <VerifiedBadge size={12} />
                            )}
                          </div>
                        )}

                        {/* Business Description */}
                        {business.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {business.description.substring(0, 80)}
                            {business.description.length > 80 ? '...' : ''}
                          </p>
                        )}

                        {/* Business Details */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          {/* Location */}
                          <div className="flex items-center gap-0.5 flex-1 min-w-0">
                            <MapPin size={10} className="text-blue-500 flex-shrink-0" />
                            <span className="font-medium text-gray-700 truncate">{business.location_axis}</span>
                          </div>

                          {/* Business Type Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                            business.business_type === 'products' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                            {business.business_type === 'products' ? 'Products' : 'Services'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Business Button (Floating) */}
      {canCreateBusiness && (
        <button 
          onClick={handleCreateClick}
          className="fixed bottom-16 right-3 text-white p-3 rounded-full shadow-lg border z-30 min-h-[44px] min-w-[44px] flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-blue-800"
          aria-label="Add new business"
          title="Create business"
        >
          <Plus size={20} />
        </button>
      )}

      {/* Create Business Modal */}
      <CreateBusinessModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateBusiness}
      />

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Businesses;