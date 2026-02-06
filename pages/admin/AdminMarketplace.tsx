// pages/admin/AdminMarketplace.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import {
  Trash2,
  Eye,
  Package,
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  ShoppingBag,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Types
interface Listing {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_email: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  images: string[];
  views_count: number;
  is_sold: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryStats {
  category: string;
  count: number;
  total_value: number;
  avg_price: number;
}

interface SellerStats {
  seller_name: string;
  listing_count: number;
  total_sales_value: number;
  sold_count: number;
  total_views: number;
}

interface MostViewedListing {
  title: string;
  price: number;
  views_count: number;
  seller_name: string;
  created_at: string;
  images: string[];
}

// ONLY UPDATE THIS INTERFACE in your AdminMarketplace.tsx
interface Analytics {
  total_listings: number;
  active_listings: number;
  sold_listings: number;
  avg_price: number;
  total_value: number;
  listings_today: number;
  oldest_listing: string;
  newest_listing: string;
  total_views: number;
  category_distribution: Array<{
    category: string;
    count: number;           // Was: category_count in SQL
    total_value: number;
    avg_price: number;
  }>;
  top_sellers: Array<{
    seller_name: string;
    listing_count: number;
    total_sales_value: number;
    sold_count: number;
    total_views: number;
  }>;
  most_viewed_listings: Array<{
    title: string;
    price: number;
    views_count: number;
    seller_name: string;
    created_at: string;
    images: string[];
  }>;
}

const periods = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' }
] as const;

type Period = typeof periods[number]['value'];

