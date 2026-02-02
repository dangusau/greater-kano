// pages/admin/AdminBusinesses.tsx
import React, { useEffect, useState } from 'react'
import { adminBusinessesService } from '../../services/adminBusinesses'
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Clock, 
  Building2, 
  MapPin, 
  User, 
  AlertCircle,
  Loader2,
  Mail,
  Globe
} from 'lucide-react'

type Business = {
  id: string
  owner_id: string
  name: string
  description: string | null
  business_type: string
  category: string
  location_axis: string
  email: string | null
  phone: string | null
  website: string | null
  logo_url: string | null
  banner_url: string | null
  is_registered: boolean
  verification_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  rejection_reason?: string | null
  owner_first_name: string | null
  owner_last_name: string | null
  owner_email: string | null
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; bgColor: string }> = {
  pending: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: <Clock className="w-4 h-4" />
  },
  approved: {
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200',
    icon: <CheckCircle className="w-4 h-4" />
  },
  rejected: {
    color: 'text-rose-700',
    bgColor: 'bg-rose-50 border-rose-200',
    icon: <XCircle className="w-4 h-4" />
  },
}

const AdminBusinesses: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchBusinesses = async () => {
    setLoading(true)
    const { data, error } = await adminBusinessesService.getBusinesses()
    if (error) console.error('Error fetching businesses:', error)
    setBusinesses(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const handleApprove = async (businessId: string) => {
    setActionLoading(businessId)
    const { error } = await adminBusinessesService.approveBusiness(businessId)
    if (error) console.error('Error approving business:', error)
    await fetchBusinesses()
    setActionLoading(null)
  }

  const handleReject = async (businessId: string) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    setActionLoading(businessId)
    const { error } = await adminBusinessesService.rejectBusiness(businessId, reason)
    if (error) console.error('Error rejecting business:', error)
    await fetchBusinesses()
    setActionLoading(null)
  }

  const handleDelete = async (businessId: string) => {
    const confirmDelete = confirm('Are you sure you want to delete this business?')
    if (!confirmDelete) return
    setActionLoading(businessId)
    const { error } = await adminBusinessesService.deleteBusiness(businessId)
    if (error) console.error('Error deleting business:', error)
    await fetchBusinesses()
    setActionLoading(null)
  }

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    const config = statusConfig[status]
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.color}`}>
        {config.icon}
        <span className="text-sm font-medium capitalize">{status}</span>
      </div>
    )
  }

  const getOwnerName = (business: Business) => {
    if (business.owner_first_name || business.owner_last_name) {
      return `${business.owner_first_name || ''} ${business.owner_last_name || ''}`.trim()
    }
    return business.owner_email || 'Unknown'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white rounded-lg shadow-sm border">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Business Management</h2>
          </div>
          <p className="text-gray-600">Review and manage business verification requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Businesses</p>
                <p className="text-2xl font-bold text-gray-800">{businesses.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">
                  {businesses.filter(b => b.verification_status === 'pending').length}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {businesses.filter(b => b.verification_status === 'approved').length}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Business Table */}
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Business List</h3>
            <button
              onClick={fetchBusinesses}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Refresh List
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600">Loading businesses...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Business</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Owner</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Type & Category</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Location</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {businesses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-gray-500 text-lg">No businesses found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {businesses.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                          {b.logo_url ? (
                            <img src={b.logo_url} alt={b.name} className="w-8 h-8 rounded" />
                          ) : (
                            <Building2 className="w-5 h-5 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{b.name}</p>
                          {b.email && (
                            <a href={`mailto:${b.email}`} className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> Email
                            </a>
                          )}
                          {b.website && (
                            <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1">
                              <Globe className="w-3 h-3" /> Website
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-gray-800">{getOwnerName(b)}</span>
                          {b.owner_email && (
                            <a href={`mailto:${b.owner_email}`} className="text-xs text-gray-600 hover:text-indigo-600">{b.owner_email}</a>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{b.business_type}</span>
                          <p className="text-sm text-gray-600">{b.category}</p>
                        </div>
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{b.location_axis}</span>
                      </td>
                      <td className="p-4">{getStatusBadge(b.verification_status)}</td>
                      <td className="p-4 flex gap-2">
                        {b.verification_status === 'pending' && (
                          <>
                            <button
                              disabled={!!actionLoading}
                              onClick={() => handleApprove(b.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Approve
                            </button>
                            <button
                              disabled={!!actionLoading}
                              onClick={() => handleReject(b.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          disabled={!!actionLoading}
                          onClick={() => handleDelete(b.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Need help? Contact support for assistance with business verification.
        </div>
      </div>
    </div>
  )
}

export default AdminBusinesses