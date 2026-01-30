import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Clock, CheckCircle, AlertCircle, HelpCircle, MessageSquare, X, ChevronLeft, User, Mail, Calendar, Tag } from 'lucide-react';
import { supportService } from '../services/supabase/supportService';

// Ticket Detail View Component
const TicketDetailView: React.FC<{ ticket: any; onClose: () => void }> = ({ ticket, onClose }) => {
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (ticket) {
      loadTicketReplies();
    }
  }, [ticket]);

  const loadTicketReplies = async () => {
    try {
      setLoading(true);
      const ticketReplies = await supportService.getTicketReplies(ticket.id);
      setReplies(ticketReplies);
    } catch (error) {
      console.error('Error loading replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSubmittingReply(true);
      await supportService.addTicketReply(ticket.id, replyText);
      setReplyText('');
      await loadTicketReplies();
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Failed to submit reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{ticket.subject}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500">• Ticket #{ticket.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Ticket Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Category</div>
                  <div className="font-medium capitalize">{ticket.category}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Created</div>
                  <div className="font-medium">{formatDate(ticket.created_at)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Priority</div>
                  <div className="font-medium capitalize">{ticket.priority}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Original Message */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <div>
                <div className="font-medium">You</div>
                <div className="text-sm text-gray-500">{formatDate(ticket.created_at)}</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 ml-10">
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
            </div>
          </div>

          {/* Replies */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading replies...</p>
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <MessageSquare size={32} className="text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No replies yet</p>
                <p className="text-gray-400 text-sm mt-1">Support team will reply here</p>
              </div>
            ) : (
              replies.map((reply, index) => (
                <div key={reply.id} className={`${reply.is_admin ? 'border-l-4 border-blue-500 pl-4' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 ${reply.is_admin ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex items-center justify-center`}>
                      {reply.is_admin ? (
                        <Mail size={16} className="text-blue-600" />
                      ) : (
                        <User size={16} className="text-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {reply.is_admin ? 'Support Team' : 'You'}
                        {reply.is_admin && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{formatDate(reply.created_at)}</div>
                    </div>
                  </div>
                  <div className={`rounded-xl p-4 ml-10 ${reply.is_admin ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Reply Form (for user replies) */}
          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <form onSubmit={handleSubmitReply}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a reply
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                />
                <div className="flex justify-end gap-3 mt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReply || !replyText.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {submittingReply ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      'Send Reply'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const HelpSupport: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal'
  });

  useEffect(() => {
    loadUserTickets();
  }, []);

  const loadUserTickets = async () => {
    try {
      setLoading(true);
      const userTickets = await supportService.getUserSupportTickets();
      setTickets(userTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      alert('Please fill in both subject and message fields.');
      return;
    }

    try {
      setSubmitting(true);
      await supportService.submitSupportTicket(formData);
      
      // Reset form
      setFormData({
        subject: '',
        message: '',
        category: 'general',
        priority: 'normal'
      });
      
      // Show success message
      setShowSuccess(true);
      
      // Reload tickets
      await loadUserTickets();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Failed to submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'in_progress':
        return <Clock className="text-blue-500" size={16} />;
      case 'closed':
        return <CheckCircle className="text-gray-500" size={16} />;
      default:
        return <AlertCircle className="text-yellow-500" size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          <div className="mx-4 bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600" size={24} />
              <div className="flex-1">
                <h3 className="font-bold text-green-800">Ticket Submitted Successfully!</h3>
                <p className="text-green-700 text-sm">We'll get back to you soon.</p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="p-1 hover:bg-green-100 rounded-full transition-colors"
              >
                <X size={20} className="text-green-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail View */}
      {selectedTicket && (
        <TicketDetailView 
          ticket={selectedTicket} 
          onClose={() => setSelectedTicket(null)} 
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl mb-4">
            <HelpCircle className="text-blue-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Help & Support</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're here to help! Submit a ticket and our support team will get back to you as soon as possible.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Support Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={20} className="text-blue-600" />
                  Submit a Request
                </h2>
                <p className="text-gray-600 text-sm mt-1">Fill out the form below and we'll respond within 24 hours.</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Briefly describe your issue"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                    maxLength={200}
                  />
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {formData.subject.length}/200
                  </div>
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Issue</option>
                      <option value="account">Account Problem</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="payment">Payment Issue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Please provide detailed information about your issue..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    required
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    Please include any relevant details that will help us resolve your issue faster.
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Ticket History */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Your Tickets</h2>
                <p className="text-gray-600 text-sm mt-1">Previous support requests</p>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="text-gray-400" size={24} />
                    </div>
                    <p className="text-gray-500">No support tickets yet</p>
                    <p className="text-gray-400 text-sm mt-1">Your submitted tickets will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {tickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900 line-clamp-1">
                            {ticket.subject}
                          </h3>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(ticket.status)}
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                          {ticket.message}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(ticket.created_at)}</span>
                          <span className="capitalize">{ticket.category}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Help Tips */}
            <div className="mt-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <HelpCircle size={18} />
                Quick Tips
              </h3>
              <ul className="space-y-2">
                <li className="text-blue-800 text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                  Be specific about your issue
                </li>
                <li className="text-blue-800 text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                  Include error messages if any
                </li>
                <li className="text-blue-800 text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                  Check FAQ before submitting
                </li>
                <li className="text-blue-800 text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                  Response time: 24-48 hours
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;