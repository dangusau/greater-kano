// utils/notificationUtils.ts
import { supabase } from '../services/supabase';

// Create friend request notification
export const createFriendRequestNotification = async (receiverId: string, senderId: string) => {
  try {
    const { data, error } = await supabase.rpc('create_friend_request_notification', {
      p_receiver_id: receiverId,
      p_sender_id: senderId
    });
    
    if (error) {
      console.error('Error creating friend request notification:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createFriendRequestNotification:', error);
    return null;
  }
};

// Create message notification
export const createMessageNotification = async (
  receiverId: string,
  senderId: string,
  conversationId: string,
  messageContent: string
) => {
  try {
    const { data, error } = await supabase.rpc('create_message_notification', {
      p_receiver_id: receiverId,
      p_sender_id: senderId,
      p_conversation_id: conversationId,
      p_message_content: messageContent.substring(0, 100) // Limit content length
    });
    
    if (error) {
      console.error('Error creating message notification:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createMessageNotification:', error);
    return null;
  }
};

// Create system notification
export const createSystemNotification = async (
  userId: string,
  title: string,
  message: string,
  data?: any,
  actionUrl?: string
) => {
  try {
    const { data: result, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: 'system',
      p_title: title,
      p_message: message,
      p_data: data || null,
      p_action_url: actionUrl || null
    });
    
    if (error) {
      console.error('Error creating system notification:', error);
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('Error in createSystemNotification:', error);
    return null;
  }
};