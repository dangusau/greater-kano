import { useEffect, useState } from 'react';
import { db, DashboardStats } from '../../services/database';

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      const { stats, error } = await db.dashboard.getStats()

      if (error) {
        setError('Failed to load dashboard data')
      } else {
        setStats(stats)
      }

      setLoading(false)
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  // Calculate verification rate safely
  const verificationRate = stats && stats.totalMembers > 0 
    ? Math.round((stats.verifiedMembers / stats.totalMembers) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* PAGE TITLE */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Admin Dashboard
        </h1>
        <p className="text-gray-500">
          Platform overview and activity summary
        </p>
      </div>

      {/* FOCUS ON MEMBERS STATS */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Members Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* All Members Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-7a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Members</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.totalMembers || 0}</p>
              </div>
            </div>
          </div>

          {/* Verified Members Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Verified Members</p>
                <p className="text-2xl font-bold text-gray-800">{stats?.verifiedMembers || 0}</p>
                <p className="text-sm text-green-600 mt-1">{verificationRate}% verified</p>
              </div>
            </div>
          </div>

          {/* Verification Progress Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Verification Progress</p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-bold text-gray-800">{verificationRate}%</span>
                <span className="text-sm text-gray-500">{stats?.verifiedMembers || 0}/{stats?.totalMembers || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${verificationRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Member Status Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-500 mb-3">Member Distribution</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Verified</span>
                <span className="font-semibold text-gray-800">{stats?.verifiedMembers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Regular Members</span>
                <span className="font-semibold text-gray-800">
                  {(stats?.totalMembers || 0) - (stats?.verifiedMembers || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OTHER PLATFORM STATS (Unchanged from original) */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Platform Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Businesses" value={stats?.totalBusinesses} />
          <StatCard title="Pioneers" value={stats?.totalPioneers} />
          <StatCard title="Posts" value={stats?.totalPosts} />
          <StatCard title="Events" value={stats?.totalEvents} />
          <StatCard title="Messages" value={stats?.totalMessages} />
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Pending Approvals</p>
            <p className="text-2xl font-bold text-gray-800">0</p>
            <p className="text-xs text-gray-400 mt-1">No pending approvals in current system</p>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Quick Actions
        </h2>

        <div className="flex flex-wrap gap-3">
          <ActionButton label="Manage Members" to="/admin/members" />
          <ActionButton label="Manage Businesses" to="/admin/businesses" />
          <ActionButton label="Create Announcement" to="/admin/announcements" />
          <ActionButton label="View Reports" to="/admin/reports" />
          <ActionButton label="Verify Members" to="/admin/members/verify" />
        </div>
      </div>
    </div>
  )
}

/* =========================
   SMALL REUSABLE COMPONENTS
========================= */

interface StatCardProps {
  title: string
  value?: number
}

const StatCard = ({ title, value = 0 }: StatCardProps) => (
  <div className="bg-white p-4 rounded shadow hover:shadow-md transition-shadow">
    <p className="text-sm text-gray-500">{title}</p>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
  </div>
)

interface ActionButtonProps {
  label: string
  to: string
}

const ActionButton = ({ label, to }: ActionButtonProps) => (
  <a
    href={to}
    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm hover:opacity-90 transition-opacity shadow-md hover:shadow-lg"
  >
    {label}
  </a>
)

export default Dashboard