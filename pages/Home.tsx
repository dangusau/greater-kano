import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Heart, MessageCircle, Share2, MoreVertical, Image as ImageIcon, Video, MapPin, Send, X, Play, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { formatDistanceToNow } from 'date-fns';
import VerifiedBadge from '../components/VerifiedBadge';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { appCache } from '../shared/services/UniversalCache';

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


class ActionQueue {
  private queue: Map<string, Promise<any>> = new Map();
  
  async execute<T>(key: string, action: () => Promise<T>): Promise<T> {
    if (this.queue.has(key)) {
      return this.queue.get(key) as Promise<T>;
    }
    
    const promise = action().finally(() => {
      this.queue.delete(key);
    });
    
    this.queue.set(key, promise);
    return promise;
  }
  
  isPending(key: string): boolean {
    return this.queue.has(key);
  }
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [postOffset, setPostOffset] = useState(0);
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
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const POSTS_PER_PAGE = 10;
  const CACHE_KEY = 'gkbc_posts_cache';
  const CACHE_TTL = 5 * 60 * 1000;
  const observerTarget = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const postModalRef = useRef<HTMLDivElement>(null);
  const isComponentMounted = useRef(true);
  const loadAttempted = useRef(false);
  const actionQueue = useRef(new ActionQueue());
  const isBackgroundRefresh = useRef(false);

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

  const optimisticallyUpdatePost = useCallback((postId: string, updates: Partial<Post>) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    ));
  }, []);

  const rollbackPostUpdate = useCallback((postId: string, originalPost: Post) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? originalPost : post
    ));
  }, []);

  const silentBackgroundRefresh = useCallback(async () => {
    try {
      isBackgroundRefresh.current = true;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .rpc('get_home_feed', {
          p_current_user_id: user.id,
          p_limit_count: POSTS_PER_PAGE,
          p_offset_count: 0
        });

      if (!data) return;
      
      const validPosts = (data || []).map((post: any) => ({
        id: post.id || '',
        author_id: post.author_id || '',
        author_name: post.author_name || 'User',
        author_avatar: post.author_avatar || '',
        author_first_name: post.author_first_name,
        author_last_name: post.author_last_name,
        author_verified: post.author_verified || false,
        content: post.content || '',
        media_urls: post.media_urls || [],
        media_type: post.media_type || 'text',
        location: post.location || null,
        tags: post.tags || [],
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        shares_count: post.shares_count || 0,
        created_at: post.created_at || new Date().toISOString(),
        updated_at: post.updated_at || new Date().toISOString(),
        has_liked: post.has_liked || false,
        has_shared: post.has_shared || false
      }));

      const uniquePosts = validPosts.filter((post: Post, index: number, self: Post[]) =>
        index === self.findIndex((p) => p.id === post.id)
      );

      const currentPostsStr = JSON.stringify(posts);
      const newPostsStr = JSON.stringify(uniquePosts);
      
      if (currentPostsStr !== newPostsStr) {
        setPosts(uniquePosts);
        await appCache.set(CACHE_KEY, uniquePosts, CACHE_TTL);
      }
      
    } catch {
      // Silent fail for background refresh
    } finally {
      isBackgroundRefresh.current = false;
    }
  }, [posts]);

