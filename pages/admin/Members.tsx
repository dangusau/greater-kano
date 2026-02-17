import React, { useEffect, useState } from 'react'
import { adminMembersService, Member } from '../../services/adminMembers'
import { CheckCircle, XCircle, User, Shield, Trash2 } from 'lucide-react'

const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  // For delete loading state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchMembers = async () => {
    setLoading(true)

    let response
    switch (filter) {
      case 'verified':
        response = await adminMembersService.getVerifiedMembers()
        break
      case 'unverified':
        response = await adminMembersService.getRegularMembers()
        break
      default:
        response = await adminMembersService.getMembers()
    }

    if (response.error) {
      console.error('Error fetching members:', response.error)
      showToast('Failed to load members', 'error')
    } else {
      setMembers(response.data || [])
    }
    setLoading(false)
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleVerify = async (memberId: string) => {
    if (!confirm('Are you sure you want to verify this member?')) return

    const { error } = await adminMembersService.verifyMember(memberId)
    if (error) {
      console.error('Error verifying member:', error)
      showToast('Failed to verify member', 'error')
    } else {
      showToast('Member verified successfully!', 'success')
      fetchMembers()
    }
  }

  const handleUnverify = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove verification?')) return

    const { error } = await adminMembersService.unverifyMember(memberId)
    if (error) {
      console.error('Error unverifying member:', error)
      showToast('Failed to unverify member', 'error')
    } else {
      showToast('Member verification removed successfully!', 'success')
      fetchMembers()
    }
  }

  const handleDelete = async (profileId: string, email: string) => {
    if (!confirm(`Delete this member permanently?\n\nEmail: ${email}`)) return

    setDeletingId(profileId)
    const { success, error } = await adminMembersService.deleteMember(profileId)
    setDeletingId(null)

    if (!success || error) {
      console.error('Delete error:', error)
      showToast('Failed to delete member', 'error')
    } else {
      showToast('Member deleted successfully', 'success')
      fetchMembers()
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [filter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800'
      case 'member': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4" />
      case 'member': return <User className="h-4 w-4" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } transition-opacity duration-300`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Members Management
            </h1>
            <p className="text-gray-600 mt-2">Manage and verify community members</p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Total: <span className="text-blue-600">{members.length}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            All Members
          </button>

          <button
            onClick={() => setFilter('verified')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'verified'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Verified
          </button>

          <button
            onClick={() => setFilter('unverified')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'unverified'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Unverified
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading members...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">Member</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Contact</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Joined</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mr-3">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-sm text-gray-500">ID: {member.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div>
                          <p className="text-gray-900">{member.email}</p>
                          <p className="text-sm text-gray-500">{member.phone || 'No phone'}</p>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(member.user_status)}`}
                        >
                          {getStatusIcon(member.user_status)}
                          <span className="ml-1 capitalize">{member.user_status}</span>
                        </span>
                      </td>

                      <td className="p-4">
                        <p className="text-gray-900">
                          {new Date(member.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(member.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>

                      <td className="p-4">
                        <div className="flex space-x-2">
                          {member.user_status === 'member' ? (
                            <button
                              onClick={() => handleVerify(member.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                            >
                              <Shield className="h-4 w-4 mr-1.5" />
                              Verify
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnverify(member.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                            >
                              <XCircle className="h-4 w-4 mr-1.5" />
                              Unverify
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(member.id, member.email)}
                            disabled={deletingId === member.id}
                            className={`inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg transition-opacity ${
                              deletingId === member.id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                            }`}
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            {deletingId === member.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {members.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {filter === 'verified'
                    ? 'No verified members yet.'
                    : filter === 'unverified'
                    ? 'All members are currently verified!'
                    : 'No members found in the system.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5">
          <div className="flex items-center mb-3">
            <User className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">Total Members</span>
          </div>
          <p className="text-3xl font-bold text-blue-900 mb-2">{members.length}</p>
          <p className="text-sm text-blue-700 opacity-80">All community members</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5">
          <div className="flex items-center mb-3">
            <Shield className="h-5 w-5 text-green-600 mr-2" />
            <span className="font-medium text-green-800">Verified Members</span>
          </div>
          <p className="text-3xl font-bold text-green-900 mb-2">
            {members.filter((m) => m.user_status === 'verified').length}
          </p>
          <p className="text-sm text-green-700 opacity-80">With blue verification badge</p>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5">
          <div className="flex items-center mb-3">
            <User className="h-5 w-5 text-gray-600 mr-2" />
            <span className="font-medium text-gray-800">Regular Members</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {members.filter((m) => m.user_status === 'member').length}
          </p>
          <p className="text-sm text-gray-700 opacity-80">Awaiting verification</p>
        </div>
      </div>
    </div>
  )
}

export default Members
