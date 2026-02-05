// components/profile/Profile.tsx
import React, { useRef } from 'react';
import { 
  Edit3, UserPlus, UserMinus, Check, 
  MoreVertical, Camera, Building, Briefcase, Calendar,
  ChevronLeft, Upload, X, Globe, Phone, Mail, MapPin,
  Link, Share2, Settings, LogOut, Trash2, AlertCircle, 
  Info, CheckCircle, XCircle, Clock, Heart, Bell,
  MessageCircle, Share, ExternalLink
} from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { formatTimeAgo } from '../../utils/formatters';
import EditModal from '../components/profile/EditModal';
import DeleteModal from '../components/profile/DeleteModal';
import VerifiedBadge from '../components/VerifiedBadge';

// Loading Skeleton Component (included in same file)
const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white safe-area">
    <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse border-b border-gray-300"></div>
    <div className="px-4 -mt-16">
      <div className="w-32 h-32 bg-gray-300 rounded-full mx-auto animate-pulse border-4 border-white border border-gray-400"></div>
    </div>
    <div className="pt-20 px-4 text-center space-y-4">
      <div className="h-8 bg-gray-300 rounded w-1/2 mx-auto animate-pulse border border-gray-400"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto animate-pulse border border-gray-300"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto animate-pulse border border-gray-300"></div>
    </div>
    <div className="px-4 mt-8">
      <div className="grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse border border-gray-300"></div>
        ))}
      </div>
    </div>
  </div>
);