const canUserViewPost = useCallback(async (authorId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // User can always see their own posts
    if (user.id === authorId) return true;

    // Get author's status
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('user_status')
      .eq('id', authorId)
      .single();

    // If profile missing, do NOT block the post (fails open)
    if (!authorProfile) return true;

    // Verified = visible to everyone
    if (authorProfile.user_status === 'verified') return true;

    // Member posts → only visible to accepted connections
    const { data: connection } = await supabase
      .from('connections')
      .select('id')
      .or(
        `and(user_id.eq.${user.id},connected_user_id.eq.${authorId}),and(user_id.eq.${authorId},connected_user_id.eq.${user.id})`
      )
      .eq('status', 'accepted')
      .single();

    return !!connection;
  } catch {
    // Fail open — do not hide posts on error
    return true;
  }
}, []);

  const refreshPostData = useCallback(async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .rpc('get_home_feed', {
          p_current_user_id: user.id,
          p_limit_count: 1,
          p_offset_count: 0
        });

      if (!data) return;

      const updatedPost = data.find((p: any) => p.id === postId);
      if (updatedPost) {
        optimisticallyUpdatePost(postId, {
          likes_count: updatedPost.likes_count,
          comments_count: updatedPost.comments_count,
          shares_count: updatedPost.shares_count,
          has_liked: updatedPost.has_liked,
          has_shared: updatedPost.has_shared
        });
      }
    } catch {
      // Silent fail for post refresh
    }
  }, [optimisticallyUpdatePost]);

  const loadNewPost = useCallback(async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .rpc('get_home_feed', {
          p_current_user_id: user.id,
          p_limit_count: 1,
          p_offset_count: 0
        });

      if (!data || data.length === 0) return;

      const newPostData = data[0];
      const newPost: Post = {
        id: newPostData.id || '',
        author_id: newPostData.author_id || '',
        author_name: newPostData.author_name || 'User',
        author_avatar: newPostData.author_avatar || '',
        author_first_name: newPostData.author_first_name,
        author_last_name: newPostData.author_last_name,
        author_verified: newPostData.author_verified || false,
        content: newPostData.content || '',
        media_urls: newPostData.media_urls || [],
        media_type: newPostData.media_type || 'text',
        location: newPostData.location || null,
        tags: newPostData.tags || [],
        likes_count: newPostData.likes_count || 0,
        comments_count: newPostData.comments_count || 0,
        shares_count: newPostData.shares_count || 0,
        created_at: newPostData.created_at || new Date().toISOString(),
        updated_at: newPostData.updated_at || new Date().toISOString(),
        has_liked: newPostData.has_liked || false,
        has_shared: newPostData.has_shared || false
      };

      setPosts(prev => [newPost, ...prev.filter(p => p.id !== postId)]);
      await appCache.remove(CACHE_KEY);

    } catch {
      // Silent fail for loading new post
    }
  }, []);


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

  const navigateToProfile = useCallback((userId: string) => {
    navigate(`/profile/${userId}`);
  }, [navigate]);

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
    return actionQueue.current.execute(`like_${postId}`, async () => {
      if (!userProfile) {
        toast.error('Please login to like posts');
        return;
      }

      const currentPost = posts.find(p => p.id === postId);
      if (!currentPost) return;

      const originalPost = { ...currentPost };

      const newHasLiked = !currentPost.has_liked;
      const newLikesCount = newHasLiked ? currentPost.likes_count + 1 : Math.max(0, currentPost.likes_count - 1);
      
      optimisticallyUpdatePost(postId, {
        likes_count: newLikesCount,
        has_liked: newHasLiked
      });

      try {
        const { data, error } = await supabase
          .rpc('toggle_post_like', {
            p_post_id: postId,
            p_user_id: userProfile.id
          });

        if (error) {
          rollbackPostUpdate(postId, originalPost);
          toast.error('Failed to like post');
          return;
        }

        if (data && data.length > 0) {
          optimisticallyUpdatePost(postId, {
            likes_count: data[0].likes_count,
            has_liked: data[0].has_liked
          });
          await appCache.remove(CACHE_KEY);
        }
      } catch {
        rollbackPostUpdate(postId, originalPost);
        toast.error('Failed to like post');
      }
    });
  }, [posts, userProfile, optimisticallyUpdatePost, rollbackPostUpdate]);

  const handleShare = useCallback(async (postId: string) => {
    return actionQueue.current.execute(`share_${postId}`, async () => {
      if (!userProfile) {
        toast.error('Please login to share posts');
        return;
      }

      const currentPost = posts.find(p => p.id === postId);
      if (!currentPost) return;

      const originalPost = { ...currentPost };

      const newHasShared = !currentPost.has_shared;
      const newSharesCount = newHasShared ? currentPost.shares_count + 1 : Math.max(0, currentPost.shares_count - 1);
      
      optimisticallyUpdatePost(postId, {
        shares_count: newSharesCount,
        has_shared: newHasShared
      });

      try {
        const { data, error } = await supabase
          .rpc('share_post', {
            p_post_id: postId,
            p_user_id: userProfile.id
          });

        if (error) {
          rollbackPostUpdate(postId, originalPost);
          toast.error('Failed to share post');
          return;
        }

        if (data && data.length > 0) {
          optimisticallyUpdatePost(postId, {
            shares_count: data[0].shares_count,
            has_shared: data[0].has_shared
          });
          
          if (data[0].action === 'shared') {
            toast.success('Post shared');
          }
          await appCache.remove(CACHE_KEY);
        }
      } catch {
        rollbackPostUpdate(postId, originalPost);
        toast.error('Failed to share post');
      }
    });
  }, [posts, userProfile, optimisticallyUpdatePost, rollbackPostUpdate]);

  const loadComments = useCallback(async (postId: string) => {
    try {
      setCommentLoading(prev => ({ ...prev, [postId]: true }));
      
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          author_id,
          likes_count,
          profiles!comments_author_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            user_status
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (commentsError) {
        throw commentsError;
      }
      
      if (commentsData) {
        const transformedComments: Comment[] = commentsData.map((comment: any) => {
          const profile = comment.profiles || {};
          const authorName = profile.first_name || profile.last_name 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : 'User';
          
          return {
            id: comment.id,
            author_id: comment.author_id,
            author_name: authorName,
            author_avatar: profile.avatar_url || '',
            author_verified: profile.user_status === 'verified',
            content: comment.content,
            likes_count: comment.likes_count || 0,
            created_at: comment.created_at,
            updated_at: comment.created_at,
            has_liked: false
          };
        });

        setComments(prev => ({ ...prev, [postId]: transformedComments }));
      } else {
        setComments(prev => ({ ...prev, [postId]: [] }));
      }
    } catch {
      toast.error('Failed to load comments');
      setComments(prev => ({ ...prev, [postId]: [] }));
    } finally {
      setCommentLoading(prev => ({ ...prev, [postId]: false }));
    }
  }, []);

  const handleAddComment = useCallback(async (postId: string) => {
    if (!newComment.trim()) return;

    return actionQueue.current.execute(`comment_${postId}`, async () => {
      if (!userProfile) {
        toast.error('Please login to comment');
        return;
      }

      const currentPost = posts.find(p => p.id === postId);
      if (!currentPost) return;

      const originalPost = { ...currentPost };

      const newCommentsCount = currentPost.comments_count + 1;
      
      optimisticallyUpdatePost(postId, {
        comments_count: newCommentsCount
      });

      const isUserVerified = userProfile?.user_status === 'verified';

      const tempCommentId = `temp_${Date.now()}`;
      const optimisticComment: Comment = {
        id: tempCommentId,
        author_id: userProfile.id,
        author_name: userProfile.first_name ? 
          `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : 
          'You',
        author_avatar: userProfile.avatar_url || '',
        author_verified: isUserVerified,
        content: newComment.trim(),
        likes_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        has_liked: false
      };

      setComments(prev => ({
        ...prev,
        [postId]: [optimisticComment, ...(prev[postId] || [])]
      }));

      const commentContent = newComment.trim();
      setNewComment('');

      try {
        let result;
        try {
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('add_comment', {
              p_post_id: postId,
              p_author_id: userProfile.id,
              p_comment_content: commentContent
            });

          if (rpcError) throw rpcError;
          result = rpcData;
        } catch {
          const { data: insertData, error: insertError } = await supabase
            .from('comments')
            .insert({
              post_id: postId,
              author_id: userProfile.id,
              content: commentContent
            })
            .select()
            .single();

          if (insertError) throw insertError;
          
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);
          
          result = [{ comment_id: insertData.id, comments_count: count || newCommentsCount }];
        }

        if (result && result.length > 0) {
          optimisticallyUpdatePost(postId, {
            comments_count: result[0].comments_count
          });

          await loadComments(postId);
          
          toast.success('Comment added');
          await appCache.remove(CACHE_KEY);
        }
      } catch {
        rollbackPostUpdate(postId, originalPost);
        setComments(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).filter(c => c.id !== tempCommentId)
        }));
        toast.error('Failed to add comment');
      }
    });
  }, [newComment, posts, userProfile, optimisticallyUpdatePost, rollbackPostUpdate, loadComments]);

  const handleCreatePost = useCallback(async () => {
    if (!newPostContent.trim() && selectedFiles.length === 0) {
      toast.error('Please add content or media to your post');
      return;
    }

    try {
      setIsPosting(true);
      
      if (!userProfile) {
        toast.error('Please login to create a post');
        return;
      }

     

      let mediaUrls: string[] = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const filePath = `posts/${userProfile.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('post-media')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const { data: urlData } = supabase.storage
            .from('post-media')
            .getPublicUrl(filePath);

          mediaUrls.push(urlData.publicUrl);
        }
      }

      const mediaType = selectedFiles.length === 0 ? 'text' : 
                       selectedFiles.length === 1 ? (selectedFiles[0].type.startsWith('video/') ? 'video' : 'image') : 
                       'gallery';

      const { data: postId, error } = await supabase
        .rpc('create_post', {
          p_author_id: userProfile.id,
          p_post_content: newPostContent.trim(),
          p_media_urls: mediaUrls,
          p_media_type: mediaType,
          p_tags: newPostContent.match(/#\w+/g)?.map(tag => tag.substring(1)) || []
        });

      if (error) {
        throw error;
      }

      toast.success('Post created');
      
      await appCache.remove(CACHE_KEY);
      
      setNewPostContent('');
      setSelectedFiles([]);
      setShowPostModal(false);
      
      setTimeout(() => {
        loadPosts(true);
      }, 500);

    } catch {
      toast.error('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  }, [newPostContent, selectedFiles, userProfile, isVerified]);

  // Fix: Define loadPosts function here to avoid circular dependency
  const loadPosts = useCallback(async (isForceRefresh = false) => {
  try {
    // Always show skeleton until either cache or server returns
    if (!cacheLoaded && posts.length === 0) {
      setLoading(true);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setCacheLoaded(true);
      return;
    }

    // Check cache first
    if (!isForceRefresh) {
      const cachedData = await appCache.get(CACHE_KEY);
      if (cachedData) {
        setPosts(cachedData as Post[]);
        setCacheLoaded(true);
        setLoading(false);

        // Background refresh
        setTimeout(() => {
          silentBackgroundRefresh();
        }, 500);

        return;
      }
    }

    // Fetch from server if cache not used
    const { data, error } = await supabase.rpc('get_home_feed', {
      p_current_user_id: user.id,
      p_limit_count: POSTS_PER_PAGE,
      p_offset_count: 0
    });

    if (error) throw error;

    const validPosts = (data || []).map((post: any) => ({
      id: post.id || '',
      author_id: post.author_id || '',
      author_name: post.author_name || 'User',
      author_avatar: post.author_avatar || '',
      author_first_name: post.author_first_name,
      author_last_name: post.author_last_name,
      author_verified: post.author_verified || false,
      content: post.content || '',
      media_urls: post.media_urls || [],
      media_type: post.media_type || 'text',
      location: post.location || null,
      tags: post.tags || [],
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
      shares_count: post.shares_count || 0,
      created_at: post.created_at || new Date().toISOString(),
      updated_at: post.updated_at || new Date().toISOString(),
      has_liked: post.has_liked || false,
      has_shared: post.has_shared || false
    }));

    setPosts(validPosts);
    setPostOffset(POSTS_PER_PAGE);
    setHasMore((data?.length || 0) === POSTS_PER_PAGE);

    await appCache.set(CACHE_KEY, validPosts, CACHE_TTL);

    setCacheLoaded(true);
    setLoading(false);

  } catch {
    if (!isBackgroundRefresh.current) {
      toast.error('Failed to load posts');
    }
    setCacheLoaded(true);
    setLoading(false);
  }
}, [posts.length, silentBackgroundRefresh, cacheLoaded]);


  const loadMorePosts = useCallback(async () => {
  if (loadingMore) return;

  setLoadingMore(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingMore(false);
      return;
    }

    const currentCount = posts.length;

    const { data, error } = await supabase.rpc("get_home_feed", {
      p_current_user_id: user.id,
      p_limit_count: 20,
      p_offset_count: currentCount
    });

    if (error) throw error;

    if (data && data.length > 0) {
      const merged = [...posts, ...data];
      setPosts(merged);
      appCache.set(CACHE_KEY, merged);
    }
  } catch (err) {
    console.error("Error loading more posts", err);
  } finally {
    setLoadingMore(false);
  }
}, [loadingMore, posts]);


  const handleRefreshPosts = useCallback(async () => {
    const toastId = toast.loading('Refreshing...');
    await loadPosts(true);
    toast.dismiss(toastId);
    toast.success('Feed refreshed');
  }, [loadPosts]);

  const formatTimeAgo = useCallback((dateString: string): string => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Some time ago';
    }
  }, []);

  useEffect(() => {
    isComponentMounted.current = true;
    
    const initialize = async () => {
      try {
        if (!loadAttempted.current) {
          loadAttempted.current = true;
          await loadPosts();
        } else {
          setLoading(false);
        }
        
      } catch {
        toast.error('Failed to load feed');
        setLoading(false);
      }
    };
    
    initialize();
    
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const likesChannel = supabase
        .channel('post-likes-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'post_likes'
          }, 
          (payload: any) => {
            if (payload.new?.post_id) {
              refreshPostData(payload.new.post_id);
            }
          }
        )
        .subscribe();

      const sharesChannel = supabase
        .channel('post-shares-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'post_shares'
          }, 
          (payload: any) => {
            if (payload.new?.post_id) {
              refreshPostData(payload.new.post_id);
            }
          }
        )
        .subscribe();

      const commentsChannel = supabase
        .channel('comments-changes')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'comments'
          }, 
          (payload: any) => {
            if (payload.new?.post_id) {
              refreshPostData(payload.new.post_id);
            }
          }
        )
        .subscribe();

      const postsChannel = supabase
        .channel('posts-changes')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'posts' 
          }, 
          async (payload: any) => {
            if (payload.new) {
              const canView = await canUserViewPost(payload.new.author_id);
              if (canView) {
                loadNewPost(payload.new.id);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(likesChannel);
        supabase.removeChannel(sharesChannel);
        supabase.removeChannel(commentsChannel);
        supabase.removeChannel(postsChannel);
      };
    };

    setupRealtime();
    
    return () => {
      isComponentMounted.current = false;
    };
  }, [loadPosts, refreshPostData, canUserViewPost, loadNewPost]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
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
  }, [hasMore, loadingMore, loading, loadMorePosts]);

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
              <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors min-h-[36px]">
                <ImageIcon size={18} className="text-green-500" />
                <span className="text-xs font-medium text-gray-700">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload photo"
                />
              </label>
              <label className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors min-h-[36px]">
                <Video size={18} className="text-red-500" />
                <span className="text-xs font-medium text-gray-700">Video</span>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload video"
                />
              </label>
              <button 
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors min-h-[36px]"
                aria-label="Add location"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setNewPostContent('');
              setSelectedFiles([]);
              setShowPostModal(false);
            }}
            aria-label="Close modal backdrop"
          />
          
          <div 
            ref={postModalRef}
            className="relative w-full max-w-lg bg-white rounded-t-xl animate-slideUp max-h-[80vh] overflow-hidden border-t border-blue-200 shadow"
          >
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">Create Post</h2>
                <div className="flex items-center gap-1.5">
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
            </div>

            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-300">
                        {file.type.startsWith('video/') ? (
                          <video
                            src={URL.createObjectURL(file)}
                            className="w-full h-full object-cover"
                            aria-label={`Video preview ${idx + 1}`}
                          />
                        ) : (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-contain bg-gray-100" 
                          />
                        )}
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors min-h-[30px] min-w-[30px]"
                          aria-label="Remove file"
                        >
                          <X size={12} />
                        </button>
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
                className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-xs text-gray-900"
                maxLength={2000}
                aria-label="Post content"
              />

              {/* Character Counter */}
              <div className="text-right text-xs text-gray-500 mt-1.5">
                {newPostContent.length}/2000
              </div>

              {/* File Upload Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Upload photo or video"
                  />
                  <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all cursor-pointer border border-blue-200 min-h-[36px]">
                    <ImageIcon size={20} className="text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Photo/Video</span>
                  </div>
                </label>
                
                <button 
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all border border-green-200 min-h-[36px]"
                  aria-label="Add location"
                >
                  <MapPin size={20} className="text-green-600" />
                  <span className="text-xs font-medium text-green-700">Location</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCreatePost}
                disabled={isPosting || (!newPostContent.trim() && selectedFiles.length === 0)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow min-h-[36px] text-sm"
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