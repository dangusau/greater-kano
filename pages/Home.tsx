import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreVertical, Image as ImageIcon, Video, MapPin, Send, X, Play, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useHome } from '../hooks/useHome';
import { homeService } from '../services/supabase/homeService';
import VerifiedBadge from '../components/VerifiedBadge';

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  author_first_name?: string;
  author_last_name?: string;
  author_verified: boolean;
  content: string;
  media_urls: string[];
  media_type: 'text' | 'image' | 'video' | 'gallery';
  location: string | null;
  tags: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  updated_at: string;
  has_liked: boolean;
  has_shared: boolean;
}

interface Comment {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  author_verified: boolean;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  has_liked: boolean;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    newPostContent,
    setNewPostContent,
    selectedFiles,
    setSelectedFiles,
    isPosting,
    showPostModal,
    setShowPostModal,
    selectedPostForComments,
    setSelectedPostForComments,
    comments,
    newComment,
    setNewComment,
    commentLoading,
    playingVideo,
    videoLoaded,
    observerTarget,
    videoRefs,
    postModalRef,
    actionQueue,
    loadPosts,
    handleRefreshPosts,
    handleVideoPlay,
    handleVideoEnded,
    handleVideoLoaded,
    handleFileSelect,
    removeFile,
    handleLike,
    handleShare,
    loadComments,
    handleAddComment,
    handleCreatePost
  } = useHome();

  const isVerified = useMemo(() => 
    userProfile?.user_status === 'verified', 
    [userProfile]
  );

  const getUserInitials = useCallback((firstName?: string, lastName?: string, fullName?: string): string => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (fullName) {
      const parts = fullName.split(' ');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return parts[0].charAt(0).toUpperCase();
    }
    return 'U';
  }, []);

  const navigateToProfile = useCallback((userId: string) => {
    navigate(`/profile/${userId}`);
  }, [navigate]);

  const formatTimeAgo = useCallback((dateString: string): string => {
    return homeService.formatTimeAgo(dateString);
  }, []);

  // Handle file selection from home page buttons
  const handleFileSelectFromHome = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray].slice(0, 10));
      
      // Auto-open modal when files are selected
      if (filesArray.length > 0) {
        setShowPostModal(true);
      }
    }
  }, [setSelectedFiles, setShowPostModal]);

  // Ref for photo input on home page
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Trigger file input click
  const triggerPhotoInput = useCallback(() => {
    if (!userProfile) {
      toast.error('Please login to create posts');
      return;
    }
    photoInputRef.current?.click();
  }, [userProfile]);

  const triggerVideoInput = useCallback(() => {
    if (!userProfile) {
      toast.error('Please login to create posts');
      return;
    }
    videoInputRef.current?.click();
  }, [userProfile]);

  if (loading && posts.length === 0) {
    return (
      <div className="p-3 safe-area">
        <Toaster position="top-right" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-blue-200 shadow p-3 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white safe-area">
      <Toaster position="top-right" />

      {/* Hidden file inputs for home page */}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelectFromHome}
        className="hidden"
        aria-label="Upload photo from home"
        ref={photoInputRef}
      />
      <input
        type="file"
        accept="video/*"
        multiple
        onChange={handleFileSelectFromHome}
        className="hidden"
        aria-label="Upload video from home"
        ref={videoInputRef}
      />

      {/* Manual Refresh Button */}
      {posts.length > 0 && (
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={handleRefreshPosts}
            className="w-full py-2 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 rounded-lg text-xs font-medium border border-blue-200 hover:from-blue-100 hover:to-purple-100 transition-all flex items-center justify-center gap-1.5 min-h-[36px]"
            aria-label="Refresh feed"
          >
            <RefreshCw size={14} />
            Refresh Feed
          </button>
        </div>
      )}

      {/* Create Post Button */}
      <div className="sticky top-12 z-30 bg-gradient-to-b from-white to-blue-50/50 px-3 pb-3 pt-1.5">
        <div className="bg-white rounded-xl shadow border border-blue-200 overflow-hidden">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                {userProfile?.first_name?.charAt(0) || '+'}
              </div>
              <div className="flex-1">
                <button
                  onClick={() => {
                    if (!userProfile) {
                      toast.error('Please login to create posts');
                      return;
                    }
                    
                    setShowPostModal(true);
                  }}
                  className="w-full p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors border border-gray-200 min-h-[36px]"
                  aria-label="Create new post"
                >
                  <p className="text-xs text-gray-600">What's on your mind?</p>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-around border-t border-gray-100 pt-2">
              <button
                onClick={triggerPhotoInput}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors min-h-[36px]"
                aria-label="Upload photo"
              >
                <ImageIcon size={18} className="text-green-500" />
                <span className="text-xs font-medium text-gray-700">Photo</span>
              </button>
              
              <button
                onClick={triggerVideoInput}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors min-h-[36px]"
                aria-label="Upload video"
              >
                <Video size={18} className="text-red-500" />
                <span className="text-xs font-medium text-gray-700">Video</span>
              </button>
              
              <button 
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors min-h-[36px]"
                aria-label="Add location"
                onClick={() => {
                  if (!userProfile) {
                    toast.error('Please login to create posts');
                    return;
                  }
                  setShowPostModal(true);
                }}
              >
                <MapPin size={18} className="text-blue-500" />
                <span className="text-xs font-medium text-gray-700">Location</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="pb-20">
        {posts.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 border border-blue-200">
              <MessageCircle size={24} className="text-blue-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5">No posts yet</h3>
            <p className="text-xs text-gray-600 mb-4">Be the first to share something with the community!</p>
            <button
              onClick={() => {
                if (!userProfile) {
                  toast.error('Please login to create posts');
                  return;
                }
                
                setShowPostModal(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-lg font-medium shadow min-h-[36px] text-xs"
              aria-label="Create first post"
            >
              Create First Post
            </button>
          </div>
        ) : (
          <div className="space-y-3 px-3">
            {posts.map((post) => {
              const userInitials = getUserInitials(
                post.author_first_name,
                post.author_last_name,
                post.author_name
              );
              
              return (
                <div key={post.id} className="bg-white rounded-xl shadow border border-blue-200 overflow-hidden">
                  {/* Post Header */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigateToProfile(post.author_id)}
                          className="flex items-center gap-2 group"
                          aria-label={`View ${post.author_name}'s profile`}
                        >
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-white shadow bg-gray-100">
                              {post.author_avatar ? (
                                <img 
                                  src={post.author_avatar} 
                                  alt={post.author_name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500">
                                  <span className="text-white font-bold text-xs">
                                    {userInitials}
                                  </span>
                                </div>
                              )}
                            </div>
                            {post.author_verified && (
                              <div className="absolute -bottom-1 -right-1">
                                <VerifiedBadge size={16} />
                              </div>
                            )}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-1">
                              <h4 
                                onClick={() => navigateToProfile(post.author_id)}
                                className="font-bold text-sm text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                              >
                                {post.author_name}
                              </h4>
                              {post.author_verified && (
                                <VerifiedBadge size={12} />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(post.created_at)}
                              </span>
                              {post.location && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-xs text-gray-500 flex items-center gap-0.5">
                                    <MapPin size={10} />
                                    {post.location}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                      <button 
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors min-h-[36px] min-w-[36px]"
                        aria-label="Post options"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>

                    {/* Post Content */}
                    <div className="mt-3">
                      <p className="text-xs text-gray-900 whitespace-pre-line leading-relaxed">{post.content}</p>
                      
                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {post.tags.map((tag, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 text-xs font-medium rounded-full border border-blue-200"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Media Display */}
                    {post.media_urls.length > 0 && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                        {post.media_type === 'video' ? (
                          <div className="relative">
                            <video
                              ref={el => videoRefs.current[post.id] = el}
                              src={post.media_urls[0]}
                              className="w-full h-auto max-h-[320px] object-contain bg-black" 
                              controls={playingVideo === post.id}
                              onClick={() => playingVideo === post.id ? {} : handleVideoPlay(post.id)}
                              onEnded={() => handleVideoEnded(post.id)}
                              onLoadedData={() => handleVideoLoaded(post.id)}
                              playsInline
                              preload="metadata"
                              aria-label="Post video"
                            />
                            {playingVideo !== post.id && (
                              <button
                                onClick={() => handleVideoPlay(post.id)}
                                className="absolute inset-0 flex items-center justify-center bg-black/20 group hover:bg-black/30 transition-colors min-h-[36px]"
                                aria-label="Play video"
                              >
                                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Play size={24} className="text-gray-900 ml-0.5" fill="currentColor" />
                                </div>
                              </button>
                            )}
                          </div>
                        ) : post.media_type === 'image' ? (
                          <div className="relative">
                            <img 
                              src={post.media_urls[0]} 
                              alt="Post media"
                              className="w-full h-auto max-h-[320px] object-contain mx-auto" 
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-0.5 p-0.5">
                            {post.media_urls.slice(0, 4).map((url, idx) => (
                              <div key={idx} className="relative aspect-square bg-gray-100">
                                <img 
                                  src={url} 
                                  alt={`Gallery ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                                {idx === 3 && post.media_urls.length > 4 && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">
                                      +{post.media_urls.length - 4}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Post Stats */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                          <Heart size={8} className="text-white" />
                        </div>
                        {post.likes_count}
                      </span>
                      <span>{post.comments_count} comments</span>
                      <span>{post.shares_count} shares</span>
                    </div>

                    {/* Post Actions */}
                    <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleLike(post.id)}
                        disabled={actionQueue.current.isPending(`like_${post.id}`)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all min-h-[36px] ${
                          post.has_liked 
                            ? 'text-red-500 bg-gradient-to-r from-red-50 to-pink-50 border border-red-100' 
                            : 'text-gray-500 hover:text-red-500 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        aria-label={post.has_liked ? 'Unlike post' : 'Like post'}
                      >
                        <Heart size={20} fill={post.has_liked ? "currentColor" : "none"} />
                        <span className="text-xs font-medium">Like</span>
                        {actionQueue.current.isPending(`like_${post.id}`) && (
                          <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin ml-0.5"></div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedPostForComments(
                            selectedPostForComments === post.id ? null : post.id
                          );
                          if (!comments[post.id]) {
                            loadComments(post.id);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors min-h-[36px]"
                        aria-label="View comments"
                      >
                        <MessageCircle size={20} />
                        <span className="text-xs font-medium">Comment</span>
                      </button>
                      
                      <button
                        onClick={() => handleShare(post.id)}
                        disabled={actionQueue.current.isPending(`share_${post.id}`)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all min-h-[36px] ${
                          post.has_shared 
                            ? 'text-green-500 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100' 
                            : 'text-gray-500 hover:text-green-500 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        aria-label="Share post"
                      >
                        <Share2 size={20} />
                        <span className="text-xs font-medium">Share</span>
                        {actionQueue.current.isPending(`share_${post.id}`) && (
                          <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin ml-0.5"></div>
                        )}
                      </button>
                    </div>

                    {/* Comments Section */}
                    {selectedPostForComments === post.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {/* Add Comment */}
                        <div className="flex items-center gap-1.5 mb-3">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                            placeholder="Write a comment..."
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            aria-label="Comment input"
                            disabled={actionQueue.current.isPending(`comment_${post.id}`)}
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!newComment.trim() || actionQueue.current.isPending(`comment_${post.id}`)}
                            className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[36px] min-w-[36px]"
                            aria-label="Post comment"
                          >
                            <Send size={16} />
                          </button>
                        </div>

                        {/* Comments List */}
                        {commentLoading[post.id] ? (
                          <div className="space-y-2">
                            {[...Array(2)].map((_, i) => (
                              <div key={i} className="flex gap-2 animate-pulse">
                                <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                                <div className="flex-1">
                                  <div className="h-2.5 bg-gray-200 rounded w-1/4 mb-1.5"></div>
                                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : comments[post.id]?.length > 0 ? (
                          <div className="space-y-2">
                            {comments[post.id].map((comment) => {
                              const commentUserInitials = getUserInitials(
                                undefined,
                                undefined,
                                comment.author_name
                              );
                              
                              return (
                                <div key={comment.id} className="flex gap-2">
                                  <button
                                    onClick={() => navigateToProfile(comment.author_id)}
                                    className="flex-shrink-0"
                                    aria-label={`View ${comment.author_name}'s profile`}
                                  >
                                    <div className="relative">
                                      <div className="w-6 h-6 rounded-full overflow-hidden border border-white">
                                        {comment.author_avatar ? (
                                          <img 
                                            src={comment.author_avatar} 
                                            alt={comment.author_name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            decoding="async"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500">
                                            <span className="text-white text-xs font-bold">
                                              {commentUserInitials}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      {comment.author_verified && (
                                        <div className="absolute -bottom-0.5 -right-0.5">
                                          <VerifiedBadge size={10} />
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span 
                                        onClick={() => navigateToProfile(comment.author_id)}
                                        className="font-bold text-xs text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                                      >
                                        {comment.author_name}
                                      </span>
                                      {comment.author_verified && (
                                        <VerifiedBadge size={8} />
                                      )}
                                      <span className="text-xs text-gray-500">
                                        {formatTimeAgo(comment.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-700 mt-0.5">{comment.content}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 text-xs py-3">
                            No comments yet. Be the first to comment!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-2"></div>

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="py-6 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600 font-medium">Loading more posts...</span>
                </div>
              </div>
            )}

            {/* No More Posts Indicator */}
            {!hasMore && posts.length > 0 && (
              <div className="py-6 text-center">
                <div className="text-gray-500 text-xs font-medium">
                  You've reached the end of the feed
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-12 md:pt-20">
          <div 
            ref={postModalRef}
            className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-blue-200 animate-fadeIn max-h-[85vh] flex flex-col mx-4"
          >
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">Create Post</h2>
                <button
                  onClick={() => {
                    setNewPostContent('');
                    setSelectedFiles([]);
                    setShowPostModal(false);
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded-full transition-colors min-h-[36px] min-w-[36px]"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 140px)' }}>
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium text-gray-700">
                      Selected {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
                    </h3>
                    <button
                      onClick={() => setSelectedFiles([])}
                      className="text-xs text-red-500 hover:text-red-700"
                      aria-label="Clear all files"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                        {file.type.startsWith('video/') ? (
                          <div className="relative w-full h-full">
                            <video
                              src={URL.createObjectURL(file)}
                              className="w-full h-full object-cover"
                              aria-label={`Video preview ${idx + 1}`}
                            />
                            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded">
                              Video
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-full h-full">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded">
                              Image
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors min-h-[30px] min-w-[30px]"
                          aria-label="Remove file"
                        >
                          <X size={12} />
                        </button>
                        <div className="absolute bottom-1 right-1 text-[10px] text-white bg-black/50 px-1 py-0.5 rounded">
                          {(file.size / (1024 * 1024)).toFixed(1)}MB
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Post Content Textarea */}
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full min-h-[120px] p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-xs text-gray-900"
                maxLength={2000}
                aria-label="Post content"
              />

              {/* Character Counter */}
              <div className="text-right text-xs text-gray-500 mt-1.5">
                {newPostContent.length}/2000
              </div>
            </div>

            {/* Fixed Footer with Action Buttons */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              {/* File Upload Buttons */}
              <div className="flex items-center justify-between mb-4">
                <label className="flex-1 mr-2">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Upload photo or video"
                  />
                  <div className="flex items-center justify-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all cursor-pointer border border-blue-200 min-h-[40px]">
                    <ImageIcon size={18} className="text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Photo/Video</span>
                  </div>
                </label>
                
                <button 
                  className="flex-1 ml-2 flex items-center justify-center gap-2 p-2 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all border border-green-200 min-h-[40px]"
                  aria-label="Add location"
                >
                  <MapPin size={18} className="text-green-600" />
                  <span className="text-xs font-medium text-green-700">Location</span>
                </button>
              </div>

              {/* Post Button */}
              <button
                onClick={handleCreatePost}
                disabled={isPosting || (!newPostContent.trim() && selectedFiles.length === 0)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow min-h-[44px] text-sm"
                aria-label={isPosting ? 'Posting...' : 'Post'}
              >
                {isPosting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">Posting...</span>
                  </div>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;