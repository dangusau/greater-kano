import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminSupportService, SupportTicket, TicketReply } from '../../services/adminSupport'

type TicketWithReplies = SupportTicket & {
  replies: TicketReply[]
}

const SupportTicketDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<TicketWithReplies | null>(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadTicket(id)
    }
  }, [id])

  const loadTicket = async (ticketId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await adminSupportService.getSupportTicketById(ticketId)
      
      if (error) {
        throw new Error(`Failed to load ticket: ${error.message}`)
      }
      
      if (!data) {
        throw new Error('Ticket not found')
      }
      
      setTicket(data as TicketWithReplies)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      console.error('Error loading ticket:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendReply = async () => {
    if (!reply.trim() || !ticket) {
      setError('Please enter a reply message')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    
    try {
      const { error } = await adminSupportService.replyToTicket(ticket.id, reply)
      
      if (error) {
        throw new Error(`Failed to send reply: ${error.message}`)
      }
      
      setSuccess('Reply sent successfully!')
      setReply('')
      
      // Reload ticket to show the new reply
      setTimeout(() => {
        loadTicket(ticket.id)
        setSuccess(null)
      }, 1000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply')
      console.error('Error sending reply:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (status: SupportTicket['status']) => {
    if (!ticket) return

    setSubmitting(true)
    setError(null)
    
    try {
      const { error } = await adminSupportService.updateTicketStatus(ticket.id, status)
      
      if (error) {
        throw new Error(`Failed to update status: ${error.message}`)
      }
      
      setSuccess(`Ticket marked as ${status.replace('_', ' ')}`)
      
      // Reload ticket
      setTimeout(() => {
        loadTicket(ticket.id)
        setSuccess(null)
      }, 1000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
      console.error('Error updating status:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300'
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-3 text-gray-600">Loading ticket details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ticket not found</h3>
            <p className="mt-1 text-sm text-gray-500">The requested ticket could not be found.</p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/admin/support')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/support')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Tickets
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300">
                  {ticket.priority} priority
                </span>
                <span className="text-sm text-gray-500">
                  Created {formatDateTime(ticket.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Original Ticket */}
        <div className="mb-6">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">Original Message</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Submitted {formatDateTime(ticket.created_at)}
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Replies */}
        {ticket.replies.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation</h3>
            <div className="space-y-4">
              {ticket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`bg-white shadow sm:rounded-lg ${reply.is_admin ? 'border-l-4 border-blue-500' : 'border-l-4 border-gray-300'}`}
                >
                  <div className="px-4 py-5 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          reply.is_admin 
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}>
                          {reply.is_admin ? 'Admin' : 'Customer'}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          {formatDateTime(reply.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reply Form */}
        <div className="mb-6">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">Reply to Ticket</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="reply" className="block text-sm font-medium text-gray-700">
                    Your Reply
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="reply"
                      name="reply"
                      rows={4}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Type your reply here..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as SupportTicket['status'])}
                      disabled={submitting}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('in_progress')}
                      disabled={ticket.status === 'in_progress' || submitting}
                      className="inline-flex items-center px-3 py-2 border border-yellow-300 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                    >
                      Mark In Progress
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('resolved')}
                      disabled={ticket.status === 'resolved' || submitting}
                      className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      Mark Resolved
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={!reply.trim() || submitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      'Send Reply'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Info */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">Ticket Information</h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Ticket ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono">{ticket.id}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDateTime(ticket.created_at)}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDateTime(ticket.updated_at)}</dd>
              </div>
              {ticket.resolved_at && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Resolved</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDateTime(ticket.resolved_at)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupportTicketDetails