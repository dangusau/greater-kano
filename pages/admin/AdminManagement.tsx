import React, { useEffect, useState } from 'react'
import { 
  adminManagementService, 
  AdminUser, 
  AdminFormData,
  AVAILABLE_PERMISSIONS,
  Permission 
} from '../../services/adminManagementservice';

const AdminManagement: React.FC = () => {
  // State for admins list
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for create/edit form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<AdminFormData>({
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    permissions: [],
    active: true
  })

  // Selected permissions for display
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [permissionFilter, setPermissionFilter] = useState<string>('')

  // Get permissions by category
  const permissionsByCategory = adminManagementService.getPermissionsByCategory()
  const categories = Object.keys(permissionsByCategory)

  // Filtered permissions based on search
  const filteredPermissions = AVAILABLE_PERMISSIONS.filter(permission =>
    permission.name.toLowerCase().includes(permissionFilter.toLowerCase()) ||
    permission.description.toLowerCase().includes(permissionFilter.toLowerCase()) ||
    permission.category.toLowerCase().includes(permissionFilter.toLowerCase())
  )

  // Load data on component mount
  useEffect(() => {
    loadAdmins()
  }, [])

  // Load admins
  const loadAdmins = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await adminManagementService.getAllAdmins()
      
      if (error) {
        throw new Error(`Failed to load admins: ${error.message}`)
      }
      
      setAdmins(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admins')
      console.error('Error loading admins:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Handle permission selection
  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId)
      } else {
        return [...prev, permissionId]
      }
    })
  }

  // Handle select all permissions in category
  const handleSelectAllInCategory = (category: string) => {
    const categoryPermissions = permissionsByCategory[category].map(p => p.id)
    const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p))
    
    if (allSelected) {
      // Deselect all in category
      setSelectedPermissions(prev => prev.filter(id => !categoryPermissions.includes(id)))
    } else {
      // Select all in category
      const newPermissions = [...selectedPermissions]
      categoryPermissions.forEach(pid => {
        if (!newPermissions.includes(pid)) {
          newPermissions.push(pid)
        }
      })
      setSelectedPermissions(newPermissions)
    }
  }

  // Handle select all permissions
  const handleSelectAll = () => {
    if (selectedPermissions.length === AVAILABLE_PERMISSIONS.length) {
      setSelectedPermissions([])
    } else {
      setSelectedPermissions(AVAILABLE_PERMISSIONS.map(p => p.id))
    }
  }

  // Open form for creating new admin
  const handleCreateNew = () => {
    setEditingId(null)
    setFormData({
      email: '',
      password: '',
      confirm_password: '',
      full_name: '',
      permissions: [],
      active: true
    })
    setSelectedPermissions([])
    setShowForm(true)
  }

  // Open form for editing admin
  const handleEdit = (admin: AdminUser) => {
    setEditingId(admin.id)
    setFormData({
      email: admin.email,
      password: '',
      confirm_password: '',
      full_name: admin.full_name,
      permissions: admin.permissions,
      active: admin.active
    })
    setSelectedPermissions(admin.permissions)
    setShowForm(true)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.email.trim()) {
      setError('Email is required')
      return
    }
    
    if (!formData.full_name.trim()) {
      setError('Full name is required')
      return
    }
    
    if (!editingId && !formData.password) {
      setError('Password is required for new admin')
      return
    }
    
    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const dataToSubmit = {
        ...formData,
        permissions: selectedPermissions
      }

      if (editingId) {
        // Update existing admin
        const { error } = await adminManagementService.updateAdmin(editingId, dataToSubmit)
        
        if (error) {
          throw new Error(`Failed to update admin: ${error.message}`)
        }
      } else {
        // Create new admin
        const { error } = await adminManagementService.createAdmin(dataToSubmit)
        
        if (error) {
          throw new Error(`Failed to create admin: ${error.message}`)
        }
      }

      // Reset form and reload data
      setShowForm(false)
      setEditingId(null)
      await loadAdmins()
      
      setError(editingId ? 'Admin updated successfully!' : 'Admin created successfully!')
      setTimeout(() => setError(null), 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
      console.error('Error submitting form:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete admin
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await adminManagementService.deleteAdmin(id)
      
      if (error) {
        throw new Error(`Failed to delete admin: ${error.message}`)
      }
      
      await loadAdmins()
      setError('Admin deleted successfully!')
      setTimeout(() => setError(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete admin')
      console.error('Error deleting admin:', err)
    }
  }

  // Handle toggle admin status
  const handleToggleStatus = async (id: string, currentActive: boolean) => {
    const action = currentActive ? 'deactivate' : 'activate'
    if (!confirm(`Are you sure you want to ${action} this admin?`)) {
      return
    }

    try {
      const { error } = await adminManagementService.toggleAdminStatus(id, !currentActive)
      
      if (error) {
        throw new Error(`Failed to ${action} admin: ${error.message}`)
      }
      
      await loadAdmins()
      setError(`Admin ${action}d successfully!`)
      setTimeout(() => setError(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} admin`)
      console.error(`Error ${action}ing admin:`, err)
    }
  }

  // Format date helper
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never'
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
            <p className="mt-3 text-gray-600">Loading admins...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
              <p className="text-gray-600 mt-1">Manage system administrators and permissions</p>
            </div>
            {!showForm && (
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Admin
              </button>
            )}
          </div>
        </div>

        {/* Error/Success Message */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg ${
            error.includes('successfully') 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {error.includes('successfully') ? (
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

        {/* Create/Edit Form */}
        {showForm && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    {editingId ? 'Edit Admin' : 'Create New Admin'}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Basic Info */}
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                        Full Name *
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="full_name"
                          name="full_name"
                          required
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="John Doe"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email Address *
                      </label>
                      <div className="mt-1">
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="admin@example.com"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        {editingId ? 'New Password (leave blank to keep current)' : 'Password *'}
                      </label>
                      <div className="mt-1">
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder={editingId ? 'Enter new password' : 'Minimum 6 characters'}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    {formData.password && (
                      <div>
                        <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                          Confirm Password *
                        </label>
                        <div className="mt-1">
                          <input
                            type="password"
                            id="confirm_password"
                            name="confirm_password"
                            value={formData.confirm_password}
                            onChange={handleInputChange}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Confirm password"
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      <input
                        id="active"
                        name="active"
                        type="checkbox"
                        checked={formData.active}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={submitting}
                      />
                      <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                        Active (admin can login)
                      </label>
                    </div>
                  </div>

                  {/* Right Column: Permissions */}
                  <div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Permissions</h3>
                          <p className="text-xs text-gray-500">
                            {selectedPermissions.length} of {AVAILABLE_PERMISSIONS.length} selected
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="text-xs text-blue-600 hover:text-blue-500"
                        >
                          {selectedPermissions.length === AVAILABLE_PERMISSIONS.length
                            ? 'Deselect All'
                            : 'Select All'
                          }
                        </button>
                      </div>

                      {/* Permission Search */}
                      <div className="mb-4">
                        <input
                          type="text"
                          placeholder="Search permissions..."
                          value={permissionFilter}
                          onChange={(e) => setPermissionFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Permissions List */}
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {permissionFilter ? (
                          // Filtered view
                          <div className="space-y-2">
                            {filteredPermissions.map((permission) => (
                              <div key={permission.id} className="flex items-start">
                                <input
                                  type="checkbox"
                                  id={`perm-${permission.id}`}
                                  checked={selectedPermissions.includes(permission.id)}
                                  onChange={() => handlePermissionToggle(permission.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                                />
                                <label htmlFor={`perm-${permission.id}`} className="ml-2 text-sm">
                                  <span className="font-medium text-gray-900">{permission.name}</span>
                                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-800">
                                    {permission.category}
                                  </span>
                                  <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                                </label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Category view
                          categories.map((category) => (
                            <div key={category} className="border border-gray-200 rounded-md">
                              <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-gray-900">{category}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAllInCategory(category)}
                                    className="text-xs text-blue-600 hover:text-blue-500"
                                  >
                                    {permissionsByCategory[category].every(p => 
                                      selectedPermissions.includes(p.id)
                                    ) ? 'Deselect All' : 'Select All'}
                                  </button>
                                </div>
                              </div>
                              <div className="p-3 space-y-2">
                                {permissionsByCategory[category].map((permission) => (
                                  <div key={permission.id} className="flex items-start">
                                    <input
                                      type="checkbox"
                                      id={`perm-${permission.id}`}
                                      checked={selectedPermissions.includes(permission.id)}
                                      onChange={() => handlePermissionToggle(permission.id)}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                                    />
                                    <label htmlFor={`perm-${permission.id}`} className="ml-2 text-sm">
                                      <span className="font-medium text-gray-900">{permission.name}</span>
                                      <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
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
                        {editingId ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingId ? 'Update Admin' : 'Create Admin'
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Total Admins</p>
                  <p className="text-2xl font-semibold text-gray-900">{admins.length}</p>
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
                  <p className="text-sm font-medium text-gray-900">Active Admins</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {admins.filter(a => a.active).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Permissions</p>
                  <p className="text-2xl font-semibold text-gray-900">{AVAILABLE_PERMISSIONS.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admins List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">System Administrators</h2>
          </div>
          
          {admins.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No administrators found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first admin user.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-lg font-medium text-blue-600">
                                {admin.full_name[0].toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{admin.full_name}</div>
                            <div className="text-sm text-gray-500">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${admin.active ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                          {admin.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {adminManagementService.formatPermissions(admin.permissions)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {admin.permissions.length} permission{admin.permissions.length !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(admin.last_login)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(admin.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(admin)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(admin.id, admin.active)}
                            className={admin.active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                          >
                            {admin.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(admin.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
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
    </div>
  )
}

export default AdminManagement