// pages/admin/Pioneers.tsx
// pages/admin/AdminPosts.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

type Post = {
  id: string
  author_id: string
  content: string
  media_urls: string[]
  media_type: string
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
}

type Analytics = {
  totalPosts: number
  avgEngagement: number
  topPosts: Post[]
  periodChange: number
}

const periods = ['day', 'week', 'month', 'year'] as const
type Period = typeof periods[number]

const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchPosts = async () => {
    setLoading(true)
    let { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching posts:', error)
    setPosts(data || [])
    setLoading(false)
  }

  const deletePost = async (postId: string) => {
    const confirmDelete = confirm('Are you sure you want to delete this post?')
    if (!confirmDelete) return
    setActionLoading(postId)

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) console.error('Error deleting post:', error)
    await fetchPosts()
    setActionLoading(null)
  }

  // Calculate analytics based on posts
  const computeAnalytics = (allPosts: Post[]) => {
    // Filter posts based on period
    const now = new Date()
    const filtered = allPosts.filter((p) => {
      const created = new Date(p.created_at)
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

    const totalPosts = filtered.length
    const totalEngagement = filtered.reduce(
      (sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0) + (p.shares_count || 0),
      0
    )
    const avgEngagement = totalPosts ? totalEngagement / totalPosts : 0

    // Top 5 posts by engagement
    const topPosts = [...filtered].sort((a, b) => {
      const aEng = (a.likes_count || 0) + (a.comments_count || 0) + (a.shares_count || 0)
      const bEng = (b.likes_count || 0) + (b.comments_count || 0) + (b.shares_count || 0)
      return bEng - aEng
    }).slice(0, 5)

    // % change compared to previous same period
    let previousFiltered: Post[] = []
    switch (period) {
      case 'day':
        previousFiltered = allPosts.filter((p) => {
          const created = new Date(p.created_at)
          const yesterday = new Date(now)
          yesterday.setDate(now.getDate() - 1)
          return created >= yesterday && created < new Date(now.getFullYear(), now.getMonth(), now.getDate())
        })
        break
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - 7)
        const prevWeekStart = new Date(now)
        prevWeekStart.setDate(now.getDate() - 14)
        previousFiltered = allPosts.filter((p) => {
          const created = new Date(p.created_at)
          return created >= prevWeekStart && created < weekStart
        })
        break
      case 'month':
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const currMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        previousFiltered = allPosts.filter((p) => {
          const created = new Date(p.created_at)
          return created >= prevMonth && created < currMonthStart
        })
        break
      case 'year':
        previousFiltered = allPosts.filter((p) => {
          const created = new Date(p.created_at)
          return created.getFullYear() === now.getFullYear() - 1
        })
        break
    }
    const previousTotal = previousFiltered.length
    const periodChange = previousTotal ? ((totalPosts - previousTotal) / previousTotal) * 100 : 0

    setAnalytics({
      totalPosts,
      avgEngagement,
      topPosts,
      periodChange
    })
  }

  useEffect(() => {
    if (posts.length) computeAnalytics(posts)
  }, [posts, period])

  useEffect(() => {
    fetchPosts()
  }, [])

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Posts Management & Analytics</h2>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white shadow rounded">
            Total Posts: {analytics.totalPosts}
          </div>
          <div className="p-4 bg-white shadow rounded">
            Avg Engagement: {analytics.avgEngagement.toFixed(2)}
          </div>
          <div className="p-4 bg-white shadow rounded">
            % Change: {analytics.periodChange.toFixed(2)}%
          </div>
          <div className="p-4 bg-white shadow rounded">
            Top Post: {analytics.topPosts[0]?.content.slice(0, 30) || 'N/A'}
          </div>
        </div>
      )}

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

      {/* Posts Table */}
      {loading ? (
        <div>Loading posts...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Author ID</th>
                <th className="p-2 border">Content</th>
                <th className="p-2 border">Likes</th>
                <th className="p-2 border">Comments</th>
                <th className="p-2 border">Shares</th>
                <th className="p-2 border">Created At</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 border">{p.author_id}</td>
                  <td className="p-2 border">{p.content.slice(0, 50)}...</td>
                  <td className="p-2 border">{p.likes_count}</td>
                  <td className="p-2 border">{p.comments_count}</td>
                  <td className="p-2 border">{p.shares_count}</td>
                  <td className="p-2 border">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="p-2 border">
                    <button
                      disabled={!!actionLoading}
                      onClick={() => deletePost(p.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center">
                    No posts found.
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

export default AdminPosts