// Reusable Confirmation Modal Component (included in same file)
const ConfirmationModal: React.FC<{
  title: string;
  message: string;
  confirmText: string;
  confirmColor: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ title, message, confirmText, confirmColor, icon, isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 safe-area">
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-sm px-4">
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 animate-scaleIn mx-auto">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center border border-gray-200">
              {icon}
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 text-center mb-3">{title}</h3>
          <p className="text-gray-600 text-center mb-6 text-sm leading-relaxed">
            {message}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className={`py-3 bg-gradient-to-r ${confirmColor} text-white rounded-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all min-h-[44px]`}
            >
              {confirmText}
            </button>
            <button
              onClick={onClose}
              className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 active:scale-[0.98] transition-all min-h-[44px] border border-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile-Optimized Post Grid Component (included in same file)
const PostGridMobile = ({ posts, isOwner, onDelete, isVerifiedUser, onToggleLike, onShare }: any) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200">
          <div className="text-2xl">📝</div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Posts</h3>
        <p className="text-gray-600 text-sm">No posts to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post: any, index: number) => (
        <div key={post.id} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-blue-300 transition-colors">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden flex items-center justify-center border border-blue-200">
                  {post.author_avatar_url ? (
                    <div className="relative w-full h-full">
                      <img src={post.author_avatar_url} alt={post.author_name} className="w-full h-full object-cover" />
                      {isVerifiedUser && (
                        <div className="absolute -bottom-1 -right-1 z-10">
                          <VerifiedBadge size={8} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm font-bold">
                      {post.author_name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="font-bold text-gray-900">{post.author_name}</h4>
                    {isVerifiedUser && <VerifiedBadge size={8} />}
                  </div>
                  <p className="text-xs text-gray-500">{formatTimeAgo(post.created_at)}</p>
                </div>
              </div>
              {isOwner && (
                <button 
                  onClick={() => onDelete(post)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors min-h-[32px] min-w-[32px] border border-gray-200"
                  aria-label="Delete post"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {post.content && (
              <div className="mb-3">
                <p className="text-gray-800 whitespace-pre-line leading-relaxed">{post.content}</p>
              </div>
            )}

            {post.media_urls && post.media_urls.length > 0 && (
              <div className="mb-4 rounded-lg overflow-hidden border border-gray-300">
                <div className="relative">
                  <img
                    src={post.media_urls[0]}
                    alt="Post media"
                    className="w-full h-auto max-h-[400px] object-contain"
                    style={{ maxWidth: '100%', height: 'auto' }}
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => onToggleLike(post.id, index)}
                  className={`flex items-center gap-1 transition-colors ${
                    post.has_liked 
                      ? 'text-red-500 hover:text-red-600' 
                      : 'text-gray-500 hover:text-red-500'
                  }`}
                >
                  <Heart 
                    size={18} 
                    className={post.has_liked ? 'fill-current' : ''}
                  />
                  <span className="text-sm font-medium">{post.likes_count || 0}</span>
                </button>
                
                <button className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                  <MessageCircle size={18} />
                  <span className="text-sm font-medium">{post.comments_count || 0}</span>
                </button>
              </div>
              
              <button 
                onClick={() => onShare(post.id, index)}
                className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors"
              >
                <Share size={18} />
                <span className="text-sm font-medium">{post.shares_count || 0}</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Mobile-Optimized Listing Grid Component (included in same file)
const ListingGridMobile = ({ listings, isOwner, onEdit, onDelete }: any) => {
  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200">
          <div className="text-2xl">🛒</div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Listings</h3>
        <p className="text-gray-600 text-sm">No marketplace listings to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {listings.map((listing: any) => (
        <div key={listing.id} className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-300 transition-colors">
          <div className="flex gap-3">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg overflow-hidden flex-shrink-0 border border-gray-300">
              {listing.images?.[0] && (
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-sm truncate">{listing.title}</h3>
              <p className="text-blue-600 font-bold text-base mt-1">₦{listing.price?.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} className="text-gray-500" />
                <p className="text-xs text-gray-600 truncate">{listing.location}</p>
              </div>
              {listing.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{listing.description}</p>
              )}
              {isOwner && (
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => onEdit(listing)}
                    className="flex-1 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 rounded-lg font-medium hover:from-blue-100 hover:to-blue-200 transition-all border border-blue-200 text-xs"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => onDelete(listing)}
                    className="flex-1 py-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-600 rounded-lg font-medium hover:from-red-100 hover:to-red-200 transition-all border border-red-200 text-xs"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Mobile-Optimized Business Grid Component (included in same file)
const BusinessGridMobile = ({ businesses, isOwner, onEdit, onDelete }: any) => {
  if (businesses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200">
          <Building size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Businesses</h3>
        <p className="text-gray-600 text-sm">No businesses to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {businesses.map((business: any) => (
        <div key={business.id} className="bg-white rounded-xl border-2 border-gray-200 p-3 hover:border-blue-300 transition-colors">
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg overflow-hidden flex-shrink-0 border border-gray-300">
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-sm truncate">{business.name}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                  {business.business_type}
                </span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                  {business.category}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 truncate">{business.location_axis}</p>
              {isOwner && (
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => onEdit(business)}
                    className="flex-1 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 rounded-lg font-medium hover:from-blue-100 hover:to-blue-200 transition-all border border-blue-200 text-xs"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => onDelete(business)}
                    className="flex-1 py-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-600 rounded-lg font-medium hover:from-red-100 hover:to-red-200 transition-all border border-red-200 text-xs"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Mobile-Optimized Job Grid Component (included in same file)
const JobGridMobile = ({ jobs, isOwner, onEdit, onDelete }: any) => {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200">
          <Briefcase size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Jobs</h3>
        <p className="text-gray-600 text-sm">No job listings to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job: any) => (
        <div key={job.id} className="bg-white rounded-xl border-2 border-gray-200 p-3 hover:border-blue-300 transition-colors">
          <h3 className="font-bold text-gray-900 text-sm">{job.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            {job.salary && (
              <span className="text-blue-600 font-bold text-base">{job.salary}</span>
            )}
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
              {job.job_type}
            </span>
          </div>
          {job.location && (
            <div className="flex items-center gap-1 mt-2">
              <MapPin size={12} className="text-gray-500" />
              <p className="text-xs text-gray-600">{job.location}</p>
            </div>
          )}
          {job.description && (
            <p className="text-xs text-gray-600 mt-2">{job.description}</p>
          )}
          {isOwner && (
            <div className="flex gap-2 mt-3">
              <button 
                onClick={() => onEdit(job)}
                className="flex-1 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 rounded-lg font-medium hover:from-blue-100 hover:to-blue-200 transition-all border border-blue-200 text-xs"
              >
                Edit
              </button>
              <button 
                onClick={() => onDelete(job)}
                className="flex-1 py-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-600 rounded-lg font-medium hover:from-red-100 hover:to-red-200 transition-all border border-red-200 text-xs"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Mobile-Optimized Event Grid Component (included in same file)
const EventGridMobile = ({ events, isOwner, onEdit, onDelete }: any) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200">
          <Calendar size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Events</h3>
        <p className="text-gray-600 text-sm">No events to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event: any) => (
        <div key={event.id} className="bg-white rounded-xl border-2 border-gray-200 p-3 hover:border-blue-300 transition-colors">
          <h3 className="font-bold text-gray-900 text-sm">{event.title}</h3>
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Calendar size={12} />
              {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {event.location && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <MapPin size={12} />
                {event.location.split(',')[0]}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-gray-600 mt-2">{event.description}</p>
          )}
          {event.rsvp_count > 0 && (
            <div className="mt-2">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
                {event.rsvp_count} RSVPs
              </span>
            </div>
          )}
          {isOwner && (
            <div className="flex gap-2 mt-3">
              <button 
                onClick={() => onEdit(event)}
                className="flex-1 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 rounded-lg font-medium hover:from-blue-100 hover:to-blue-200 transition-all border border-blue-200 text-xs"
              >
                Edit
              </button>
              <button 
                onClick={() => onDelete(event)}
                className="flex-1 py-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-600 rounded-lg font-medium hover:from-red-100 hover:to-red-200 transition-all border border-red-200 text-xs"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Main Profile Component
const Profile: React.FC = () => {
  const {
    // State
    activeTab,
    setActiveTab,
    profileData,
    pendingConnection,
    posts,
    listings,
    businesses,
    jobs,
    events,
    loading,
    showEditModal,
    setShowEditModal,
    showDeleteModal,
    setShowDeleteModal,
    showConnectionModal,
    setShowConnectionModal,
    showConnectModal,
    setShowConnectModal,
    showWithdrawModal,
    setShowWithdrawModal,
    showAcceptModal,
    setShowAcceptModal,
    showRejectModal,
    setShowRejectModal,
    modalAction,
    selectedItem,
    actionType,
    uploadingAvatar,
    uploadingHeader,
    showOptionsMenu,
    setShowOptionsMenu,
    showShareMenu,
    setShowShareMenu,
    notification,
    
    // Derived State
    isOwner,
    isConnected,
    isVerifiedUser,
    
    // Functions
    navigate,
    showNotification,
    handleConnect,
    handleWithdraw,
    handleAccept,
    handleReject,
    handleDisconnect,
    confirmAction,
    isCurrentUserSender,
    isCurrentUserReceiver,
    handleEditProfile,
    handleEditItem,
    handleDeleteItem,
    confirmDelete,
    handleSaveEdit,
    handleAvatarUpload,
    handleHeaderUpload,
    removeAvatar,
    removeHeader,
    shareProfile,
    toggleLike,
    sharePost,
    handleCloseEditModal,
  handleCloseDeleteModal,
  } = useProfile();

  // Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const triggerAvatarUpload = () => {
    avatarInputRef.current?.click();
  };

  const triggerHeaderUpload = () => {
    headerInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleAvatarUpload(file);
    }
  };

  const handleHeaderFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleHeaderUpload(file);
    }
  };

  const renderConnectionStatus = () => {
    if (isOwner) return null;

    if (isConnected) {
      return (
        <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full flex items-center gap-2 mx-auto max-w-xs">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm font-medium text-green-700">Connected</span>
        </div>
      );
    }

    if (pendingConnection) {
      if (isCurrentUserSender()) {
        return (
          <div className="px-4 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-full flex items-center gap-2 mx-auto max-w-xs">
            <Clock size={16} className="text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Request Sent</span>
          </div>
        );
      } else if (isCurrentUserReceiver()) {
        return (
          <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-full flex items-center gap-2 mx-auto max-w-xs">
            <Bell size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Request Received</span>
          </div>
        );
      }
    }

    return null;
  };

  const renderPrimaryActionButton = () => {
    if (isOwner) {
      return (
        <button 
          onClick={handleEditProfile}
          className="w-full max-w-xs mx-auto py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all min-h-[52px] border border-blue-800"
        >
          <Edit3 size={20} />
          Edit Profile
        </button>
      );
    }

    if (isConnected) {
      return (
        <button
          onClick={handleDisconnect}
          className="w-full max-w-xs mx-auto py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:from-red-600 hover:to-rose-700 active:scale-[0.98] transition-all min-h-[52px] border border-red-800"
        >
          <UserMinus size={20} />
          Disconnect
        </button>
      );
    }

    if (pendingConnection) {
      if (isCurrentUserSender()) {
        return (
          <button
            onClick={handleWithdraw}
            className="w-full max-w-xs mx-auto py-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:from-yellow-600 hover:to-amber-600 active:scale-[0.98] transition-all min-h-[52px] border border-yellow-700"
          >
            <Clock size={20} />
            Withdraw Request
          </button>
        );
      } else if (isCurrentUserReceiver()) {
        return (
          <div className="w-full max-w-xs mx-auto flex gap-3">
            <button
              onClick={handleAccept}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:from-green-600 hover:to-emerald-600 active:scale-[0.98] transition-all min-h-[52px] border border-green-700"
            >
              <Check size={20} />
              Accept
            </button>
            <button
              onClick={handleReject}
              className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:from-red-600 hover:to-rose-600 active:scale-[0.98] transition-all min-h-[52px] border border-red-700"
            >
              <X size={20} />
              Reject
            </button>
          </div>
        );
      }
    }

    return (
      <button
        onClick={handleConnect}
        className="w-full max-w-xs mx-auto py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:from-green-600 hover:to-emerald-700 active:scale-[0.98] transition-all min-h-[52px] border border-green-800"
      >
        <UserPlus size={20} />
        Connect
      </button>
    );
  };

  const renderRestrictedAccess = (featureName: string) => {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-yellow-200">
          <AlertCircle size={24} className="text-yellow-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Verified Members Only</h3>
        <p className="text-gray-600 text-sm mb-4">
          {featureName} is only available to verified users.
        </p>
        <p className="text-gray-500 text-xs mb-6">
          Contact support to upgrade your account and access all features.
        </p>
        <button
          onClick={() => window.open('mailto:support@example.com', '_blank')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all border border-blue-800"
        >
          <Mail size={16} />
          Contact Support
        </button>
      </div>
    );
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center safe-area">
        <div className="text-center p-8 max-w-xs">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">The profile you're looking for doesn't exist.</p>
          <button 
            onClick={() => navigate(-1)}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all min-h-[52px] border border-blue-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { profile, stats } = profileData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white safe-area">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl border backdrop-blur-sm flex items-center gap-3 animate-slideDown ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {notification.type === 'success' && <CheckCircle size={20} />}
          {notification.type === 'error' && <XCircle size={20} />}
          {notification.type === 'info' && <Info size={20} />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={headerInputRef}
        onChange={handleHeaderFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] border border-gray-200"
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Profile</h1>
          <div className="relative" ref={optionsMenuRef}>
            <button 
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] border border-gray-200"
              aria-label="More options"
            >
              <MoreVertical size={24} />
            </button>
            
            {showOptionsMenu && (
              <div className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl border border-gray-200 w-48 py-2 z-40">
                {isOwner ? (
                  <>
                    <button 
                      onClick={() => { setShowOptionsMenu(false); handleEditProfile(); }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <Edit3 size={18} className="text-gray-600" />
                      <span className="font-medium">Edit Profile</span>
                    </button>
                    <button 
                      onClick={() => { setShowOptionsMenu(false); setShowShareMenu(true); }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <Share2 size={18} className="text-gray-600" />
                      <span className="font-medium">Share Profile</span>
                    </button>
                    <div className="border-t border-gray-200 my-2"></div>
                    <button 
                      onClick={() => { setShowOptionsMenu(false); }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} />
                      <span className="font-medium">Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => { setShowOptionsMenu(false); setShowShareMenu(true); }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <Share2 size={18} className="text-gray-600" />
                      <span className="font-medium">Share Profile</span>
                    </button>
                    <button 
                      onClick={() => { 
                        setShowOptionsMenu(false); 
                        navigate(`/report?type=user&id=${profile.id}`); 
                      }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200 mt-2 pt-3"
                    >
                      <AlertCircle size={18} />
                      <span className="font-medium">Report User</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative">
        {/* Cover Photo */}
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-500 relative border-b border-blue-600">
          {profile.header_image_url && (
            <img
              src={profile.header_image_url}
              alt="Cover"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          
          {isOwner && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              {profile.header_image_url && (
                <button 
                  onClick={removeHeader}
                  disabled={uploadingHeader}
                  className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white disabled:opacity-50 transition-colors min-h-[44px] min-w-[44px] border border-gray-300"
                  aria-label="Remove cover photo"
                >
                  {uploadingHeader ? (
                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <X size={20} />
                  )}
                </button>
              )}
              <button 
                onClick={triggerHeaderUpload}
                disabled={uploadingHeader}
                className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white disabled:opacity-50 transition-colors min-h-[44px] min-w-[44px] border border-gray-300"
                aria-label="Change cover photo"
              >
                {uploadingHeader ? (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Camera size={20} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Profile Picture with Verification Badge */}
        <div className="absolute -bottom-16 left-4 sm:left-1/2 sm:transform sm:-translate-x-1/2">
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full border-4 border-white shadow-xl overflow-hidden border border-blue-300 relative">
              {profile.avatar_url ? (
                <div className="relative w-full h-full">
                  <img
                    src={profile.avatar_url}
                    alt={profile.first_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-4xl font-bold">
                  {profile.first_name?.charAt(0)}
                </div>
              )}
              {/* Verification Badge on Avatar - Bottom Right */}
              {isVerifiedUser && (
                <div className="absolute -bottom-1 -right-1 z-10">
                  <VerifiedBadge size={15} />
                </div>
              )}
            </div>
            
            {isOwner && (
              <div className="absolute -bottom-2 -right-2 flex gap-2">
                {profile.avatar_url && (
                  <button 
                    onClick={removeAvatar}
                    disabled={uploadingAvatar}
                    className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white disabled:opacity-50 transition-colors border border-gray-300 min-h-[44px] min-w-[44px]"
                    aria-label="Remove profile picture"
                  >
                    {uploadingAvatar ? (
                      <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <X size={18} />
                    )}
                  </button>
                )}
                <button 
                  onClick={triggerAvatarUpload}
                  disabled={uploadingAvatar}
                  className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full flex items-center justify-center shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-colors min-h-[44px] min-w-[44px] border border-blue-800"
                  aria-label="Change profile picture"
                >
                  {uploadingAvatar ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Upload size={18} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-20 px-4 text-center">
        <div className="mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.first_name} {profile.last_name}
            </h1>
            {isVerifiedUser && (
              <VerifiedBadge size={15}  />
            )}
          </div>
          {profile.business_name && (
            <p className="text-gray-600 mt-1 font-medium">{profile.business_name}</p>
          )}
          {!isVerifiedUser && (
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full mt-2">
              <span className="text-xs font-medium text-yellow-700">Member Account</span>
            </div>
          )}
        </div>

        {/* Connection Status */}
        {renderConnectionStatus()}

        {/* Bio */}
        {profile.bio && (
          <div className="mt-6 bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-blue-100 max-w-2xl mx-auto">
            <p className="text-gray-600 leading-relaxed text-sm">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Contact Info */}
        {(profile.email || profile.phone || profile.location || profile.website) && (
          <div className="mt-6 flex flex-wrap justify-center gap-3 px-2">
            {profile.email && (
              <a 
                href={`mailto:${profile.email}`}
                className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300"
              >
                <Mail size={16} />
                <span className="text-sm">Email</span>
              </a>
            )}
            {profile.phone && (
              <a 
                href={`tel:${profile.phone}`}
                className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300"
              >
                <Phone size={16} />
                <span className="text-sm">Call</span>
              </a>
            )}
            {profile.location && (
              <div className="flex items-center gap-2 text-gray-500 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <MapPin size={16} />
                <span className="text-sm">{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <a 
                href={profile.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300"
              >
                <Globe size={16} />
                <span className="text-sm">Website</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}

        {/* Member Since */}
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full border border-gray-300">
          <Calendar size={14} className="text-gray-500" />
          <span className="text-sm text-gray-700 font-medium">
            Member since {formatTimeAgo(profile.created_at)}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 mt-8">
        {/* Primary Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'posts', icon: '📝', label: 'Posts', count: stats.posts_count, color: 'from-blue-50 to-blue-100', border: 'border-blue-200' },
            { key: 'connections', icon: '👥', label: 'Connects', count: stats.connections_count, color: 'from-green-50 to-green-100', border: 'border-green-200' },
            { key: 'items', icon: '🛒', label: 'Items', count: stats.listings_count, color: 'from-purple-50 to-purple-100', border: 'border-purple-200' },
          ].map((stat) => (
            <button
              key={stat.key}
              onClick={() => setActiveTab(stat.key === 'connections' ? 'posts' : stat.key)}
              className={`flex flex-col items-center p-4 rounded-2xl transition-all active:scale-[0.98] border-2 ${
                activeTab === stat.key
                  ? `bg-gradient-to-br ${stat.color} ${stat.border} shadow-lg transform -translate-y-1` 
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
              aria-label={`View ${stat.label}`}
            >
              <span className="text-2xl mb-2">{stat.icon}</span>
              <span className="text-xl font-bold text-gray-900">{stat.count}</span>
              <span className="text-xs text-gray-600 mt-1 font-medium">{stat.label}</span>
            </button>
          ))}
        </div>
        
        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            { key: 'businesses', icon: '🏢', label: 'Businesses', count: stats.businesses_count, color: 'from-orange-50 to-orange-100', border: 'border-orange-200' },
            { key: 'jobs', icon: '💼', label: 'Jobs', count: stats.jobs_count, color: 'from-teal-50 to-teal-100', border: 'border-teal-200' },
            { key: 'events', icon: '📅', label: 'Events', count: stats.events_count, color: 'from-pink-50 to-pink-100', border: 'border-pink-200' },
          ].map((stat) => (
            <button
              key={stat.key}
              onClick={() => setActiveTab(stat.key)}
              className={`flex flex-col items-center p-3 rounded-xl transition-all active:scale-[0.98] border-2 ${
                activeTab === stat.key
                  ? `bg-gradient-to-br ${stat.color} ${stat.border} shadow-lg transform -translate-y-1` 
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
              aria-label={`View ${stat.label}`}
            >
              <span className="text-xl mb-1">{stat.icon}</span>
              <span className="text-lg font-bold text-gray-900">{stat.count}</span>
              <span className="text-xs text-gray-600 mt-0.5 font-medium">{stat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="px-4 mt-8 mb-6">
        {renderPrimaryActionButton()}
      </div>

      {/* Content Tabs */}
      <div className="mt-6 border-t border-gray-200">
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50">
          {['posts', 'items', 'businesses', 'jobs', 'events'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[80px] py-4 text-sm font-medium capitalize transition-all relative ${
                activeTab === tab
                  ? 'text-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'items' ? 'Items' : tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'posts' && (
            <PostGridMobile 
              posts={posts} 
              isOwner={isOwner} 
              onDelete={(post) => handleDeleteItem(post, 'post')}
              isVerifiedUser={isVerifiedUser}
              onToggleLike={toggleLike}
              onShare={sharePost}
            />
          )}
          {activeTab === 'items' && (
            isVerifiedUser ? (
              <ListingGridMobile 
                listings={listings} 
                isOwner={isOwner} 
                onEdit={(listing) => handleEditItem(listing, 'listing')}
                onDelete={(listing) => handleDeleteItem(listing, 'listing')}
              />
            ) : (
              renderRestrictedAccess('Marketplace Listings')
            )
          )}
          {activeTab === 'businesses' && (
            isVerifiedUser ? (
              <BusinessGridMobile 
                businesses={businesses} 
                isOwner={isOwner} 
                onEdit={(business) => handleEditItem(business, 'business')}
                onDelete={(business) => handleDeleteItem(business, 'business')}
              />
            ) : (
              renderRestrictedAccess('Business Listings')
            )
          )}
          {activeTab === 'jobs' && (
            isVerifiedUser ? (
              <JobGridMobile 
                jobs={jobs} 
                isOwner={isOwner} 
                onEdit={(job) => handleEditItem(job, 'job')}
                onDelete={(job) => handleDeleteItem(job, 'job')}
              />
            ) : (
              renderRestrictedAccess('Job Listings')
            )
          )}
          {activeTab === 'events' && (
            isVerifiedUser ? (
              <EventGridMobile 
                events={events} 
                isOwner={isOwner} 
                onEdit={(event) => handleEditItem(event, 'event')}
                onDelete={(event) => handleDeleteItem(event, 'event')}
              />
            ) : (
              renderRestrictedAccess('Event Listings')
            )
          )}
        </div>
      </div>

      {/* Share Menu */}
      {showShareMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setShowShareMenu(false)}
          />
          <div 
            ref={shareMenuRef}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 animate-slideUp border-t border-gray-200"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Share Profile</h3>
                <button
                  onClick={() => setShowShareMenu(false)}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] border border-gray-200"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <button
                onClick={shareProfile}
                className="w-full py-4 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-3 border-2 border-blue-200 hover:from-blue-100 hover:to-blue-200 active:scale-[0.98] transition-all min-h-[52px]"
              >
                <Link size={20} />
                Copy Profile Link
              </button>
            </div>
          </div>
        </>
      )}

      {/* Connection Confirmation Modal */}
      {showConnectionModal && (
        <ConfirmationModal
          title="Remove Connection?"
          message={`Are you sure you want to remove ${profile.first_name} from your connections? This action cannot be undone.`}
          confirmText="Remove"
          confirmColor="from-red-500 to-rose-500 border-red-700"
          icon={<AlertCircle size={32} className="text-red-600" />}
          isOpen={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          onConfirm={confirmAction}
        />
      )}

      {/* Connect Confirmation Modal */}
      {showConnectModal && (
        <ConfirmationModal
          title="Send Connection Request?"
          message={`Send a connection request to ${profile.first_name}? They'll need to accept your request before you can message them.`}
          confirmText="Send Request"
          confirmColor="from-green-500 to-emerald-500 border-green-700"
          icon={<UserPlus size={32} className="text-green-600" />}
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          onConfirm={confirmAction}
        />
      )}

      {/* Withdraw Confirmation Modal */}
      {showWithdrawModal && (
        <ConfirmationModal
          title="Withdraw Request?"
          message={`Are you sure you want to withdraw your connection request to ${profile.first_name}?`}
          confirmText="Withdraw"
          confirmColor="from-yellow-500 to-amber-500 border-yellow-700"
          icon={<Clock size={32} className="text-yellow-600" />}
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          onConfirm={confirmAction}
        />
      )}

      {/* Accept Confirmation Modal */}
      {showAcceptModal && (
        <ConfirmationModal
          title="Accept Connection?"
          message={`Accept connection request from ${profile.first_name}? You'll be able to message each other after accepting.`}
          confirmText="Accept"
          confirmColor="from-green-500 to-emerald-500 border-green-700"
          icon={<Check size={32} className="text-green-600" />}
          isOpen={showAcceptModal}
          onClose={() => setShowAcceptModal(false)}
          onConfirm={confirmAction}
        />
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <ConfirmationModal
          title="Reject Connection?"
          message={`Reject connection request from ${profile.first_name}? They won't be notified that you rejected their request.`}
          confirmText="Reject"
          confirmColor="from-red-500 to-rose-500 border-red-700"
          icon={<X size={32} className="text-red-600" />}
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={confirmAction}
        />
      )}

      {/* Modals */}
      <EditModal
  type={selectedItem?.itemType || 'profile'}
  data={selectedItem}
  isOpen={showEditModal}
  onClose={handleCloseEditModal} // Use this instead
  onSave={handleSaveEdit}
/>

      <DeleteModal
  type={selectedItem?.itemType}
  name={selectedItem?.title || selectedItem?.name || selectedItem?.first_name}
  isOpen={showDeleteModal}
  onClose={handleCloseDeleteModal} // Use this instead
  onConfirm={confirmDelete}
/>
    </div>
  );
};

export default Profile;