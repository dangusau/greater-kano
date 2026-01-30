// pages/admin/AdminMarketplace.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

type Listing = {
  id: string
  seller_id: string
  title: string
  price: number
  category: string
  condition: string
  location: string
  views_count: number
  images: string[]
  is_sold: boolean
  created_at: string
}

type Analytics = {
  totalListings: number
  activeListings: number
  soldListings: number
  avgPrice: number
  mostViewed: Listing[]
  mostFavorited: Listing[]
  listingsByCategory: Record<string, number>
  topSellers: Record<string, number>
}

const periods = ['day', 'week', 'month', 'year'] as const
type Period = typeof periods[number]

const AdminMarketplace: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch listings with optional period filter
  const fetchListings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching listings:', error)
    setListings(data || [])
    setLoading(false)
  }

  // Delete listing
  const deleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    setActionLoading(id)
    const { error } = await supabase
      .from('marketplace_listings')
      .delete()
      .eq('id', id)
    if (error) console.error('Error deleting listing:', error)
    await fetchListings()
    setActionLoading(null)
  }

  const computeAnalytics = (allListings: Listing[]) => {
    const now = new Date()
    // Filter based on period
    const filtered = allListings.filter((l) => {
      const created = new Date(l.created_at)
      switch (period) {
        case 'day':
          return created >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
        case 'week':
          const weekAgo = new Date(now)
          weekAgo.setDate(now.getDate() - 7)
          return created >= weekAgo
        case 'month':
          return created >= new Date(now.getFullYear(), now.getMonth(), 1)
        case 'year':
          return created >= new Date(now.getFullYear(), 0, 1)
      }
    })

    const totalListings = filtered.length
    const activeListings = filtered.filter((l) => !l.is_sold).length
    const soldListings = filtered.filter((l) => l.is_sold).length
    const avgPrice = filtered.reduce((sum, l) => sum + (l.price || 0), 0) / (filtered.length || 1)

    // Most viewed
    const mostViewed = [...filtered].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 5)

    // Most favorited
    const { data: favs } = supabase
      .from('marketplace_favorites')
      .select('listing_id, count:user_id')
    // Here you might need a separate query for favorites aggregation
    // We'll leave it empty for now
    const mostFavorited: Listing[] = []

    // Listings by category
    const listingsByCategory: Record<string, number> = {}
    filtered.forEach((l) => {
      listingsByCategory[l.category] = (listingsByCategory[l.category] || 0) + 1
    })

    // Top sellers by number of listings
    const topSellers: Record<string, number> = {}
    filtered.forEach((l) => {
      topSellers[l.seller_id] = (topSellers[l.seller_id] || 0) + 1
    })

    setAnalytics({
      totalListings,
      activeListings,
      soldListings,
      avgPrice,
      mostViewed,
      mostFavorited,
      listingsByCategory,
      topSellers
    })
  }

  useEffect(() => {
    if (listings.length) computeAnalytics(listings)
  }, [listings, period])

  useEffect(() => {
    fetchListings()
  }, [])

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Marketplace Management & Analytics</h2>

      {/* Period filter */}
      <div className="mb-4 flex gap-2">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded border ${
              period === p ? 'bg-blue-600 text-white' : 'bg-white text-black'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white shadow rounded">Total Listings: {analytics.totalListings}</div>
          <div className="p-4 bg-white shadow rounded">Active Listings: {analytics.activeListings}</div>
          <div className="p-4 bg-white shadow rounded">Sold Listings: {analytics.soldListings}</div>
          <div className="p-4 bg-white shadow rounded">Average Price: ₦{analytics.avgPrice.toFixed(2)}</div>
        </div>
      )}

      {/* Top Viewed */}
      {analytics && analytics.mostViewed.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Top Viewed Listings</h3>
          <ul className="list-disc pl-5">
            {analytics.mostViewed.map((l) => (
              <li key={l.id}>
                {l.title} - {l.views_count} views
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Listings Table */}
      {loading ? (
        <div>Loading listings...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Title</th>
                <th className="p-2 border">Seller</th>
                <th className="p-2 border">Price</th>
                <th className="p-2 border">Views</th>
                <th className="p-2 border">Category</th>
                <th className="p-2 border">Condition</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="p-2 border">{l.title}</td>
                  <td className="p-2 border">{l.seller_id}</td>
                  <td className="p-2 border">{l.price}</td>
                  <td className="p-2 border">{l.views_count}</td>
                  <td className="p-2 border">{l.category}</td>
                  <td className="p-2 border">{l.condition}</td>
                  <td className="p-2 border">
                    <button
                      disabled={!!actionLoading}
                      onClick={() => deleteListing(l.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center">
                    No listings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminMarketplace
