import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Filter, Plus, MessageCircle, X, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
import { useMarketplace } from '../hooks/useMarketplace';
import MarketplaceListingCard from '../components/marketplace/MarketplaceListingCard';
import CreateListingModal from '../components/marketplace/CreateListingModal';
import { useAuth } from '../contexts/AuthContext';
import { appCache } from '../shared/services/UniversalCache';

interface FilterParams {
  minPrice: string;
  maxPrice: string;
  condition: string;
  category: string;
}

interface FeedbackMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const Marketplace: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterParams>({
    minPrice: '',
    maxPrice: '',
    condition: 'all',
    category: 'All'
  });
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { listings, loading, getListings, createListing } = useMarketplace();
  const { userProfile } = useAuth();
  const searchTimeout = useRef<NodeJS.Timeout>();
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const CACHE_KEY = 'marketplace_listings';
  const CACHE_TTL = 5 * 60 * 1000;

  const isVerified = userProfile?.user_status === 'verified';

  const categories = useMemo(() => ['All', 'Electronics', 'Fashion', 'Vehicles', 'Property', 'Services', 'Others'], []);
  
  const conditions = useMemo(() => [
    { value: 'all', label: 'All Conditions' },
    { value: 'new', label: 'New' },
    { value: 'used', label: 'Used' },
    { value: 'refurbished', label: 'Refurbished' }
  ], []);

  const showFeedback = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    const newFeedback: FeedbackMessage = { id, message, type };
    
    setFeedbackMessages(prev => [...prev, newFeedback]);
    
    setTimeout(() => {
      setFeedbackMessages(prev => prev.filter(fb => fb.id !== id));
    }, 3000);
  }, []);

  const dismissFeedback = useCallback((id: string) => {
    setFeedbackMessages(prev => prev.filter(fb => fb.id !== id));
  }, []);

  const buildFilterParams = useCallback((filterObj: FilterParams, searchText?: string) => {
    const filterParams: any = {};
    
    if (selectedCategory !== 'All') {
      filterParams.category = selectedCategory;
    }
    
    if (filterObj.minPrice) {
      const minPrice = parseFloat(filterObj.minPrice);
      if (!isNaN(minPrice) && minPrice > 0) {
        filterParams.minPrice = minPrice;
      }
    }
    
    if (filterObj.maxPrice) {
      const maxPrice = parseFloat(filterObj.maxPrice);
      if (!isNaN(maxPrice) && maxPrice > 0) {
        filterParams.maxPrice = maxPrice;
      }
    }
    
    if (filterObj.condition !== 'all') {
      filterParams.condition = filterObj.condition;
    }
    
    const searchValue = searchText || searchQuery;
    if (searchValue && searchValue.trim()) {
      filterParams.search = searchValue.trim();
    }
    
    return filterParams;
  }, [selectedCategory, searchQuery]);

  const loadListingsWithFilters = useCallback(async (searchText?: string, forceRefresh = false) => {
    try {
      const cacheKey = `${CACHE_KEY}_${JSON.stringify({ ...filters, searchText, selectedCategory })}`;
      
      if (!forceRefresh) {
        const cachedData = await appCache.get(cacheKey);
        if (cachedData) {
          setTimeout(async () => {
            try {
              setIsRefreshing(true);
              const freshData = await getListings(buildFilterParams(filters, searchText));
              if (freshData && freshData.length > 0) {
                await appCache.set(cacheKey, freshData, CACHE_TTL);
              }
            } catch {
              // Silent background refresh failure
            } finally {
              setIsRefreshing(false);
            }
          }, 100);
          
          return cachedData;
        }
      }
      
      setIsRefreshing(true);
      const data = await getListings(buildFilterParams(filters, searchText));
      
      if (data && data.length > 0) {
        await appCache.set(cacheKey, data, CACHE_TTL);
      }
      
      if (searchText || activeFilterCount > 0) {
        showFeedback(`Found ${data.length} listings`, 'info');
      }
      
      return data;
    } catch {
      showFeedback('Please try again later', 'error');
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, [filters, selectedCategory, activeFilterCount, getListings, buildFilterParams, showFeedback]);

  const handleSearch = useCallback((query: string) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      loadListingsWithFilters(query);
    }, 500);
  }, [loadListingsWithFilters]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  }, [handleSearch]);

  const handleFilterChange = useCallback((key: keyof FilterParams, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(async () => {
    try {
      setIsApplyingFilters(true);
      await loadListingsWithFilters(searchQuery, true);
      setShowFilters(false);
      showFeedback('Filters applied', 'success');
    } catch {
      showFeedback('Failed to apply filters', 'error');
    } finally {
      setIsApplyingFilters(false);
    }
  }, [loadListingsWithFilters, searchQuery, showFeedback]);

  const clearFilters = useCallback(async () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      condition: 'all',
      category: 'All'
    });
    setSelectedCategory('All');
    setSearchQuery('');
    await loadListingsWithFilters('', true);
    setShowFilters(false);
    showFeedback('All filters cleared', 'info');
  }, [loadListingsWithFilters, showFeedback]);

  const handleCategorySelect = useCallback(async (category: string) => {
    setSelectedCategory(category);
    setFilters(prev => ({ ...prev, category }));
    
    try {
      await loadListingsWithFilters(searchQuery, true);
      showFeedback(`Showing ${category} listings`, 'info');
    } catch {
      showFeedback('Failed to load listings', 'error');
    }
  }, [loadListingsWithFilters, searchQuery, showFeedback]);

  const handleCreateListingClick = useCallback(() => {
    if (isVerified) {
      setShowCreateModal(true);
    } else {
      showFeedback('Please verify your account to create listings', 'info');
    }
  }, [isVerified, showFeedback]);

  const handleCreateListing = useCallback(async (listingData: any) => {
    if (!isVerified) {
      showFeedback('Please verify your account', 'error');
      return;
    }
    
    try {
      const listingId = await createListing(listingData);
      await appCache.remove(CACHE_KEY);
      await loadListingsWithFilters(searchQuery, true);
      setShowCreateModal(false);
      showFeedback('Listing created', 'success');
      return listingId;
    } catch {
      showFeedback('Failed to create listing', 'error');
      throw new Error('Creation failed');
    }
  }, [isVerified, createListing, loadListingsWithFilters, searchQuery, showFeedback]);

  useEffect(() => {
    let count = 0;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.condition !== 'all') count++;
    if (selectedCategory !== 'All') count++;
    if (searchQuery) count++;
    setActiveFilterCount(count);
  }, [filters, selectedCategory, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  useEffect(() => {
    const loadInitialData = async () => {
      const cacheKey = `${CACHE_KEY}_initial`;
      const cachedData = await appCache.get(cacheKey);
      
      if (cachedData) {
        setTimeout(async () => {
          try {
            setIsRefreshing(true);
            const freshData = await getListings(buildFilterParams(filters));
            if (freshData && freshData.length > 0) {
              await appCache.set(cacheKey, freshData, CACHE_TTL);
            }
          } catch {
            // Silent background refresh failure
          } finally {
            setIsRefreshing(false);
          }
        }, 100);
      } else {
        await loadListingsWithFilters('', true);
      }
    };
    
    loadInitialData();
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-40 h-1 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="h-full w-1/3 bg-gradient-to-r from-blue-400 to-blue-300 animate-pulse rounded-full"></div>
        </div>
      )}

      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {feedbackMessages.map(feedback => (
          <div
            key={feedback.id}
            className={`bg-white rounded-xl shadow-lg border p-3 animate-slideInRight min-h-[36px] flex items-center justify-between ${
              feedback.type === 'success' ? 'border-green-200 bg-green-50' :
              feedback.type === 'error' ? 'border-red-200 bg-red-50' :
              'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' && <CheckCircle className="text-green-600" size={16} />}
              {feedback.type === 'error' && <AlertCircle className="text-red-600" size={16} />}
              {feedback.type === 'info' && <MessageCircle className="text-blue-600" size={16} />}
              <span className="text-xs font-medium">
                {feedback.message}
              </span>
            </div>
            <button
              onClick={() => dismissFeedback(feedback.id)}
              className="ml-3 text-gray-400 hover:text-gray-600 min-h-[36px] min-w-[36px] flex items-center justify-center p-1"
              aria-label="Dismiss message"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="sticky top-0 z-30">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 border-b border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-bold text-white">Marketplace</h1>
              <p className="text-xs text-blue-100">GKBC community marketplace</p>
            </div>
            {userProfile && (
              <div className="flex items-center gap-1">
                {isVerified ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full">
                    <Shield size={10} className="text-blue-200" />
                    <span className="text-xs text-blue-100 font-medium">Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-400/30 rounded-full">
                    <span className="text-xs text-yellow-100 font-medium">Member</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-3 border-b border-blue-200">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search listings..."
                className="w-full pl-8 pr-8 py-2 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-xs min-h-[36px]"
                aria-label="Search listings"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    loadListingsWithFilters('');
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-blue-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl flex items-center justify-center min-h-[36px] min-w-[36px] border transition-colors ${
                showFilters 
                  ? 'bg-blue-600 text-white border-blue-700' 
                  : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
              }`}
              aria-label="Toggle filters"
            >
              <Filter size={16} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border border-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button 
              onClick={handleCreateListingClick}
              className={`p-2 rounded-xl flex items-center justify-center min-h-[36px] min-w-[36px] border transition-colors ${
                isVerified
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-700 hover:from-blue-700 hover:to-blue-800'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
              aria-label="Create listing"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
     
      {showFilters && (
        <div 
          ref={filterPanelRef}
          className="bg-white border-b border-blue-200 p-3 space-y-3 animate-slideDown"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900">Filters</h3>
            <button 
              onClick={clearFilters} 
              className="text-xs text-blue-600 hover:text-blue-700 font-medium min-h-[36px] min-w-[36px] flex items-center gap-1"
              aria-label="Clear filters"
            >
              <X size={12} />
              Clear
            </button>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <div className="flex overflow-x-auto gap-1 pb-1">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all text-xs font-medium min-h-[36px] border ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-700'
                      : 'bg-white text-gray-700 border-blue-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  aria-label={`Filter by ${category}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min Price (₦)</label>
              <input
                type="number"
                min="0"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                placeholder="0"
                className="w-full p-2 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-xs"
                aria-label="Minimum price"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Price (₦)</label>
              <input
                type="number"
                min="0"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                placeholder="Any"
                className="w-full p-2 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-xs"
                aria-label="Maximum price"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Condition</label>
            <select
              value={filters.condition}
              onChange={(e) => handleFilterChange('condition', e.target.value)}
              className="w-full p-2 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-xs"
              aria-label="Filter by condition"
            >
              {conditions.map(cond => (
                <option key={cond.value} value={cond.value}>
                  {cond.label}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={applyFilters}
            disabled={isApplyingFilters}
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] flex items-center justify-center gap-2 border border-blue-700 text-xs"
            aria-label="Apply filters"
          >
            {isApplyingFilters ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Applying...
              </>
            ) : (
              'Apply Filters'
            )}
          </button>
        </div>
      )}

      <div className="p-3">
        {loading && listings.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-blue-200 p-3 animate-pulse">
                <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg mb-2 border border-blue-200"></div>
                <div className="space-y-1">
                  <div className="h-3 bg-gradient-to-r from-blue-100 to-blue-50 rounded w-3/4 border border-blue-200"></div>
                  <div className="h-3 bg-gradient-to-r from-blue-100 to-blue-50 rounded w-1/2 border border-blue-200"></div>
                  <div className="h-3 bg-gradient-to-r from-blue-100 to-blue-50 rounded w-1/4 border border-blue-200"></div>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-200">
              <MessageCircle size={24} className="text-blue-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              {selectedCategory !== 'All' ? `No ${selectedCategory} listings` : 'No listings'}
            </h3>
            <p className="text-xs text-gray-600 mb-4 max-w-sm mx-auto">
              {searchQuery || activeFilterCount > 0 
                ? 'Try adjusting search or filters' 
                : 'Be the first to create a listing'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {(searchQuery || activeFilterCount > 0) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-white text-blue-600 rounded-xl font-medium border border-blue-200 hover:border-blue-300 hover:bg-blue-50 min-h-[36px] text-xs"
                  aria-label="Clear filters"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={handleCreateListingClick}
                className={`px-4 py-2 rounded-xl font-medium border min-h-[36px] text-xs ${
                  isVerified
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-blue-700'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
                aria-label="Create listing"
              >
                Create Listing
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {listings.map(listing => (
              <MarketplaceListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>

      <button 
        onClick={handleCreateListingClick}
        className={`fixed bottom-24 right-3 text-white p-3 rounded-full shadow-lg z-30 transition-transform hover:scale-105 min-h-[44px] min-w-[44px] flex items-center justify-center border ${
          isVerified
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-700 hover:from-blue-700 hover:to-blue-800'
            : 'bg-gradient-to-r from-gray-500 to-gray-600 border-gray-600 hover:from-gray-600 hover:to-gray-700'
        }`}
        aria-label="Create listing"
      >
        <Plus size={20} />
      </button>

      <CreateListingModal
        isOpen={showCreateModal && isVerified}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateListing}
      />
    </div>
  );
};

export default Marketplace;