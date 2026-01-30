import { useState, useCallback } from 'react';
import { Post } from '../types';
import { postsService } from '../services/supabase/posts';

const POSTS_PER_PAGE = 10;

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await postsService.getFeed(0, POSTS_PER_PAGE);
      setPosts(data);
      setOffset(POSTS_PER_PAGE);
      setHasMore(data.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const data = await postsService.getFeed(offset, POSTS_PER_PAGE);
      
      if (data.length > 0) {
        setPosts(prev => [...prev, ...data]);
        setOffset(prev => prev + POSTS_PER_PAGE);
        setHasMore(data.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, offset]);

  const toggleLike = useCallback(async (postId: string) => {
    try {
      const updatedPost = await postsService.toggleLike(postId);
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, ...updatedPost } : post
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, []);

  const sharePost = useCallback(async (postId: string) => {
    try {
      const updatedPost = await postsService.sharePost(postId);
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, ...updatedPost } : post
      ));
      return updatedPost;
    } catch (error) {
      console.error('Error sharing post:', error);
      throw error;
    }
  }, []);

  const createPost = useCallback(async (content: string, files: File[] = []) => {
    try {
      const newPost = await postsService.createPost(content, files);
      setPosts(prev => [newPost, ...prev]);
      return newPost;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }, []);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    loadPosts,
    loadMorePosts,
    toggleLike,
    sharePost,
    createPost,
    setPosts
  };
};