import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Briefcase, Compass, ShoppingCart } from 'lucide-react';

const BottomNav: React.FC = () => {
  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/members', icon: Users, label: 'Members' },
    { path: '/marketplace', icon: ShoppingCart, label: 'Market' },
    { path: '/businesses', icon: Briefcase, label: 'Biz' },
    { path: '/explore', icon: Compass, label: 'Explore' },
  ];

  return (
    // ADDED: w-full and overflow-hidden
    <nav className="w-full overflow-hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-600 pb-safe pt-3 z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.3)]">
      <div className="flex justify-between items-center w-full px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center transition-all duration-300
              flex-shrink-0
              ${isActive ? 'text-white' : 'text-white/70'}
              min-h-[60px] w-[20%] /* Each item takes 20% width */
            `}
            aria-label={item.label}
          >
            {({ isActive }) => (
              <>
                <div className={`
                  p-2.5 rounded-2xl transition-all duration-300 mb-1
                  ${isActive ? 'bg-white/20 backdrop-blur-sm shadow-sm' : 'bg-transparent'}
                  flex items-center justify-center
                `}>
                  <item.icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    fill={isActive ? "currentColor" : "none"} 
                    className={isActive ? "text-white" : "text-white/70"}
                  />
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-white/70'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;