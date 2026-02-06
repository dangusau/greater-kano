// pages/admin/AdminPosts.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import { 
  Trash2, 
  BarChart2, 
  TrendingUp,
  MessageCircle,
  Heart,
  Share2,
  Calendar,
  User,
  Search,
  RefreshCw,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  Image,
  Video,
  Grid
} from 'lucide-react'

interface Post {
  id: string
  author_id: string
  content: string
  media_urls: string[]
  media_type: 'text' | 'image' | 'video' | 'gallery'
  location: string | null
  tags: string[]
  likes_count: number
  comments_count: number
  shares_count: number
  is_visible_to_all: boolean
  created_at: string
  updated_at: string
  author_email: string
  author_first_name: string | null
  author_last_name: string | null
  author_business_name: string | null
  author_user_status: 'verified' | 'member'
}

interface Analytics {
  total_posts: number
  total_likes: number
  total_comments: number
  total_shares: number
  avg_engagement: number
  posts_today: number
  top_authors: Array<{
    author_name: string
    post_count: number
    total_engagement: number
  }>
  media_type_distribution: {
    text: number
    image: number
    video: number
    gallery: number
  }
}

type Period = 'today' | 'week' | 'month' | 'year' | 'all'
type SortField = 'created_at' | 'likes_count' | 'comments_count' | 'shares_count'

const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('admin_get_posts_with_authors', {
          sort_field: sortField,
          sort_order: sortOrder
        })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [sortField, sortOrder])

  const fetchAnalytics = useCallback(async () => {
    setStatsLoading(true)
    try {
      const now = new Date()
      let periodStart: string | null = null
      let periodEnd = now.toISOString()

      switch (period) {
        case 'today':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
          break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          periodStart = weekAgo.toISOString()
          break
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          break
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1).toISOString()
          break
      }

      const { data, error } = await supabase
        .rpc('admin_get_posts_analytics', {
          period_start: periodStart,
          period_end: periodEnd
        })

      if (error) throw error

      if (data && !data.error) {
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [period])

  const deletePost = async (postId: string) => {
    setActionLoading(postId)
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error
      
      setPosts(prev => prev.filter(p => p.id !== postId))
      setSelectedPosts(prev => prev.filter(id => id !== postId))
      setShowDeleteConfirm(null)
      fetchAnalytics()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to delete post')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPosts.length === 0) return
    
    if (!confirm(`Delete ${selectedPosts.length} posts?`)) return
    
    setActionLoading('bulk')
    try {
      const { data, error } = await supabase
        .rpc('admin_delete_posts', {
          post_ids: selectedPosts
        })

      if (error) throw error
      
      if (data?.success) {
        setPosts(prev => prev.filter(p => !selectedPosts.includes(p.id)))
        setSelectedPosts([])
        fetchAnalytics()
        alert(`${selectedPosts.length} posts deleted`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to delete posts')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleSelectAll = () => {
    if (selectedPosts.length === posts.length) {
      setSelectedPosts([])
    } else {
      setSelectedPosts(posts.map(p => p.id))
    }
  }

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    )
  }

  const filteredPosts = posts.filter(post => 
    searchTerm === '' || 
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${post.author_first_name || ''} ${post.author_last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.author_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.author_business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    if (posts.length > 0) {
      fetchAnalytics()
    }
  }, [posts, period, fetchAnalytics])

  const getAuthorName = (post: Post) => {
    if (post.author_business_name) return post.author_business_name
    if (post.author_first_name && post.author_last_name) return `${post.author_first_name} ${post.author_last_name}`
    return post.author_email.split('@')[0]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getMediaTypeIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'image': return <Image size={16} className="text-blue-500" />
      case 'video': return <Video size={16} className="text-red-500" />
      case 'gallery': return <Grid size={16} className="text-green-500" />
      default: return <FileText size={16} className="text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Posts Management</h1>
              <p className="text-gray-600 mt-1">Manage and analyze user posts</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { fetchPosts(); fetchAnalytics() }}
                disabled={loading || statsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading || statsLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <BarChart2 size={16} />
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              </button>
            </div>
          </div>
        </div>

        {showAnalytics && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
              <div className="flex gap-2">
                {(['today', 'week', 'month', 'year', 'all'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-sm rounded-full ${
                      period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : analytics && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-5 shadow border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{analytics.total_posts.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Total Posts</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock size={12} />
                      {analytics.posts_today} today
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 shadow border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Heart className="text-green-600" size={20} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{analytics.total_likes.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Total Likes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <MessageCircle size={12} /> {analytics.total_comments.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Share2 size={12} /> {analytics.total_shares.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 shadow border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <TrendingUp className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{analytics.avg_engagement.toFixed(1)}</p>
                        <p className="text-sm text-gray-500">Avg Engagement</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 shadow border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Users className="text-amber-600" size={20} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{analytics.top_authors.length}</p>
                        <p className="text-sm text-gray-500">Top Authors</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {analytics.top_authors[0]?.author_name || 'No data'}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Content Types</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analytics.media_type_distribution).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getMediaTypeIcon(type)}
                          <span className="font-medium text-gray-900 capitalize">{type}</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search posts, authors, content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="created_at">Newest</option>
                  <option value="likes_count">Most Likes</option>
                  <option value="comments_count">Most Comments</option>
                  <option value="shares_count">Most Shares</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>

                {selectedPosts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedPosts.length} selected
                    </span>
                    <button
                      onClick={handleBulkDelete}
                      disabled={actionLoading === 'bulk'}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      {actionLoading === 'bulk' ? 'Deleting...' : 'Delete Selected'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="text-gray-400" size={24} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No posts</h3>
                <p className="text-gray-600">
                  {searchTerm ? 'Try different search' : 'No posts yet'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-12 p-4">
                      <input
                        type="checkbox"
                        checked={selectedPosts.length === posts.length && posts.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-900">Author</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-900">Content</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-900">Engagement</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-900">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-900">Date</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((post) => (
                    <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50 last:border-0">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedPosts.includes(post.id)}
                          onChange={() => togglePostSelection(post.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            post.author_user_status === 'verified' ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            <User size={16} className={
                              post.author_user_status === 'verified' ? 'text-green-600' : 'text-blue-600'
                            } />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {getAuthorName(post)}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {post.author_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="text-gray-900 line-clamp-2 mb-2">
                            {post.content}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {post.location && (
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                📍 {post.location}
                              </span>
                            )}
                            {post.tags?.slice(0, 2).map((tag, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Heart size={14} className="text-red-500" />
                            <span className="text-sm font-medium">{post.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle size={14} className="text-blue-500" />
                            <span className="text-sm font-medium">{post.comments_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Share2 size={14} className="text-green-500" />
                            <span className="text-sm font-medium">{post.shares_count}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getMediaTypeIcon(post.media_type)}
                          <span className="text-sm text-gray-700 capitalize">
                            {post.media_type}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{formatDate(post.created_at)}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        {showDeleteConfirm === post.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => deletePost(post.id)}
                              disabled={actionLoading === post.id}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {actionLoading === post.id ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowDeleteConfirm(post.id)}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredPosts.length} of {posts.length} posts
            </div>
            {selectedPosts.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="text-amber-700">
                  {selectedPosts.length} selected
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPosts