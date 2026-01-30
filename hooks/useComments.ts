import { useState, useCallback } from 'react';
import { Comment } from '../types';
import { commentsService } from '../services/supabase/comments';

export const useComments = () => {
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const loadComments = useCallback(async (postId: string) => {
    try {
      setLoading(prev => ({ ...prev, [postId]: true }));
      const data = await commentsService.getComments(postId);
      setComments(prev => ({ ...prev, [postId]: data }));
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments(prev => ({ ...prev, [postId]: [] }));
    } finally {
      setLoading(prev => ({ ...prev, [postId]: false }));
    }
  }, []);

  const addComment = useCallback(async (postId: string, content: string) => {
    try {
      const newComment = await commentsService.addComment(postId, content);
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));
      return newComment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }, []);

  return {
    comments,
    loading,
    loadComments,
    addComment,
    setComments
  };
};