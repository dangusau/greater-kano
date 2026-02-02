import { supabase } from '../supabase';
import { formatDistanceToNow } from 'date-fns';
import { appCache } from '../../shared/services/UniversalCache';

export interface Post {
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

export interface Comment {
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

export class ActionQueue {
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

export const POSTS_PER_PAGE = 10;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple cache key - user-specific
const getCacheKey = (userId: string): string => {
  return `posts_cache_${userId}`;
};

export const homeService = {
  formatTimeAgo: (dateString: string): string => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Some time ago';
    }
  },

  generateShareableLink: (postId: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/post/${postId}`;
  },

  canUserViewPost: async (authorId: string): Promise<boolean> => {
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
        .eq('status', 'connected')
        .single();

      return !!connection;
    } catch {
      // Fail open — do not hide posts on error
      return true;
    }
  },

  optimisticallyUpdatePost: (posts: Post[], postId: string, updates: Partial<Post>): Post[] => {
    return posts.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    );
  },

  loadPosts: async (
    currentPosts: Post[],
    isForceRefresh = false,
    cacheLoaded: boolean
  ): Promise<{
    posts: Post[];
    hasMore: boolean;
    offset: number;
  }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { posts: [], hasMore: false, offset: 0 };
      }

      const cacheKey = getCacheKey(user.id);

      // Check cache first (unless force refresh)
      if (!isForceRefresh) {
        const cachedData = await appCache.get(cacheKey);
        if (cachedData) {
          console.log('Loading from cache for user:', user.id);
          return {
            posts: cachedData as Post[],
            hasMore: (cachedData as Post[]).length === POSTS_PER_PAGE,
            offset: POSTS_PER_PAGE
          };
        }
      }

      // Fetch from server
      console.log('Fetching from server for user:', user.id);
      const { data, error } = await supabase.rpc('get_home_feed', {
        p_current_user_id: user.id,
        p_limit_count: POSTS_PER_PAGE,
        p_offset_count: 0
      });

      if (error) {
        console.error('Server error:', error);
        throw error;
      }

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

      // Save to cache
      await appCache.set(cacheKey, validPosts, CACHE_TTL);

      return {
        posts: validPosts,
        hasMore: (data?.length || 0) === POSTS_PER_PAGE,
        offset: POSTS_PER_PAGE
      };

    } catch (error) {
      console.error('Failed to load posts:', error);
      return { posts: currentPosts, hasMore: false, offset: 0 };
    }
  },

  loadMorePosts: async (
    currentPosts: Post[]
  ): Promise<{
    posts: Post[];
    hasMore: boolean;
  }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { posts: currentPosts, hasMore: false };
      }

      const cacheKey = getCacheKey(user.id);
      const currentCount = currentPosts.length;

      const { data, error } = await supabase.rpc("get_home_feed", {
        p_current_user_id: user.id,
        p_limit_count: 20,
        p_offset_count: currentCount
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const newPosts = data.map((post: any) => ({
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

        const merged = [...currentPosts, ...newPosts];
        
        // Update cache
        await appCache.set(cacheKey, merged, CACHE_TTL);

        return {
          posts: merged,
          hasMore: newPosts.length === 20
        };
      }

      return { posts: currentPosts, hasMore: false };
    } catch (error) {
      console.error("Error loading more posts", error);
      return { posts: currentPosts, hasMore: false };
    }
  },

  silentBackgroundRefresh: async (currentPosts: Post[]): Promise<Post[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return currentPosts;

      const cacheKey = getCacheKey(user.id);
      const { data } = await supabase
        .rpc('get_home_feed', {
          p_current_user_id: user.id,
          p_limit_count: POSTS_PER_PAGE,
          p_offset_count: 0
        });

      if (!data) return currentPosts;
      
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

      const currentPostsStr = JSON.stringify(currentPosts);
      const newPostsStr = JSON.stringify(uniquePosts);
      
      if (currentPostsStr !== newPostsStr) {
        await appCache.set(cacheKey, uniquePosts, CACHE_TTL);
        return uniquePosts;
      }
      
      return currentPosts;
    } catch {
      return currentPosts;
    }
  },

  refreshPostData: async (postId: string, posts: Post[]): Promise<Post[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return posts;

      const { data } = await supabase
        .rpc('get_home_feed', {
          p_current_user_id: user.id,
          p_limit_count: 1,
          p_offset_count: 0
        });

      if (!data) return posts;

      const updatedPost = data.find((p: any) => p.id === postId);
      if (updatedPost) {
        return posts.map(post => 
          post.id === postId ? {
            ...post,
            likes_count: updatedPost.likes_count,
            comments_count: updatedPost.comments_count,
            shares_count: updatedPost.shares_count,
            has_liked: updatedPost.has_liked,
            has_shared: updatedPost.has_shared
          } : post
        );
      }
      return posts;
    } catch {
      return posts;
    }
  },

  loadNewPost: async (postId: string, posts: Post[]): Promise<Post[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return posts;

      const cacheKey = getCacheKey(user.id);
      const { data } = await supabase
        .rpc('get_home_feed', {
          p_current_user_id: user.id,
          p_limit_count: 1,
          p_offset_count: 0
        });

      if (!data || data.length === 0) return posts;

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

      await appCache.remove(cacheKey);
      return [newPost, ...posts.filter(p => p.id !== postId)];

    } catch {
      return posts;
    }
  },

  handleLike: async (
    postId: string,
    posts: Post[],
    userProfile: any
  ): Promise<{
    posts: Post[];
    error?: string;
  }> => {
    if (!userProfile) {
      return { posts, error: 'Please login to like posts' };
    }

    const currentPost = posts.find(p => p.id === postId);
    if (!currentPost) return { posts };

    const newHasLiked = !currentPost.has_liked;
    const newLikesCount = newHasLiked ? currentPost.likes_count + 1 : Math.max(0, currentPost.likes_count - 1);
    
    const updatedPosts = posts.map(post => 
      post.id === postId ? {
        ...post,
        likes_count: newLikesCount,
        has_liked: newHasLiked
      } : post
    );

    try {
      const { data, error } = await supabase
        .rpc('toggle_post_like', {
          p_post_id: postId,
          p_user_id: userProfile.id
        });

      if (error) {
        return { posts, error: 'Failed to like post' };
      }

      if (data && data.length > 0) {
        const finalPosts = posts.map(post => 
          post.id === postId ? {
            ...post,
            likes_count: data[0].likes_count,
            has_liked: data[0].has_liked
          } : post
        );
        
        const cacheKey = getCacheKey(userProfile.id);
        await appCache.remove(cacheKey);
        return { posts: finalPosts };
      }
      
      return { posts: updatedPosts };
    } catch {
      return { posts, error: 'Failed to like post' };
    }
  },

  handleShare: async (
    postId: string,
    posts: Post[],
    userProfile: any
  ): Promise<{
    posts: Post[];
    error?: string;
    success?: string;
    shareableLink?: string;
  }> => {
    if (!userProfile) {
      return { posts, error: 'Please login to share posts' };
    }

    const currentPost = posts.find(p => p.id === postId);
    if (!currentPost) return { posts };

    const newHasShared = !currentPost.has_shared;
    const newSharesCount = newHasShared ? currentPost.shares_count + 1 : Math.max(0, currentPost.shares_count - 1);
    
    const updatedPosts = posts.map(post => 
      post.id === postId ? {
        ...post,
        shares_count: newSharesCount,
        has_shared: newHasShared
      } : post
    );

    try {
      const { data, error } = await supabase
        .rpc('share_post', {
          p_post_id: postId,
          p_user_id: userProfile.id
        });

      if (error) {
        return { posts, error: 'Failed to share post' };
      }

      if (data && data.length > 0) {
        const finalPosts = posts.map(post => 
          post.id === postId ? {
            ...post,
            shares_count: data[0].shares_count,
            has_shared: data[0].has_shared
          } : post
        );
        
        const cacheKey = getCacheKey(userProfile.id);
        await appCache.remove(cacheKey);
        
        const shareableLink = homeService.generateShareableLink(postId);
        
        const result = {
          posts: finalPosts,
          success: data[0].action === 'shared' ? 'Post shared successfully!' : 'Share removed',
          shareableLink: data[0].action === 'shared' ? shareableLink : undefined
        };
        
        return result;
      }
      
      return { posts: updatedPosts };
    } catch {
      return { posts, error: 'Failed to share post' };
    }
  },

  loadComments: async (postId: string): Promise<Comment[]> => {
    try {
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

        return transformedComments;
      } else {
        return [];
      }
    } catch {
      throw new Error('Failed to load comments');
    }
  },

  handleAddComment: async (
    postId: string,
    commentContent: string,
    posts: Post[],
    userProfile: any
  ): Promise<{
    posts: Post[];
    comments: Comment[];
    error?: string;
  }> => {
    if (!userProfile) {
      return { posts, comments: [], error: 'Please login to comment' };
    }

    const currentPost = posts.find(p => p.id === postId);
    if (!currentPost) return { posts, comments: [] };

    const newCommentsCount = currentPost.comments_count + 1;
    
    const updatedPosts = posts.map(post => 
      post.id === postId ? {
        ...post,
        comments_count: newCommentsCount
      } : post
    );

    const isUserVerified = userProfile?.user_status === 'verified';

    const optimisticComment: Comment = {
      id: `temp_${Date.now()}`,
      author_id: userProfile.id,
      author_name: userProfile.first_name ? 
        `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : 
        'You',
      author_avatar: userProfile.avatar_url || '',
      author_verified: isUserVerified,
      content: commentContent.trim(),
      likes_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      has_liked: false
    };

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
        const finalPosts = posts.map(post => 
          post.id === postId ? {
            ...post,
            comments_count: result[0].comments_count
          } : post
        );

