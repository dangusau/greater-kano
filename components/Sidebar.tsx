import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Briefcase, Compass, ShoppingCart } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/members', icon: Users, label: 'Members' },
    { path: '/marketplace', icon: ShoppingCart, label: 'Marketplace' },
    { path: '/businesses', icon: Briefcase, label: 'Businesses' },
    { path: '/explore', icon: Compass, label: 'Explore' },
  ];

  // Helper function to check if path is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="h-full w-full bg-white p-6 overflow-y-auto shadow-xl">
      {/* Simple but bold header */}
      <div className="mb-10 pt-4">
        <div className="inline-flex items-center space-x-3 mb-6">
          
          
        </div>
        
        <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
      </div>
      
      {/* Navigation */}
      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300
                w-full text-left group
                ${active 
                  ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:border-l-4 hover:border-gray-300'
                }
              `}
            >
              <div className={`
                p-2.5 rounded-xl transition-all duration-300
                ${active 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                }
              `}>
                <item.icon size={22} />
              </div>
              <span className="font-bold text-lg">{item.label}</span>
              {active && (
                <div className="ml-auto animate-pulse">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>
      
      {/* Footer */}
      <div className="mt-20 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2 font-medium">
            Community Platform
          </div>
          <div className="text-xs text-gray-400">
            Connect • Collaborate • Grow
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;