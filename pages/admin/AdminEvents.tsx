// pages/admin/AdminEvents.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

type Event = {
  id: string
  organizer_id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  rsvp_count: number
  is_active: boolean
  created_at: string
}

type Analytics = {
  totalEvents: number
  activeEvents: number
  upcomingEvents: number
  avgRsvp: number
  periodChange: number
  topEvents: Event[]
}

const periods = ['day', 'week', 'month', 'year'] as const
type Period = typeof periods[number]

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching events:', error)
    setEvents(data || [])
    setLoading(false)
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return
    setActionLoading(eventId)

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) console.error('Error deleting event:', error)
    await fetchEvents()
    setActionLoading(null)
  }

  const computeAnalytics = (allEvents: Event[]) => {
    const now = new Date()

    const filterByPeriod = (dateStr: string) => {
      const d = new Date(dateStr)
      switch (period) {
        case 'day':
          return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
        case 'week':
          const weekAgo = new Date(now)
          weekAgo.setDate(now.getDate() - 7)
          return d >= weekAgo
        case 'month':
          return d >= new Date(now.getFullYear(), now.getMonth(), 1)
        case 'year':
          return d >= new Date(now.getFullYear(), 0, 1)
      }
    }

    const filtered = allEvents.filter(e => filterByPeriod(e.created_at))
    const previous = allEvents.filter(e => {
      const d = new Date(e.created_at)
      switch (period) {
        case 'day':
          const y = new Date(now)
          y.setDate(now.getDate() - 1)
          return d >= y && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())
        case 'week':
          const w1 = new Date(now)
          w1.setDate(now.getDate() - 7)
          const w2 = new Date(now)
          w2.setDate(now.getDate() - 14)
          return d >= w2 && d < w1
        case 'month':
          return d.getMonth() === now.getMonth() - 1
        case 'year':
          return d.getFullYear() === now.getFullYear() - 1
      }
    })

    const totalEvents = filtered.length
    const activeEvents = filtered.filter(e => e.is_active).length
    const upcomingEvents = filtered.filter(
      e => new Date(e.event_date) > now
    ).length

    const totalRsvp = filtered.reduce((s, e) => s + (e.rsvp_count || 0), 0)
    const avgRsvp = totalEvents ? totalRsvp / totalEvents : 0

    const periodChange = previous.length
      ? ((totalEvents - previous.length) / previous.length) * 100
      : 0

    const topEvents = [...filtered]
      .sort((a, b) => b.rsvp_count - a.rsvp_count)
      .slice(0, 5)

    setAnalytics({
      totalEvents,
      activeEvents,
      upcomingEvents,
      avgRsvp,
      periodChange,
      topEvents,
    })
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (events.length) computeAnalytics(events)
  }, [events, period])

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Events Management & Analytics</h2>

      {/* Analytics cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 bg-white shadow rounded">Total: {analytics.totalEvents}</div>
          <div className="p-4 bg-white shadow rounded">Active: {analytics.activeEvents}</div>
          <div className="p-4 bg-white shadow rounded">Upcoming: {analytics.upcomingEvents}</div>
          <div className="p-4 bg-white shadow rounded">Avg RSVP: {analytics.avgRsvp.toFixed(1)}</div>
          <div className="p-4 bg-white shadow rounded">% Change: {analytics.periodChange.toFixed(2)}%</div>
        </div>
      )}

      {/* Period Filter */}
      <div className="mb-4 flex gap-2">
        {periods.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded border ${
              period === p ? 'bg-blue-600 text-white' : 'bg-white'
            }`}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Events Table */}
      {loading ? (
        <div>Loading events...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Title</th>
                <th className="p-2 border">Event Date</th>
                <th className="p-2 border">RSVP</th>
                <th className="p-2 border">Active</th>
                <th className="p-2 border">Created</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id}>
                  <td className="p-2 border">{e.title}</td>
                  <td className="p-2 border">
                    {new Date(e.event_date).toLocaleString()}
                  </td>
                  <td className="p-2 border">{e.rsvp_count}</td>
                  <td className="p-2 border">
                    {e.is_active ? 'Yes' : 'No'}
                  </td>
                  <td className="p-2 border">
                    {new Date(e.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-2 border">
                    <button
                      onClick={() => deleteEvent(e.id)}
                      disabled={!!actionLoading}
                      className="bg-red-600 text-white px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td colSpan={6} className="text-center p-4">
                    No events found
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

export default AdminEvents
