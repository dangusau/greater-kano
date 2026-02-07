import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  homeService, 
  Post, 
  Comment, 
  ActionQueue,
  POSTS_PER_PAGE
} from '../services/supabase/homeService';
import { supabase } from '../services/supabase';

export const useHome = () => {
  const { userProfile } = useAuth();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState<Record<string, boolean>>({});

  const observerTarget = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const postModalRef = useRef<HTMLDivElement>(null);
  const actionQueue = useRef(new ActionQueue());

  // FIXED: Remove posts from dependencies to prevent infinite loop
  const loadPosts = useCallback(async (isForceRefresh = false) => {
    // Don't load if no user
    if (!userProfile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // FIXED: Pass empty array instead of current posts
      const { posts: loadedPosts, hasMore: loadedHasMore } = await homeService.loadPosts(
        [],
        isForceRefresh,
        true
      );

      setPosts(loadedPosts);
      setHasMore(loadedHasMore);
      
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]); // FIXED: Removed posts dependency

  // Load posts when userProfile changes
  useEffect(() => {
    if (userProfile?.id) {
      console.log('User authenticated, loading posts for:', userProfile.id);
      loadPosts();
    } else {
      // User logged out - clear posts
      setPosts([]);
      setLoading(false);
    }
  }, [userProfile?.id, loadPosts]);

  // FIXED: Remove posts from dependencies
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !userProfile?.id) return;

    setLoadingMore(true);

    try {
      // Use current posts via closure, not dependency
      const currentPosts = posts;
      const { posts: loadedPosts, hasMore: loadedHasMore } = await homeService.loadMorePosts(currentPosts);
      setPosts(loadedPosts);
      setHasMore(loadedHasMore);
    } catch (err) {
      console.error("Error loading more posts", err);
      toast.error('Failed to load more posts');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, userProfile?.id]); // FIXED: Removed posts dependency

  const handleRefreshPosts = useCallback(async () => {
    if (!userProfile?.id) {
      toast.error('Please login to refresh');
      return;
    }

    const toastId = toast.loading('Refreshing...');
    await loadPosts(true);
    toast.dismiss(toastId);
    toast.success('Feed refreshed');
  }, [loadPosts, userProfile?.id]);

  const handleVideoPlay = useCallback((postId: string) => {
    if (playingVideo === postId) {
      const video = videoRefs.current[postId];
      if (video) {
        video.pause();
      }
      setPlayingVideo(null);
    } else {
      if (playingVideo) {
        const currentVideo = videoRefs.current[playingVideo];
        if (currentVideo) {
          currentVideo.pause();
        }
      }
      
      const video = videoRefs.current[postId];
      if (video) {
        video.playsInline = true;
        video.play().catch(() => {
          setPlayingVideo(null);
        });
        setPlayingVideo(postId);
      }
    }
  }, [playingVideo]);

  const handleVideoEnded = useCallback((postId: string) => {
    setPlayingVideo(null);
  }, []);

  const handleVideoLoaded = useCallback((postId: string) => {
    setVideoLoaded(prev => ({ ...prev, [postId]: true }));
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray].slice(0, 10));
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // FIXED: Use functional update to avoid posts dependency
  const handleLike = useCallback(async (postId: string) => {
    if (!userProfile?.id) {
      toast.error('Please login to like posts');
      return;
    }

    return actionQueue.current.execute(`like_${postId}`, async () => {
      // First update UI optimistically
      setPosts(currentPosts => {
        return currentPosts.map(post => {
          if (post.id === postId) {
            const newHasLiked = !post.has_liked;
            return {
              ...post,
              has_liked: newHasLiked,
              likes_count: newHasLiked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1)
            };
          }
          return post;
        });
      });

      // Then make API call
      const currentPosts = posts;
      const { error } = await homeService.handleLike(postId, currentPosts, userProfile);
      
      if (error) {
        toast.error(error);
        // Revert optimistic update on error
        setPosts(currentPosts); // Revert to original
      }
    });
  }, [userProfile]);

  // FIXED: Use functional update to avoid posts dependency
  const handleShare = useCallback(async (postId: string) => {
    if (!userProfile?.id) {
      toast.error('Please login to share posts');
      return;
    }

    return actionQueue.current.execute(`share_${postId}`, async () => {
      // First update UI optimistically
      setPosts(currentPosts => {
        return currentPosts.map(post => {
          if (post.id === postId) {
            const newHasShared = !post.has_shared;
            return {
              ...post,
              has_shared: newHasShared,
              shares_count: newHasShared ? post.shares_count + 1 : Math.max(0, post.shares_count - 1)
            };
          }
          return post;
        });
      });

      // Then make API call
      const currentPosts = posts;
      const { error, success, shareableLink } = await homeService.handleShare(postId, currentPosts, userProfile);
      
      if (error) {
        toast.error(error);
        // Revert optimistic update on error
        setPosts(currentPosts); // Revert to original
        return;
      }
      
      if (success && shareableLink) {
        await handleNativeShare(postId, shareableLink);
      } else if (success) {
        toast.success(success);
      }
    });
  }, [userProfile]);

  // FIXED: Add posts as dependency since we use it directly
  const handleNativeShare = useCallback(async (postId: string, shareableLink: string) => {
    try {
      const currentPosts = posts;
      const post = currentPosts.find(p => p.id === postId);
      if (!post) return;
      
      const shareData = {
        title: `Post by ${post.author_name}`,
        text: post.content.length > 100 ? `${post.content.substring(0, 100)}...` : post.content,
        url: shareableLink,
      };
      
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          toast.success('Post shared successfully!');
        } catch (shareError) {
          if (shareError instanceof Error && shareError.name !== 'AbortError') {
            await handleCopyLink(shareableLink);
          }
        }
      } else {
        await handleCopyLink(shareableLink);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share post');
    }
  }, [posts]); // Keep posts dependency since we use it directly

  const handleCopyLink = useCallback(async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }, []);

  const loadComments = useCallback(async (postId: string) => {
    try {
      setCommentLoading(prev => ({ ...prev, [postId]: true }));
      
      const commentsData = await homeService.loadComments(postId);
      setComments(prev => ({ ...prev, [postId]: commentsData }));
      
    } catch {
      toast.error('Failed to load comments');
      setComments(prev => ({ ...prev, [postId]: [] }));
    } finally {
      setCommentLoading(prev => ({ ...prev, [postId]: false }));
    }
  }, []);

  // FIXED: Use functional update to avoid posts dependency
  const handleAddComment = useCallback(async (postId: string) => {
    if (!newComment.trim()) return;
    
    if (!userProfile?.id) {
      toast.error('Please login to comment');
      return;
    }

    return actionQueue.current.execute(`comment_${postId}`, async () => {
      const commentContent = newComment.trim();
      
      // First update UI optimistically
      setPosts(currentPosts => {
        return currentPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments_count: post.comments_count + 1
            };
          }
          return post;
        });
      });

      // Clear comment input immediately
      setNewComment('');
      
      // Store the current posts for the API call
      const currentPosts = posts;
      const { error } = await homeService.handleAddComment(
        postId,
        commentContent,
        currentPosts,
        userProfile
      );
      
      if (error) {
        toast.error(error);
        // Revert optimistic update on error
        setPosts(currentPosts);
        setNewComment(commentContent); // Restore the comment text
        return;
      }
      
      // Load fresh comments
      await loadComments(postId);
      toast.success('Comment added');
    });
  }, [newComment, userProfile, loadComments]);

  const handleCreatePost = useCallback(async () => {
    if (!userProfile?.id) {
      toast.error('Please login to create posts');
      return;
    }

    try {
      setIsPosting(true);
      
      const { success, error } = await homeService.handleCreatePost(
        newPostContent,
        selectedFiles,
        userProfile,
        userProfile?.user_status === 'verified'
      );

      if (error) {
        toast.error(error);
        return;
      }

      if (success) {
        toast.success('Post created');
        
        setNewPostContent('');
        setSelectedFiles([]);
        setShowPostModal(false);
        
        // Refresh posts after creating new one
        setTimeout(() => {
          loadPosts(true);
        }, 500);
      }
    } catch {
      toast.error('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  }, [newPostContent, selectedFiles, userProfile, loadPosts]);

  // Setup infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && userProfile?.id) {
          loadMorePosts();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore, loading, loadMorePosts, userProfile?.id]);

  return {
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
  };
};
