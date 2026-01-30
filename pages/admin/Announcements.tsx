import React, { useEffect, useState } from 'react'
import { 
  adminAnnouncementService, 
  AnnouncementFormData,
  User,
  SentAnnouncement 
} from '../../services/adminAnnouncementService'

const Announcements: React.FC = () => {
  // State for announcements list
  const [announcements, setAnnouncements] = useState<SentAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // State for create form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [sendToAll, setSendToAll] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    message: '',
    type: 'system_message',
    selectedUserIds: [],
    sendToAll: false,
    action_url: ''
  })

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase()
    const displayName = adminAnnouncementService.getUserDisplayName(user).toLowerCase()
    return (
      displayName.includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.business_name?.toLowerCase().includes(searchLower) || false) ||
      (user.first_name?.toLowerCase().includes(searchLower) || false) ||
      (user.last_name?.toLowerCase().includes(searchLower) || false)
    )
  })

  // Load data on component mount
  useEffect(() => {
    loadAnnouncements()
    loadUsers()
  }, [])

  // Load sent announcements
  const loadAnnouncements = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await adminAnnouncementService.getSentAnnouncements()
      
      if (error) {
        throw new Error(`Failed to load announcements: ${error.message}`)
      }
      
      setAnnouncements(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements')
      console.error('Error loading announcements:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load approved users for selection
  const loadUsers = async () => {
    try {
      const { data, error } = await adminAnnouncementService.getAllUsers()
      
      if (error) {
        throw new Error(`Failed to load users: ${error.message}`)
      }
      
      setUsers(data || [])
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  // Handle announcement deletion
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement? This will delete it for all recipients.')) {
      return
    }

    setDeletingId(id)
    
    try {
      const { error } = await adminAnnouncementService.deleteAnnouncement(id)
      
      if (error) {
        throw new Error(`Failed to delete announcement: ${error.message}`)
      }
      
      // Remove from local state
      setAnnouncements(prev => prev.filter(ann => ann.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete announcement')
      console.error('Error deleting announcement:', err)
    } finally {
      setDeletingId(null)
    }
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    if (sendToAll) return
    
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      } else {
        return [...prev, userId]
      }
    })
  }

  // Handle select all users
  const handleSelectAll = () => {
    if (sendToAll) return
    
    if (selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(filteredUsers.map(user => user.id))
    }
  }

  // Toggle send to all
  const handleSendToAllToggle = () => {
    const newSendToAll = !sendToAll
    setSendToAll(newSendToAll)
    
    if (newSendToAll) {
      setSelectedUserIds([])
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    
    if (!formData.message.trim()) {
      setError('Message is required')
      return
    }
    
    if (!sendToAll && selectedUserIds.length === 0) {
      setError('Please select at least one recipient or choose "Send to all users"')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const announcementData: AnnouncementFormData = {
        ...formData,
        selectedUserIds,
        sendToAll
      }

      const { data, error } = await adminAnnouncementService.sendAnnouncement(announcementData)
      
      if (error) {
        throw new Error(`Failed to send announcement: ${error.message}`)
      }

      // Reset form and show success
      setFormData({
        title: '',
        message: '',
        type: 'system_message',
        selectedUserIds: [],
        sendToAll: false,
        action_url: ''
      })
      setSelectedUserIds([])
      setSendToAll(false)
      setShowCreateForm(false)
      setSearchTerm('')
      
      // Reload announcements
      await loadAnnouncements()
      
      // Show success message
      const recipientCount = sendToAll ? users.length : selectedUserIds.length
      setError(`Success! Announcement sent to ${recipientCount} approved user(s).`)
      setTimeout(() => setError(null), 5000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send announcement')
      console.error('Error sending announcement:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Format date helper
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-3 text-gray-600">Loading announcements...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
              <p className="text-gray-600 mt-1">Send and manage system announcements</p>
            </div>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Announcement
              </button>
            )}
          </div>
        </div>

        {/* Error/Success Message */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg ${
            error.includes('Success!') 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {error.includes('Success!') ? (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Create Announcement Form */}
        {showCreateForm && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Create New Announcement</h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Form */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Title */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Title *
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="title"
                          name="title"
                          required
                          value={formData.title}
                          onChange={handleInputChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Announcement title"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                        Message *
                      </label>
                      <div className="mt-1">
                        <textarea
                          id="message"
                          name="message"
                          rows={5}
                          required
                          value={formData.message}
                          onChange={handleInputChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Write your announcement message here..."
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    {/* Action URL */}
                    <div>
                      <label htmlFor="action_url" className="block text-sm font-medium text-gray-700">
                        Action URL (Optional)
                      </label>
                      <div className="mt-1">
                        <input
                          type="url"
                          id="action_url"
                          name="action_url"
                          value={formData.action_url}
                          onChange={handleInputChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="https://example.com/action"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Recipients */}
                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-4">
                        {/* Info about approved users only */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <p className="text-xs text-blue-800">
                            <span className="font-medium">Note:</span> Only users with <span className="font-medium">"approved"</span> status will receive announcements.
                          </p>
                        </div>

                        {/* Send to All Toggle */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">Recipients</h3>
                            <p className="text-xs text-gray-500">
                              {sendToAll 
                                ? `All approved users (${users.length})` 
                                : `${selectedUserIds.length} approved user(s) selected`
                              }
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleSendToAllToggle}
                            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${sendToAll ? 'bg-blue-600' : 'bg-gray-200'}`}
                          >
                            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${sendToAll ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* User Selection (only when not sending to all) */}
                        {!sendToAll && (
                          <>
                            {/* Search Input */}
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search approved users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              {searchTerm && (
                                <button
                                  type="button"
                                  onClick={() => setSearchTerm('')}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {/* Select All Button */}
                            <button
                              type="button"
                              onClick={handleSelectAll}
                              className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0
                                ? 'Deselect All'
                                : 'Select All'
                              }
                            </button>

                            {/* Users List */}
                            <div className="border-t border-gray-200 pt-3">
                              <h4 className="text-xs font-medium text-gray-900 mb-2">
                                Select Approved Users ({filteredUsers.length} of {users.length} total)
                              </h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {filteredUsers.map((user) => (
                                  <div
                                    key={user.id}
                                    className={`flex items-center p-2 rounded-md cursor-pointer text-sm ${
                                      selectedUserIds.includes(user.id)
                                        ? 'bg-blue-50 border border-blue-200'
                                        : 'hover:bg-gray-100'
                                    }`}
                                    onClick={() => handleUserSelect(user.id)}
                                  >
                                    <div className="flex-shrink-0">
                                      <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                                        {user.avatar_url ? (
                                          <img
                                            src={user.avatar_url}
                                            alt=""
                                            className="h-6 w-6 rounded-full"
                                          />
                                        ) : (
                                          <span className="text-xs font-medium text-gray-600">
                                            {adminAnnouncementService.getUserDisplayName(user)[0].toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="ml-2 truncate flex-1">
                                      <p className="font-medium text-gray-900 truncate">
                                        {adminAnnouncementService.getUserDisplayName(user)}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
                                        {user.email}
                                      </p>
                                      {user.business_name && (
                                        <p className="text-xs text-gray-400 truncate">
                                          {user.business_name}
                                        </p>
                                      )}
                                      {user.role && user.role !== 'member' && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                          {user.role}
                                        </span>
                                      )}
                                    </div>
                                    <div className="ml-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedUserIds.includes(user.id)}
                                        onChange={() => {}}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      'Send Announcement'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Total Announcements</p>
                  <p className="text-2xl font-semibold text-gray-900">{announcements.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Approved Users</p>
                  <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Announcements List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Sent Announcements</h2>
          </div>
          
          {announcements.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.801 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No announcements sent yet</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first announcement to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{announcement.title}</h3>
                      </div>
                      
                      <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">{announcement.message}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="inline-flex items-center">
                          <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDateTime(announcement.sent_at)}
                        </span>
                        
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.197a4 4 0 00-6.5-3.197" />
                          </svg>
                          Sent to {announcement.total_recipients} users
                        </span>

                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {announcement.read_count} read
                        </span>

                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {announcement.unread_count} unread
                        </span>
                        
                        {announcement.action_url && (
                          <a
                            href={announcement.action_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-500"
                          >
                            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Action Link
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 sm:mt-0 sm:ml-4 flex space-x-2">
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        disabled={deletingId === announcement.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {deletingId === announcement.id ? (
                          <>
                            <div className="inline-block animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-red-700 mr-1.5"></div>
                            Deleting...
                          </>
                        ) : (
                          'Delete'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Announcements