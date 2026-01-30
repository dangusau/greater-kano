// pages/admin/AdminJobs.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

type Job = {
  id: string
  company_id: string
  title: string
  job_type: string
  created_at: string
}

type PosterStat = {
  company_id: string
  total: number
}

type Analytics = {
  totalJobs: number
  periodChange: number
  jobsByContract: Record<string, number>
  topPosters: PosterStat[]
}

type Period = 'day' | 'week' | 'month' | 'year'

const periods: Period[] = ['day', 'week', 'month', 'year']

const AdminJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  /* ---------------- FETCH JOBS ---------------- */
  const fetchJobs = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('jobs')
      .select('id, company_id, title, job_type, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
    } else {
      setJobs(data || [])
    }

    setLoading(false)
  }

  /* ---------------- DELETE JOB ---------------- */
  const deleteJob = async (jobId: string) => {
    if (!confirm('Delete this job?')) return
    setDeleting(jobId)

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)

    if (error) console.error('Error deleting job:', error)

    await fetchJobs()
    setDeleting(null)
  }

  /* ---------------- ANALYTICS ---------------- */
  const calculateAnalytics = (allJobs: Job[]) => {
    const now = new Date()

    const isInPeriod = (date: Date) => {
      switch (period) {
        case 'day':
          return date >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
        case 'week':
          const weekAgo = new Date(now)
          weekAgo.setDate(now.getDate() - 7)
          return date >= weekAgo
        case 'month':
          return date >= new Date(now.getFullYear(), now.getMonth(), 1)
        case 'year':
          return date >= new Date(now.getFullYear(), 0, 1)
      }
    }

    const currentJobs = allJobs.filter(j => isInPeriod(new Date(j.created_at)))
    const totalJobs = currentJobs.length

    /* Jobs by contract type */
    const jobsByContract: Record<string, number> = {}
    currentJobs.forEach(j => {
      jobsByContract[j.job_type] = (jobsByContract[j.job_type] || 0) + 1
    })

    /* Top posters */
    const posterMap: Record<string, number> = {}
    currentJobs.forEach(j => {
      posterMap[j.company_id] = (posterMap[j.company_id] || 0) + 1
    })

    const topPosters = Object.entries(posterMap)
      .map(([company_id, total]) => ({ company_id, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    /* Previous period comparison */
    const previousJobs = allJobs.filter(j => {
      const d = new Date(j.created_at)
      switch (period) {
        case 'day':
          const y = new Date(now)
          y.setDate(now.getDate() - 1)
          return d >= y && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())
        case 'week':
          const w1 = new Date(now)
          w1.setDate(now.getDate() - 14)
          const w2 = new Date(now)
          w2.setDate(now.getDate() - 7)
          return d >= w1 && d < w2
        case 'month':
          const m1 = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const m2 = new Date(now.getFullYear(), now.getMonth(), 1)
          return d >= m1 && d < m2
        case 'year':
          return d.getFullYear() === now.getFullYear() - 1
      }
    })

    const periodChange =
      previousJobs.length === 0
        ? 0
        : ((totalJobs - previousJobs.length) / previousJobs.length) * 100

    setAnalytics({
      totalJobs,
      periodChange,
      jobsByContract,
      topPosters
    })
  }

  useEffect(() => {
    if (jobs.length) calculateAnalytics(jobs)
  }, [jobs, period])

  useEffect(() => {
    fetchJobs()
  }, [])

  /* ---------------- UI ---------------- */
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Jobs Management & Analytics</h2>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {periods.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded border ${
              p === period ? 'bg-blue-600 text-white' : 'bg-white'
            }`}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white rounded shadow">
            Total Jobs: {analytics.totalJobs}
          </div>
          <div className="p-4 bg-white rounded shadow">
            % Change: {analytics.periodChange.toFixed(2)}%
          </div>
          <div className="p-4 bg-white rounded shadow">
            Contract Types:
            {Object.entries(analytics.jobsByContract).map(([k, v]) => (
              <div key={k}>{k}: {v}</div>
            ))}
          </div>
          <div className="p-4 bg-white rounded shadow">
            Top Posters:
            {analytics.topPosters.map(p => (
              <div key={p.company_id}>
                {p.company_id.slice(0, 6)}… — {p.total}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs Table */}
      {loading ? (
        <div>Loading jobs...</div>
      ) : (
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Title</th>
              <th className="p-2 border">Contract</th>
              <th className="p-2 border">Posted</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id}>
                <td className="p-2 border">{j.title}</td>
                <td className="p-2 border">{j.job_type}</td>
                <td className="p-2 border">{new Date(j.created_at).toLocaleDateString()}</td>
                <td className="p-2 border">
                  <button
                    onClick={() => deleteJob(j.id)}
                    disabled={deleting === j.id}
                    className="bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center">No jobs found</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AdminJobs
