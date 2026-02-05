// hooks/useProfile.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profileService } from '../services/supabase/profile';
import { supabase } from '../services/supabase';

interface ProfileData {
  profile: any;
  stats: any;
  relationship: any;
}

export const useProfile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  
  // State Management
  const [activeTab, setActiveTab] = useState('posts');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [modalAction, setModalAction] = useState<'connect' | 'withdraw' | 'accept' | 'reject' | 'disconnect' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionType, setActionType] = useState<'edit' | 'delete'>('edit');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
  // Refs
  const notificationTimeoutRef = useRef<NodeJS.Timeout>();

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Derived state
  const isOwner = profileData?.relationship?.is_owner;
  const isConnected = profileData?.relationship?.is_connected;
  const isVerifiedUser = profileData?.profile?.user_status === 'verified';

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    setNotification({ type, message });
    
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  const updateStatsOptimistically = useCallback((type: string, operation: 'increment' | 'decrement') => {
    if (!profileData) return;

    setProfileData(prev => {
      if (!prev) return prev;
      
      const newStats = { ...prev.stats };
      const statKey = `${type}_count`;
      
      if (operation === 'increment') {
        newStats[statKey] = (newStats[statKey] || 0) + 1;
      } else if (operation === 'decrement') {
        newStats[statKey] = Math.max(0, (newStats[statKey] || 1) - 1);
      }
      
      return {
        ...prev,
        stats: newStats
      };
    });
  }, [profileData]);

  const fetchPendingConnection = useCallback(async () => {
    if (!currentUserId || !profileData?.profile?.id || isOwner) return;

    try {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`and(user_id.eq.${currentUserId},connected_user_id.eq.${profileData.profile.id}),and(user_id.eq.${profileData.profile.id},connected_user_id.eq.${currentUserId})`);

      if (error) {
        console.error('Error fetching pending connection:', error);
        return;
      }

      if (data && data.length > 0) {
        const pending = data.find(conn => conn.status === 'pending');
        setPendingConnection(pending || null);
      } else {
        setPendingConnection(null);
      }
    } catch (error) {
      console.error('Error in fetchPendingConnection:', error);
    }
  }, [currentUserId, profileData, isOwner]);

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfileData(
        userId || 'current', 
        'current'
      );
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      showNotification('error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, showNotification]);

  const loadTabData = useCallback(async (tab: string, profileId: string) => {
    if (!profileData?.relationship?.is_owner && !profileData?.relationship?.is_connected) {
      return;
    }

    try {
      switch (tab) {
        case 'posts':
          const postsData = await profileService.getUserPosts(profileId, 'current');
          const postsWithEngagements = await Promise.all(
            postsData.map(async (post: any) => {
              const [likesCount, commentsCount, sharesCount] = await Promise.all([
                fetchPostLikesCount(post.id),
                fetchPostCommentsCount(post.id),
                fetchPostSharesCount(post.id)
              ]);
              
              return {
                ...post,
                likes_count: likesCount,
                comments_count: commentsCount,
                shares_count: sharesCount,
                has_liked: await checkIfUserLikedPost(post.id)
              };
            })
          );
          setPosts(postsWithEngagements);
          break;
        case 'items':
          const listingsData = await profileService.getUserListings(profileId, 'current');
          setListings(listingsData);
          break;
        case 'businesses':
          const businessesData = await profileService.getUserBusinesses(profileId, 'current');
          setBusinesses(businessesData);
          break;
        case 'jobs':
          const jobsData = await profileService.getUserJobs(profileId, 'current');
          setJobs(jobsData);
          break;
        case 'events':
          const eventsData = await profileService.getUserEvents(profileId, 'current');
          setEvents(eventsData);
          break;
      }
    } catch (error) {
      showNotification('error', `Failed to load ${tab}. Please try again.`);
    }
  }, [profileData, showNotification]);

  const fetchPostLikesCount = useCallback(async (postId: string) => {
    const { count, error } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('Error fetching likes count:', error);
      return 0;
    }
    
    return count || 0;
  }, []);

  const fetchPostCommentsCount = useCallback(async (postId: string) => {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('Error fetching comments count:', error);
      return 0;
    }
    
    return count || 0;
  }, []);

  const fetchPostSharesCount = useCallback(async (postId: string) => {
    const { count, error } = await supabase
      .from('post_shares')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('Error fetching shares count:', error);
      return 0;
    }
    
    return count || 0;
  }, []);

  const checkIfUserLikedPost = useCallback(async (postId: string) => {
    if (!currentUserId) return false;
    
    const { data, error } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', currentUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false;
      console.error('Error checking if user liked post:', error);
      return false;
    }
    
    return !!data;
  }, [currentUserId]);

  const toggleLike = useCallback(async (postId: string, postIndex: number) => {
    if (!currentUserId) {
      showNotification('error', 'Please login to like posts');
      return;
    }

    try {
      const hasLiked = posts[postIndex].has_liked;
      const currentLikesCount = posts[postIndex].likes_count;
      
      setPosts(prev => prev.map((post, idx) => 
        idx === postIndex 
          ? { 
              ...post, 
              likes_count: hasLiked ? currentLikesCount - 1 : currentLikesCount + 1,
              has_liked: !hasLiked
            }
          : post
      ));

      if (hasLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);

        if (error) {
          setPosts(prev => prev.map((post, idx) => 
            idx === postIndex 
              ? { 
                  ...post, 
                  likes_count: currentLikesCount,
                  has_liked: hasLiked
                }
              : post
          ));
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: currentUserId
          });

        if (error) {
          setPosts(prev => prev.map((post, idx) => 
            idx === postIndex 
              ? { 
                  ...post, 
                  likes_count: currentLikesCount,
                  has_liked: hasLiked
                }
              : post
          ));
          throw error;
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      showNotification('error', 'Failed to update like. Please try again.');
    }
  }, [currentUserId, posts, showNotification]);

  const sharePost = useCallback(async (postId: string, postIndex: number) => {
    if (!currentUserId) {
      showNotification('error', 'Please login to share posts');
      return;
    }

    try {
      const currentSharesCount = posts[postIndex].shares_count;
      
      setPosts(prev => prev.map((post, idx) => 
        idx === postIndex 
          ? { 
              ...post, 
              shares_count: currentSharesCount + 1
            }
          : post
      ));

      const { error } = await supabase
        .from('post_shares')
        .insert({
          post_id: postId,
          user_id: currentUserId
        });

      if (error) {
        if (error.code === '23505') {
          setPosts(prev => prev.map((post, idx) => 
            idx === postIndex 
              ? { 
                  ...post, 
                  shares_count: currentSharesCount
                }
              : post
          ));
          showNotification('info', 'You have already shared this post');
          return;
        }
        
        setPosts(prev => prev.map((post, idx) => 
          idx === postIndex 
            ? { 
                ...post, 
                shares_count: currentSharesCount
              }
            : post
        ));
        throw error;
      }

      showNotification('success', 'Post shared successfully');
    } catch (error) {
      console.error('Error sharing post:', error);
      showNotification('error', 'Failed to share post. Please try again.');
    }
  }, [currentUserId, posts, showNotification]);

  const handleConnect = () => {
    setModalAction('connect');
    setShowConnectModal(true);
  };

  const handleWithdraw = () => {
    setModalAction('withdraw');
    setShowWithdrawModal(true);
  };

  const handleAccept = () => {
    setModalAction('accept');
    setShowAcceptModal(true);
  };

  const handleReject = () => {
    setModalAction('reject');
    setShowRejectModal(true);
  };

  const handleDisconnect = () => {
    setModalAction('disconnect');
    setShowConnectionModal(true);
  };

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setSelectedItem(null);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setSelectedItem(null);
  }, []);

  const confirmAction = useCallback(async () => {
    if (!profileData?.profile?.id || !currentUserId) {
      showNotification('error', 'Unable to complete action. Please try again.');
      return;
    }

    const profileId = profileData.profile.id;
    
    try {
      switch (modalAction) {
        case 'connect':
          const { data: connectData, error: connectError } = await profileService.sendConnectionRequest(profileId);
          
          if (connectError) {
            if (connectError.message.includes('already exists')) {
              showNotification('info', 'Connection already exists or request already sent');
            } else {
              throw connectError;
            }
          } else {
            console.log('Connect result:', connectData);
            await fetchPendingConnection();
            showNotification('success', 'Connection request sent successfully');
          }
          break;

        case 'withdraw':
          if (!pendingConnection) {
            showNotification('error', 'No pending connection found to withdraw');
            return;
          }

          const { data: withdrawData, error: withdrawError } = await profileService.withdrawConnectionRequest(profileId);
          
          if (withdrawError) {
            throw withdrawError;
          }

          console.log('Withdraw result:', withdrawData);
          setPendingConnection(null);
          showNotification('success', 'Connection request withdrawn');
          break;

        case 'accept':
          if (!pendingConnection) {
            showNotification('error', 'No pending connection found to accept');
            return;
          }

          await profileService.acceptConnectionRequest(pendingConnection.id);
          
          setPendingConnection(null);
          if (profileData) {
            setProfileData(prev => ({
              ...prev!,
              relationship: { 
                ...prev!.relationship, 
                is_connected: true, 
                is_pending: false,
                is_pending_receiver: false,
                connection_status: 'connected' 
              },
              stats: { ...prev!.stats, connections_count: (prev!.stats.connections_count || 0) + 1 }
            }));
          }

          showNotification('success', 'Connection request accepted');
          break;

        case 'reject':
          if (!pendingConnection) {
            showNotification('error', 'No pending connection found to reject');
            return;
          }

          await profileService.rejectConnectionRequest(pendingConnection.id);
          
          setPendingConnection(null);
          showNotification('success', 'Connection request rejected');
          break;

        case 'disconnect':
          console.log('Disconnecting from user:', profileId);
          
          const { data: disconnectData, error: disconnectError } = await profileService.disconnectUser(profileId);
          
          console.log('Disconnect result:', disconnectData);

          if (disconnectError) {
            console.error('Disconnect error:', disconnectError);
            throw disconnectError;
          }

          if (disconnectData?.action === 'disconnected') {
            if (profileData) {
              setProfileData(prev => ({
                ...prev!,
                relationship: { 
                  ...prev!.relationship, 
                  is_connected: false,
                  is_pending: false,
                  is_pending_receiver: false,
                  connection_status: 'not_connected'
                },
                stats: { 
                  ...prev!.stats, 
                  connections_count: Math.max(0, (prev!.stats.connections_count || 1) - 1)
                }
              }));
            }
            
            showNotification('success', 'Disconnected successfully');
          } else {
            showNotification('info', 'Connection updated');
          }
          break;
      }
    } catch (error: any) {
      console.error('Error in confirmAction:', error);
      
      let userMessage = 'Failed to complete action. Please try again.';
      
      if (error.message.includes('already exists')) {
        userMessage = 'Connection already exists between you and this user.';
      } else if (error.message.includes('No pending connection')) {
        userMessage = 'No connection request found to perform this action.';
      } else if (error.message.includes('No active connection')) {
        userMessage = 'No active connection found to disconnect.';
      }
      
      showNotification('error', userMessage);
    } finally {
      if (profileData?.profile?.id) {
        profileService.clearProfileCache(profileData.profile.id);
      }
      await loadProfileData();
      
      setShowConnectModal(false);
      setShowWithdrawModal(false);
      setShowAcceptModal(false);
      setShowRejectModal(false);
      setShowConnectionModal(false);
      setModalAction(null);
    }
  }, [profileData, currentUserId, modalAction, pendingConnection, showNotification, loadProfileData, fetchPendingConnection]);

  const isCurrentUserSender = () => {
    if (!pendingConnection || !currentUserId) return false;
    return pendingConnection.user_id === currentUserId;
  };

  const isCurrentUserReceiver = () => {
    if (!pendingConnection || !currentUserId) return false;
    return pendingConnection.connected_user_id === currentUserId;
  };

  const handleEditProfile = () => {
    setSelectedItem({ ...profileData?.profile, itemType: 'profile' });
    setActionType('edit');
    setShowEditModal(true);
  };

  const handleEditItem = (item: any, type: string) => {
    setSelectedItem({ ...item, itemType: type });
    setActionType('edit');
    setShowEditModal(true);
  };

  const handleDeleteItem = (item: any, type: string) => {
    setSelectedItem({ ...item, itemType: type });
    setActionType('delete');
    setShowDeleteModal(true);
  };

  const confirmDelete = useCallback(async () => {
    if (!selectedItem) return;

    try {
      const itemType = selectedItem.itemType;
      const itemId = selectedItem.id;
      
      switch (itemType) {
        case 'post':
          setPosts(prev => prev.filter(p => p.id !== itemId));
          updateStatsOptimistically('posts', 'decrement');
          break;
        case 'listing':
          setListings(prev => prev.filter(l => l.id !== itemId));
          updateStatsOptimistically('listings', 'decrement');
          break;
        case 'business':
          setBusinesses(prev => prev.filter(b => b.id !== itemId));
          updateStatsOptimistically('businesses', 'decrement');
          break;
        case 'job':
          setJobs(prev => prev.filter(j => j.id !== itemId));
          updateStatsOptimistically('jobs', 'decrement');
          break;
        case 'event':
          setEvents(prev => prev.filter(e => e.id !== itemId));
          updateStatsOptimistically('events', 'decrement');
          break;
        case 'avatar':
          if (profileData) {
            setProfileData(prev => ({
              ...prev!,
              profile: { ...prev!.profile, avatar_url: null }
            }));
          }
          break;
        case 'header':
          if (profileData) {
            setProfileData(prev => ({
              ...prev!,
              profile: { ...prev!.profile, header_image_url: null }
            }));
          }
          break;
      }

      switch (itemType) {
        case 'post':
          await profileService.deletePost(itemId);
          break;
        case 'listing':
          await profileService.deleteListing(itemId);
          break;
        case 'business':
          await profileService.deleteBusiness(itemId);
          break;
        case 'job':
          await profileService.deleteJob(itemId);
          break;
        case 'event':
          await profileService.deleteEvent(itemId);
          break;
        case 'avatar':
          await profileService.removeProfileAvatar();
          break;
        case 'header':
          await profileService.removeProfileHeader();
          break;
      }

      showNotification('success', `${selectedItem.itemType} deleted successfully`);
      handleCloseDeleteModal();
      
      if (profileData?.profile?.id) {
        profileService.clearProfileCache(profileData.profile.id);
      }
      
      if (itemType === 'avatar' || itemType === 'header') {
        await loadProfileData();
      }
      
    } catch (error) {
      showNotification('error', 'Failed to delete. Please try again.');
      
      if (profileData?.profile?.id) {
        await loadTabData(activeTab, profileData.profile.id);
        await loadProfileData();
      }
      
      if (selectedItem.itemType === 'avatar' || selectedItem.itemType === 'header') {
        await loadProfileData();
      }
    }
  }, [selectedItem, profileData, activeTab, loadProfileData, showNotification, loadTabData, updateStatsOptimistically, handleCloseDeleteModal]);

  const handleSaveEdit = useCallback(async (updatedData: any) => {
    try {
      const itemType = selectedItem?.itemType;
      
      if (itemType === 'profile') {
        if (profileData) {
          setProfileData(prev => ({
            ...prev!,
            profile: { ...prev!.profile, ...updatedData }
          }));
        }

        await profileService.updateProfileData(updatedData);
        await loadProfileData();
        showNotification('success', 'Profile updated successfully');
        
      } else if (itemType === 'listing') {
        setListings(prev => prev.map(listing => 
          listing.id === selectedItem.id 
            ? { ...listing, ...updatedData }
            : listing
        ));

        await profileService.updateListing(selectedItem.id, {
          title: updatedData.title,
          description: updatedData.description || '',
          price: updatedData.price,
          category: updatedData.category || '',
          condition: updatedData.condition || 'used',
          location: updatedData.location || ''
        });
        
        const listingsData = await profileService.getUserListings(profileData!.profile.id, 'current');
        setListings(listingsData);
        showNotification('success', 'Listing updated successfully');
        
      } else if (itemType === 'business') {
        setBusinesses(prev => prev.map(business => 
          business.id === selectedItem.id 
            ? { ...business, ...updatedData }
            : business
        ));

        await profileService.updateBusiness(selectedItem.id, {
          name: updatedData.name,
          description: updatedData.description || '',
          business_type: updatedData.business_type,
          category: updatedData.category,
          location_axis: updatedData.location_axis,
          address: updatedData.address || '',
          email: updatedData.email || '',
          phone: updatedData.phone || '',
          website: updatedData.website || ''
        });
        
        const businessesData = await profileService.getUserBusinesses(profileData!.profile.id, 'current');
        setBusinesses(businessesData);
        showNotification('success', 'Business updated successfully');
        
      } else if (itemType === 'job') {
        setJobs(prev => prev.map(job => 
          job.id === selectedItem.id 
            ? { ...job, ...updatedData }
            : job
        ));

        await profileService.updateJob(selectedItem.id, {
          title: updatedData.title,
          description: updatedData.description || '',
          salary: updatedData.salary || '',
          job_type: updatedData.job_type || 'full-time',
          location: updatedData.location || ''
        });
        
        const jobsData = await profileService.getUserJobs(profileData!.profile.id, 'current');
        setJobs(jobsData);
        showNotification('success', 'Job updated successfully');
        
      } else if (itemType === 'event') {
        setEvents(prev => prev.map(event => 
          event.id === selectedItem.id 
            ? { ...event, ...updatedData }
            : event
        ));

        await profileService.updateEvent(selectedItem.id, {
          title: updatedData.title,
          description: updatedData.description || '',
          event_date: updatedData.event_date,
          location: updatedData.location || ''
        });
        
        const eventsData = await profileService.getUserEvents(profileData!.profile.id, 'current');
        setEvents(eventsData);
        showNotification('success', 'Event updated successfully');
      }
      
      handleCloseEditModal();
      
    } catch (error: any) {
      showNotification('error', 'Failed to save changes. Please try again.');
      
      if (profileData?.profile?.id) {
        await loadTabData(activeTab, profileData.profile.id);
        await loadProfileData();
      }
      
      throw error;
    }
  }, [selectedItem, profileData, activeTab, loadProfileData, showNotification, loadTabData, handleCloseEditModal]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!file || !profileData?.profile?.id) return;

    try {
      setUploadingAvatar(true);
      await profileService.updateProfileAvatar(file);
      await loadProfileData();
      showNotification('success', 'Profile picture updated successfully');
      
    } catch (error) {
      showNotification('error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }, [profileData, loadProfileData, showNotification]);

  const handleHeaderUpload = useCallback(async (file: File) => {
    if (!file || !profileData?.profile?.id) return;

    try {
      setUploadingHeader(true);
      await profileService.updateProfileHeader(file);
      await loadProfileData();
      showNotification('success', 'Cover photo updated successfully');
      
    } catch (error) {
      showNotification('error', 'Failed to upload cover photo. Please try again.');
    } finally {
      setUploadingHeader(false);
    }
  }, [profileData, loadProfileData, showNotification]);

  const removeAvatar = () => {
    setSelectedItem({ id: 'avatar', itemType: 'avatar', name: 'profile picture' });
    setActionType('delete');
    setShowDeleteModal(true);
  };

  const removeHeader = () => {
    setSelectedItem({ id: 'header', itemType: 'header', name: 'cover photo' });
    setActionType('delete');
    setShowDeleteModal(true);
  };

  const shareProfile = useCallback(async () => {
    const profileUrl = `${window.location.origin}/profile/${profileData?.profile.id}`;
    
    try {
      await navigator.clipboard.writeText(profileUrl);
      showNotification('success', 'Profile link copied to clipboard');
      setShowShareMenu(false);
    } catch (error) {
      prompt('Copy this link:', profileUrl);
    }
  }, [profileData, showNotification]);

  useEffect(() => {
    if (currentUserId && profileData?.profile?.id && !isOwner) {
      fetchPendingConnection();
    }
  }, [currentUserId, profileData?.profile?.id, isOwner, fetchPendingConnection]);

  useEffect(() => {
    if (profileData?.profile?.id) {
      loadTabData(activeTab, profileData.profile.id);
    }
  }, [activeTab, profileData?.profile?.id, loadTabData]);

  useEffect(() => {
    loadProfileData();
    
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [userId, loadProfileData]);

  return {
    activeTab,
    setActiveTab,
    profileData,
    currentUserId,
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
    setModalAction,
    selectedItem,
    setSelectedItem,
    actionType,
    setActionType,
    uploadingAvatar,
    uploadingHeader,
    showOptionsMenu,
    setShowOptionsMenu,
    showShareMenu,
    setShowShareMenu,
    notification,
    setNotification,
    
    isOwner,
    isConnected,
    isVerifiedUser,
    
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
    
    handleCloseDeleteModal,
    handleCloseEditModal,
  };
};