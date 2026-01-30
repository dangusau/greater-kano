import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { useMarketplace } from '../hooks/useMarketplace';
import { formatTimeAgo } from '../utils/formatters';

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const { conversations, loading, getConversations } = useMarketplace();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getConversations();
  }, [getConversations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 bg-white border-b p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2">
              <ArrowLeft size={24} />
            </button>
            <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-4 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Conversations */}
      {conversations.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No messages yet</h3>
          <p className="text-gray-600">Your conversations with sellers will appear here.</p>
        </div>
      ) : (
        <div className="divide-y">
          {conversations.map((conversation) => (
            <button
              key={`${conversation.listing_id}-${conversation.other_user_id}`}
              onClick={() => navigate(`/messages/${conversation.listing_id}/${conversation.other_user_id}`)}
              className="w-full p-4 flex gap-3 hover:bg-gray-50 text-left"
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {conversation.other_user_name?.charAt(0) || 'U'}
                </div>
                {conversation.unread_count > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {conversation.unread_count}
                  </div>
                )}
              </div>

              {/* Conversation Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold truncate">{conversation.other_user_name}</h4>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTimeAgo(conversation.last_message_at)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 truncate mb-1">
                  {conversation.listing_title}
                </p>
                
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-700 truncate flex-1">
                    {conversation.last_message}
                  </p>
                  {conversation.unread_count > 0 ? (
                    <Check className="text-blue-500" size={16} />
                  ) : (
                    <CheckCheck className="text-gray-400" size={16} />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;