const AdminMarketplace: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Calculate period dates
  const getPeriodDates = (): { start: Date | null; end: Date | null } => {
    const now = new Date();
    
    switch (period) {
      case 'day':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { start: startOfDay, end: null };
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return { start: weekAgo, end: null };
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: startOfMonth, end: null };
      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return { start: startOfYear, end: null };
      case 'all':
      default:
        return { start: null, end: null };
    }
  };

  // Fetch listings with RPC
  const fetchListings = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates();
      
      const { data, error } = await supabase
        .rpc('admin_get_marketplace_listings', {
          period_start: start?.toISOString() || null,
          period_end: end?.toISOString() || null,
          limit_count: 100,
          offset_val: 0
        });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics with RPC
  const fetchAnalytics = async () => {
    try {
      const { start, end } = getPeriodDates();
      
      const { data, error } = await supabase
        .rpc('admin_get_marketplace_analytics', {
          period_start: start?.toISOString() || null,
          period_end: end?.toISOString() || null
        });

      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Delete listing with RPC
  const deleteListing = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;
    
    setActionLoading(id);
    try {
      const { data, error } = await supabase
        .rpc('admin_delete_marketplace_listing', { listing_id: id });

      if (error) throw error;
      
      if (data.success) {
        alert(data.message);
        await Promise.all([fetchListings(), fetchAnalytics()]);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle sold status with RPC
  const toggleSoldStatus = async (id: string, currentStatus: boolean) => {
    setActionLoading(`status-${id}`);
    try {
      const { data, error } = await supabase
        .rpc('admin_toggle_listing_sold_status', {
          listing_id: id,
          is_sold_status: !currentStatus
        });

      if (error) throw error;
      
      if (data.success) {
        await Promise.all([fetchListings(), fetchAnalytics()]);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update listing status');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter listings
  const filteredListings = listings.filter(listing => {
    const matchesSearch = searchQuery === '' || 
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.seller_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || listing.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'sold' && listing.is_sold) ||
      (statusFilter === 'active' && !listing.is_sold);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique categories
  const categories = ['all', ...new Set(listings.map(l => l.category))];

  // Load data on mount and period change
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchListings(), fetchAnalytics()]);
    };
    loadData();
  }, [period]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketplace Management</h1>
            <p className="text-gray-600">Manage and analyze marketplace listings</p>
          </div>
          <button
            onClick={() => Promise.all([fetchListings(), fetchAnalytics()])}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={18} />
            Refresh Data
          </button>
        </div>

        {/* Period Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {periods.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                period === value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search listings, sellers, or descriptions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="sold">Sold Only</option>
          </select>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Listings */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Listings</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_listings}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="text-blue-600" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <TrendingUp size={16} className="mr-1" />
              <span>{analytics.listings_today} listed today</span>
            </div>
          </div>

          {/* Active Listings */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Listings</p>
                <p className="text-3xl font-bold text-green-600">{analytics.active_listings}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {analytics.sold_listings} sold listings
            </div>
          </div>

          {/* Average Price */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Price</p>
                <p className="text-3xl font-bold text-amber-600">{formatCurrency(analytics.avg_price)}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <DollarSign className="text-amber-600" size={24} />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Total value: {formatCurrency(analytics.total_value)}
            </div>
          </div>

          {/* Total Views */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Views</p>
                <p className="text-3xl font-bold text-purple-600">{analytics.total_views.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Eye className="text-purple-600" size={24} />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {analytics.most_viewed_listings.length} highly viewed listings
            </div>
          </div>
        </div>
      )}

      {/* Top Sellers & Most Viewed */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Sellers */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Sellers</h3>
            <div className="space-y-4">
              {analytics.top_sellers.slice(0, 5).map((seller, index) => (
                <div key={seller.seller_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <User size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{seller.seller_name}</p>
                      <p className="text-sm text-gray-500">{seller.listing_count} listings</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(seller.total_sales_value)}</p>
                    <p className="text-sm text-gray-500">{seller.sold_count} sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Viewed Listings */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Viewed Listings</h3>
            <div className="space-y-4">
              {analytics.most_viewed_listings.slice(0, 5).map((listing, index) => (
                <div key={listing.title + index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{listing.title}</p>
                    <p className="text-sm text-gray-500">{listing.seller_name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{listing.views_count.toLocaleString()} views</p>
                      <p className="text-sm text-gray-500">{formatCurrency(listing.price)}</p>
                    </div>
                    <Eye className="text-gray-400" size={18} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Listings Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Marketplace Listings</h2>
          <p className="text-sm text-gray-600">
            Showing {filteredListings.length} of {listings.length} listings
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading marketplace data...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No listings found</h3>
            <p className="mt-2 text-gray-500">
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'No marketplace listings available for this period'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Listing Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price & Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredListings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {listing.images && listing.images.length > 0 ? (
                          <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-lg overflow-hidden mr-4">
                            <img
                              src={listing.images[0]}
                              alt={listing.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=No+Image';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                            <Package className="text-gray-400" size={20} />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{listing.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {listing.category}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {listing.condition}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Listed on {formatDate(listing.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{listing.seller_name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{listing.seller_email}</p>
                        <p className="text-xs text-gray-500 mt-1">{listing.location}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(listing.price)}
                        </span>
                        <button
                          onClick={() => toggleSoldStatus(listing.id, listing.is_sold)}
                          disabled={actionLoading === `status-${listing.id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            listing.is_sold
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {listing.is_sold ? (
                            <>
                              <XCircle size={12} />
                              Sold
                            </>
                          ) : (
                            <>
                              <CheckCircle size={12} />
                              Active
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Eye size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-900">{listing.views_count} views</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Last updated: {formatDate(listing.updated_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteListing(listing.id, listing.title)}
                          disabled={actionLoading === listing.id}
                          className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          <span className="text-sm">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Distribution */}
      {analytics && analytics.category_distribution.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.category_distribution.map((category) => (
              <div key={category.category} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900">{category.category}</span>
                  <span className="text-sm font-bold text-blue-600">{category.count}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Price:</span>
                    <span className="font-medium">{formatCurrency(category.avg_price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-medium">{formatCurrency(category.total_value)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMarketplace;