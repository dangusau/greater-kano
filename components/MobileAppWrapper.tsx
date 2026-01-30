import React, { ReactNode } from 'react';

/**
 * MobileAppWrapper Component
 * 
 * Wraps app content for mobile optimization with safe area handling.
 * Features:
 * - iOS safe area insets support
 * - Maximum width constraint for mobile
 * - Tablet/desktop centering with shadow
 * - No console warnings from jsx/global props
 * 
 * Mobile Optimization Notes:
 * - Uses env(safe-area-inset-top/bottom) for notched devices
 * - Constrains content to 640px max for optimal mobile viewing
 * - Centers app on larger screens with gradient background
 */
interface MobileAppWrapperProps {
  children: ReactNode;
}

const MobileAppWrapper: React.FC<MobileAppWrapperProps> = ({ children }) => {
  return (
    <div className="mobile-wrapper">
      {/* iOS Safe Area Top - Only for wrapper content */}
      <div className="h-[env(safe-area-inset-top)] bg-transparent" />
      
      {/* Page Content Wrapper - Constrained to 640px */}
      <div className="min-h-screen bg-white">
        <div className="max-w-screen-sm mx-auto w-full min-h-screen">
          {children}
        </div>
      </div>
      
      {/* iOS Safe Area Bottom - Only for wrapper content */}
      <div className="h-[env(safe-area-inset-bottom)] bg-transparent" />
      
      {/* Tablet/Desktop centering - Using CSS instead of style jsx */}
      <style>{`
        /* For tablets/desktops: center ONLY the content area */
        @media (min-width: 641px) {
          body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          
          .mobile-wrapper {
            width: 100%;
            max-width: 640px;
            border-radius: 20px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            max-height: 90vh;
          }
          
          /* Header and BottomNav should be full width inside wrapper on desktop */
          header, nav {
            border-radius: 20px 20px 0 0;
          }
          
          nav {
            border-radius: 0 0 20px 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileAppWrapper;