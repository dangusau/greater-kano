// pages/admin/AdminEvents.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import {
  Calendar,
  Users,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
  Trash2,
  AlertCircle,
  Eye,
  User
} from 'lucide-react';

// Types
interface Event {
  id: string;
  organizer_id: string;
  organizer_name: string;
  organizer_email: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  rsvp_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OrganizerStat {
  organizer_name: string;
  organizer_email: string;
  event_count: number;
  total_rsvp: number;
}

interface TopEvent {
  title: string;
  organizer_name: string;
  rsvp_count: number;
  event_date: string;
  location: string;
  is_active: boolean;
}

interface UpcomingEvent {
  title: string;
  organizer_name: string;
  event_date: string;
  location: string;
  rsvp_count: number;
  days_until: number;
}

interface RecentEvent {
  title: string;
  organizer_name: string;
  created_at: string;
  rsvp_count: number;
  is_active: boolean;
}

interface Analytics {
  total_events: number;
  today_events: number;
  active_events: number;
  upcoming_events: number;
  past_events: number;
  total_rsvp: number;
  avg_rsvp: number;
  max_rsvp: number;
  oldest_event: string;
  newest_event: string;
  top_organizers: OrganizerStat[];
  top_events: TopEvent[];
  upcoming_events_list: UpcomingEvent[];
  recent_events: RecentEvent[];
}

const periods = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' }
] as const;

