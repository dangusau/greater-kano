// pages/admin/AdminJobs.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import {
  Briefcase,
  Building,
  Eye,
  Filter,
  DollarSign,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Users,
  TrendingUp,
  RefreshCw,
  Trash2,
  Shield
} from 'lucide-react';

// Types
interface Job {
  id: string;
  company_id: string;
  company_name: string;
  company_email: string;
  title: string;
  description: string;
  salary: string;
  job_type: string;
  location: string;
  contact_info: any;
  experience_level: string;
  category: string;
  is_verified: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
}

interface JobTypeStat {
  job_type: string;
  count: number;
}

interface CategoryStat {
  category: string;
  count: number;
}

interface CompanyStat {
  company_name: string;
  company_email: string;
  job_count: number;
  total_views: number;
}

interface VerificationStat {
  status: string;
  count: number;
}

interface Analytics {
  total_jobs: number;
  today_jobs: number;
  avg_views: number;
  total_views: number;
  verified_jobs: number;
  oldest_job: string;
  newest_job: string;
  job_type_distribution: JobTypeStat[];
  category_distribution: CategoryStat[];
  top_companies: CompanyStat[];
  verification_status: VerificationStat[];
}

const periods = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' }
] as const;

type Period = typeof periods[number]['value'];

const AdminJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');

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

  // Fetch jobs with RPC
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates();
      
      const { data, error } = await supabase
        .rpc('admin_get_jobs_listings', {
          period_start: start?.toISOString() || null,
          period_end: end?.toISOString() || null,
          limit_count: 100,
          offset_val: 0
        });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics with RPC
  const fetchAnalytics = async () => {
    try {
      const { start, end } = getPeriodDates();
      
      const { data, error } = await supabase
        .rpc('admin_get_jobs_analytics', {
          period_start: start?.toISOString() || null,
          period_end: end?.toISOString() || null
        });

      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Delete job with RPC
  const deleteJob = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;
    
    setActionLoading(id);
    try {
      const { data, error } = await supabase
        .rpc('admin_delete_job', { job_id: id });

      if (error) throw error;
      
      if (data.success) {
        alert(data.message);
        await Promise.all([fetchJobs(), fetchAnalytics()]);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Failed to delete job');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle verification with RPC
  const toggleVerification = async (id: string, currentStatus: boolean) => {
    setActionLoading(`verify-${id}`);
    try {
      const { data, error } = await supabase
        .rpc('admin_toggle_job_verification', {
          job_id: id,
          is_verified_status: !currentStatus
        });

      if (error) throw error;
      
      if (data.success) {
        await Promise.all([fetchJobs(), fetchAnalytics()]);
      }
    } catch (error) {
      console.error('Error toggling verification:', error);
      alert('Failed to update verification status');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || job.job_type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || job.category === categoryFilter;
    const matchesVerification = verificationFilter === 'all' || 
      (verificationFilter === 'verified' && job.is_verified) ||
      (verificationFilter === 'not_verified' && !job.is_verified);
    
    return matchesSearch && matchesType && matchesCategory && matchesVerification;
  });

  // Get unique job types and categories
  const jobTypes = ['all', ...new Set(jobs.map(j => j.job_type))];
  const categories = ['all', ...new Set(jobs.map(j => j.category || 'Uncategorized'))];

  // Load data on mount and period change
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchJobs(), fetchAnalytics()]);
    };
    loadData();
  }, [period]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format salary
  const formatSalary = (salary: string) => {
    if (!salary) return 'Not specified';
    return salary;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Jobs Management</h1>
            <p className="text-gray-600">Manage and analyze job listings</p>
          </div>
          <button
            onClick={() => Promise.all([fetchJobs(), fetchAnalytics()])}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs, companies, or descriptions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {jobTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Job Types' : type.replace('-', ' ')}
              </option>
            ))}
          </select>
          
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
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="verified">Verified Only</option>
            <option value="not_verified">Not Verified</option>
          </select>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Jobs */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_jobs}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Briefcase className="text-blue-600" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <Calendar size={16} className="mr-1" />
              <span>{analytics.today_jobs} posted today</span>
            </div>
          </div>

          {/* Verified Jobs */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Verified Jobs</p>
                <p className="text-3xl font-bold text-green-600">{analytics.verified_jobs}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {analytics.total_jobs - analytics.verified_jobs} pending verification
            </div>
          </div>

          {/* Total Views */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Views</p>
                <p className="text-3xl font-bold text-amber-600">{analytics.total_views.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Eye className="text-amber-600" size={24} />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Avg: {analytics.avg_views.toFixed(1)} views per job
            </div>
          </div>

          {/* Top Companies */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Top Companies</p>
                <p className="text-3xl font-bold text-purple-600">{analytics.top_companies.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building className="text-purple-600" size={24} />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {analytics.top_companies[0]?.company_name || 'None'} leads with {analytics.top_companies[0]?.job_count || 0} jobs
            </div>
          </div>
        </div>
      )}

      {/* Job Type & Category Distribution */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Job Type Distribution */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Type Distribution</h3>
            <div className="space-y-3">
              {analytics.job_type_distribution.map((stat) => (
                <div key={stat.job_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900 capitalize">{stat.job_type.replace('-', ' ')}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{stat.count} jobs</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {((stat.count / analytics.total_jobs) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Status</h3>
            <div className="space-y-3">
              {analytics.verification_status.map((stat) => (
                <div key={stat.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {stat.status === 'Verified' ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                    <span className="font-medium text-gray-900">{stat.status}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{stat.count} jobs</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      stat.status === 'Verified' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {((stat.count / analytics.total_jobs) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Companies */}
      {analytics && analytics.top_companies.length > 0 && (
        <div className="mb-8 bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Companies by Job Posts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.top_companies.map((company) => (
              <div key={company.company_email} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{company.company_name}</p>
                    <p className="text-sm text-gray-500 truncate">{company.company_email}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{company.job_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Eye size={14} />
                    {company.total_views.toLocaleString()} views
                  </span>
                  <span className="text-gray-600">
                    Avg: {company.total_views > 0 ? Math.round(company.total_views / company.job_count) : 0} views/job
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Job Listings</h2>
          <p className="text-sm text-gray-600">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading jobs data...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No jobs found</h3>
            <p className="mt-2 text-gray-500">
              {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' || verificationFilter !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'No job listings available for this period'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{job.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {job.job_type.replace('-', ' ')}
                          </span>
                          {job.category && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {job.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
                          {job.description.substring(0, 100)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{job.company_name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{job.company_email}</p>
                        {job.location && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <MapPin size={12} />
                            {job.location}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-gray-600">Salary:</span>{' '}
                          <span className="font-medium text-gray-900">{formatSalary(job.salary)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Experience:</span>{' '}
                          <span className="font-medium text-gray-900">{job.experience_level || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Eye size={14} className="text-gray-400" />
                          <span className="text-gray-600">{job.views_count} views</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <button
                          onClick={() => toggleVerification(job.id, job.is_verified)}
                          disabled={actionLoading === `verify-${job.id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            job.is_verified
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {job.is_verified ? (
                            <>
                              <CheckCircle size={12} />
                              Verified
                            </>
                          ) : (
                            <>
                              <XCircle size={12} />
                              Not Verified
                            </>
                          )}
                        </button>
                        <div className="text-xs text-gray-500">
                          Posted: {formatDate(job.created_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteJob(job.id, job.title)}
                          disabled={actionLoading === job.id}
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

export default AdminJobs;