        const cacheKey = getCacheKey(userProfile.id);
        await appCache.remove(cacheKey);
        
        const comments = await homeService.loadComments(postId);
        
        return {
          posts: finalPosts,
          comments
        };
      }
      
      return { posts: updatedPosts, comments: [optimisticComment] };
    } catch {
      return { 
        posts, 
        comments: [], 
        error: 'Failed to add comment' 
      };
    }
  },

  handleCreatePost: async (
    content: string,
    files: File[],
    userProfile: any,
    isVerified: boolean
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!content.trim() && files.length === 0) {
      return { success: false, error: 'Please add content or media to your post' };
    }

    if (!userProfile) {
      return { success: false, error: 'Please login to create a post' };
    }

    try {
      let mediaUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
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

      const mediaType = files.length === 0 ? 'text' : 
                       files.length === 1 ? (files[0].type.startsWith('video/') ? 'video' : 'image') : 
                       'gallery';

      const { data: postId, error } = await supabase
        .rpc('create_post', {
          p_author_id: userProfile.id,
          p_post_content: content.trim(),
          p_media_urls: mediaUrls,
          p_media_type: mediaType,
          p_tags: content.match(/#\w+/g)?.map(tag => tag.substring(1)) || []
        });

      if (error) {
        throw error;
      }

      const cacheKey = getCacheKey(userProfile.id);
      await appCache.remove(cacheKey);
      
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to create post' };
    }
  }
};