type Period = typeof periods[number]['value'];

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');

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

  // Fetch events with RPC
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates();
      
      const { data, error } = await supabase
        .rpc('admin_get_events_listings', {
          period_start: start?.toISOString() || null,
          period_end: end?.toISOString() || null,
          limit_count: 100,
          offset_val: 0
        });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics with RPC
  const fetchAnalytics = async () => {
    try {
      const { start, end } = getPeriodDates();
      
      const { data, error } = await supabase
        .rpc('admin_get_events_analytics', {
          period_start: start?.toISOString() || null,
          period_end: end?.toISOString() || null
        });

      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Delete event with RPC
  const deleteEvent = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;
    
    setActionLoading(id);
    try {
      const { data, error } = await supabase
        .rpc('admin_delete_event', { event_id: id });

      if (error) throw error;
      
      if (data.success) {
        alert(data.message);
        await Promise.all([fetchEvents(), fetchAnalytics()]);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle active status with RPC
  const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
    setActionLoading(`status-${id}`);
    try {
      const { data, error } = await supabase
        .rpc('admin_toggle_event_active_status', {
          event_id: id,
          is_active_status: !currentStatus
        });

      if (error) throw error;
      
      if (data.success) {
        await Promise.all([fetchEvents(), fetchAnalytics()]);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update event status');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = searchQuery === '' || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.organizer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && event.is_active) ||
      (statusFilter === 'inactive' && !event.is_active);
    
    const matchesTime = timeFilter === 'all' ||
      (timeFilter === 'upcoming' && new Date(event.event_date) > new Date()) ||
      (timeFilter === 'past' && new Date(event.event_date) <= new Date());
    
    return matchesSearch && matchesStatus && matchesTime;
  });

  // Load data on mount and period change
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchEvents(), fetchAnalytics()]);
    };
    loadData();
  }, [period]);

  // Format date
  const formatDate = (dateString: string, showTime: boolean = false) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(showTime && { hour: '2-digit', minute: '2-digit' })
    });
  };

  // Get days until event
  const getDaysUntil = (eventDate: string) => {
    const now = new Date();
    const event = new Date(eventDate);
    const diffTime = event.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
            <p className="text-gray-600">Manage and analyze events</p>
          </div>
          <button
            onClick={() => Promise.all([fetchEvents(), fetchAnalytics()])}
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
              placeholder="Search events, organizers, or descriptions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Events</option>
            <option value="upcoming">Upcoming Only</option>
            <option value="past">Past Events</option>
          </select>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Events */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Events</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_events}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="text-blue-600" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <Clock size={16} className="mr-1" />
              <span>{analytics.today_events} created today</span>
            </div>
          </div>

          {/* Active Events */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Events</p>
                <p className="text-3xl font-bold text-green-600">{analytics.active_events}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {analytics.upcoming_events} upcoming, {analytics.past_events} past
            </div>
          </div>

          {/* Total RSVP */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total RSVP</p>
                <p className="text-3xl font-bold text-amber-600">{analytics.total_rsvp.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Users className="text-amber-600" size={24} />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Avg: {analytics.avg_rsvp.toFixed(1)} per event
            </div>
          </div>

          {/* Top Organizers */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Top Organizers</p>
                <p className="text-3xl font-bold text-purple-600">{analytics.top_organizers.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <User className="text-purple-600" size={24} />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {analytics.top_organizers[0]?.organizer_name || 'None'} leads with {analytics.top_organizers[0]?.event_count || 0} events
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events & Top Events */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
            <div className="space-y-4">
              {analytics.upcoming_events_list.length > 0 ? (
                analytics.upcoming_events_list.map((event) => (
                  <div key={event.title + event.event_date} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {event.days_until === 0 ? 'Today' : `${event.days_until}d`}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <User size={14} />
                        {event.organizer_name}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(event.event_date, true)}
                      </p>
                      {event.location && (
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin size={14} />
                          {event.location}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Users size={14} />
                          {event.rsvp_count} RSVPs
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2">No upcoming events</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Events by RSVP */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Events by RSVP</h3>
            <div className="space-y-4">
              {analytics.top_events.length > 0 ? (
                analytics.top_events.map((event, index) => (
                  <div key={event.title + index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        {event.rsvp_count} RSVPs
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">{event.organizer_name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{formatDate(event.event_date)}</span>
                        <span className={`inline-flex items-center gap-1 ${
                          event.is_active ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {event.is_active ? (
                            <>
                              <CheckCircle size={12} />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle size={12} />
                              Inactive
                            </>
                          )}
                        </span>
                      </div>
                      {event.location && (
                        <p className="text-sm text-gray-600 truncate">
                          <MapPin size={12} className="inline mr-1" />
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2">No events with RSVPs</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Organizers */}
      {analytics && analytics.top_organizers.length > 0 && (
        <div className="mb-8 bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Organizers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.top_organizers.map((organizer) => (
              <div key={organizer.organizer_email} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{organizer.organizer_name}</p>
                    <p className="text-sm text-gray-500 truncate">{organizer.organizer_email}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{organizer.event_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Users size={14} />
                    {organizer.total_rsvp.toLocaleString()} total RSVPs
                  </span>
                  <span className="text-gray-600">
                    Avg: {organizer.event_count > 0 ? Math.round(organizer.total_rsvp / organizer.event_count) : 0} RSVPs/event
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Events List</h2>
          <p className="text-sm text-gray-600">
            Showing {filteredEvents.length} of {events.length} events
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading events data...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No events found</h3>
            <p className="mt-2 text-gray-500">
              {searchQuery || statusFilter !== 'all' || timeFilter !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'No events available for this period'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organizer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RSVP Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
                          {event.description.substring(0, 100)}...
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            event.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {event.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Created: {formatDate(event.created_at)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{event.organizer_name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{event.organizer_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <Calendar size={14} className="text-gray-400" />
                          {formatDate(event.event_date, true)}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin size={14} className="text-gray-400" />
                            {event.location}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {getDaysUntil(event.event_date) > 0 
                            ? `${getDaysUntil(event.event_date)} days until event`
                            : getDaysUntil(event.event_date) === 0
                            ? 'Event is today'
                            : `${Math.abs(getDaysUntil(event.event_date))} days ago`
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-gray-400" />
                          <span className="text-lg font-bold text-gray-900">{event.rsvp_count}</span>
                          <span className="text-sm text-gray-600">RSVPs</span>
                        </div>
                        <button
                          onClick={() => toggleActiveStatus(event.id, event.is_active)}
                          disabled={actionLoading === `status-${event.id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            event.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {event.is_active ? (
                            <>
                              <CheckCircle size={12} />
                              Set Inactive
                            </>
                          ) : (
                            <>
                              <XCircle size={12} />
                              Set Active
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteEvent(event.id, event.title)}
                          disabled={actionLoading === event.id}
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
    </div>
  );
};

export default AdminEvents;