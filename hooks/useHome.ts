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

  // SIMPLE LOAD POSTS FUNCTION
  const loadPosts = useCallback(async (isForceRefresh = false) => {
    // Don't load if no user
    if (!userProfile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { posts: loadedPosts, hasMore: loadedHasMore } = await homeService.loadPosts(
        posts,
        isForceRefresh,
        true // Always check cache
      );

      setPosts(loadedPosts);
      setHasMore(loadedHasMore);
      
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id, posts]);

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

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !userProfile?.id) return;

    setLoadingMore(true);

    try {
      const { posts: loadedPosts, hasMore: loadedHasMore } = await homeService.loadMorePosts(posts);
      setPosts(loadedPosts);
      setHasMore(loadedHasMore);
    } catch (err) {
      console.error("Error loading more posts", err);
      toast.error('Failed to load more posts');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, posts, userProfile?.id]);

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

  const handleLike = useCallback(async (postId: string) => {
    if (!userProfile?.id) {
      toast.error('Please login to like posts');
      return;
    }

    return actionQueue.current.execute(`like_${postId}`, async () => {
      const { posts: updatedPosts, error } = await homeService.handleLike(postId, posts, userProfile);
      
      if (error) {
        toast.error(error);
        return;
      }
      
      setPosts(updatedPosts);
    });
  }, [posts, userProfile]);

  const handleShare = useCallback(async (postId: string) => {
    if (!userProfile?.id) {
      toast.error('Please login to share posts');
      return;
    }

    return actionQueue.current.execute(`share_${postId}`, async () => {
      const { posts: updatedPosts, error, success, shareableLink } = await homeService.handleShare(postId, posts, userProfile);
      
      if (error) {
        toast.error(error);
        return;
      }
      
      if (success) {
        setPosts(updatedPosts);
        
        if (shareableLink) {
          await handleNativeShare(postId, shareableLink);
        } else {
          toast.success(success);
        }
      } else {
        setPosts(updatedPosts);
      }
    });
  }, [posts, userProfile]);

  const handleNativeShare = useCallback(async (postId: string, shareableLink: string) => {
    try {
      const post = posts.find(p => p.id === postId);
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
  }, [posts]);

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

  const handleAddComment = useCallback(async (postId: string) => {
    if (!newComment.trim()) return;
    
    if (!userProfile?.id) {
      toast.error('Please login to comment');
      return;
    }

    return actionQueue.current.execute(`comment_${postId}`, async () => {
      const { posts: updatedPosts, comments: loadedComments, error } = await homeService.handleAddComment(
        postId,
        newComment.trim(),
        posts,
        userProfile
      );
      
      if (error) {
        toast.error(error);
        return;
      }
      
      setPosts(updatedPosts);
      setComments(prev => ({
        ...prev,
        [postId]: loadedComments
      }));
      setNewComment('');
      toast.success('Comment added');
    });
  }, [newComment, posts, userProfile]);

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