import React, { useState, useEffect } from 'react';
import { MessageCircle, LogOut, Bell, User, HelpCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { messagingService } from '../services/supabase/messaging';
import { notificationService } from '../services/supabase/notifications';
import VerifiedBadge from './VerifiedBadge';

interface HeaderProps {
  userName?: string;
  userAvatar?: string;
  showBack?: boolean;
  onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  userName = "Member", 
  userAvatar,
  showBack = false,
  onBack
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userInitials, setUserInitials] = useState('M');
  const [profileData, setProfileData] = useState<any>(null);
  const [userStatus, setUserStatus] = useState<'verified' | 'member'>('member');
  
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, user_status')
            .eq('id', user.id)
            .single();

          if (profile) {
            setProfileData(profile);
            setUserStatus(profile.user_status || 'member');
            
            const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                        user.user_metadata?.name || 
                        user.user_metadata?.full_name || 
                        user.email?.split('@')[0] || 
                        userName;

            if (name) {
              const initials = name
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              setUserInitials(initials);
            }
          }
          
          loadMessageCount();
          loadNotificationCount();
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };

    getCurrentUser();
  }, []);

  const loadMessageCount = async () => {
    try {
      const count = await messagingService.getTotalUnreadCount();
      setUnreadMessageCount(count);
    } catch (error) {
      console.error('Error loading message count:', error);
    }
  };

  const loadNotificationCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadNotificationCount(count);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  useEffect(() => {
    if (location.pathname !== '/notifications') {
      loadNotificationCount();
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      navigate('/login');
    }
  };

  const handleNavigateToMessages = () => {
    navigate('/messages');
  };

  const handleNavigateToNotifications = () => {
    navigate('/notifications');
  };

  const profileMenuItems = [
    { label: 'My Profile', path: '/profile', icon: User },
    { label: 'Help & Support', path: '/help-support', icon: HelpCircle },
    { label: 'Logout', action: handleLogout, icon: LogOut },
  ];

  const displayName = profileData 
    ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() 
    : userName;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 shadow-xl w-full pt-safe">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack ? (
              <button
                onClick={onBack || (() => navigate(-1))}
                className="p-2 -ml-2 text-white hover:bg-white/10 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <div
                onClick={() => navigate('/home')}
                className="flex items-center gap-2 cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && navigate('/home')}
                aria-label="Go to home"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                  <img 
                    src="/gkbclogo.png" 
                    alt="GKBC Logo" 
                    className="w-9 h-9 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="text-blue-700 font-black text-lg tracking-wider">GKBC</div>';
                      }
                    }}
                  />
                </div>
                <div className="hidden sm:block">
                  <h3 className="text-xl font-black text-white tracking-tight drop-shadow-md">GKBC</h3>
                  <p className="text-white/90 text-xs font-medium">Greater Kano</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNavigateToNotifications}
              className="relative p-2.5 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Notifications"
              aria-label={`Notifications ${unreadNotificationCount > 0 ? `(${unreadNotificationCount} unread)` : ''}`}
            >
              <Bell size={20} />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            <button
              onClick={handleNavigateToMessages}
              className="relative p-2.5 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Messages"
              aria-label={`Messages ${unreadMessageCount > 0 ? `(${unreadMessageCount} unread)` : ''}`}
            >
              <MessageCircle size={20} />
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all min-h-[44px]"
                aria-label="User profile menu"
                aria-expanded={showProfileMenu}
              >
                <div className="relative w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white/50 bg-white">
                  {profileData?.avatar_url ? (
                    <img
                      src={profileData.avatar_url}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-blue-700 font-bold text-sm">
                      {userInitials}
                    </span>
                  )}
                  {/* Verification Badge on Avatar */}
                  {userStatus === 'verified' && (
                    <div className="absolute -bottom-1 -right-1">
                      <VerifiedBadge size={8} />
                    </div>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-white text-sm font-semibold leading-tight">
                      {displayName.split(' ')[0]}
                    </p>
                    {userStatus === 'verified' && <VerifiedBadge size={8} className="ml-1" />}
                  </div>
                  <p className="text-white/80 text-xs">
                    {userStatus === 'verified' ? 'Verified Member' : 'Member'}
                  </p>
                </div>
              </button>

              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                    role="presentation"
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-white border border-gray-300">
                          {profileData?.avatar_url ? (
                            <img
                              src={profileData.avatar_url}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-blue-700 font-bold text-sm">
                              {userInitials}
                            </span>
                          )}
                          {/* Verification Badge in Profile Menu */}
                          {userStatus === 'verified' && (
                            <div className="absolute -bottom-1 -right-1">
                              <VerifiedBadge size={1} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">{displayName}</h3>
                            {userStatus === 'verified' && <VerifiedBadge size={15} />}
                          </div>
                          <p className="text-xs text-gray-600">
                            {currentUser?.email?.split('@')[0] || 'member'}
                            {userStatus === 'verified' && ' • Verified'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="py-2">
                      {profileMenuItems.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => {
                            setShowProfileMenu(false);
                            if (item.action) {
                              item.action();
                            } else if (item.path) {
                              navigate(item.path);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-blue-50 transition-colors hover:text-blue-700 min-h-[44px]"
                          aria-label={item.label}
                        >
                          <item.icon size={16} className="text-gray-500" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;