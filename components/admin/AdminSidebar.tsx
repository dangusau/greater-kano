import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Briefcase, FileText, MessageCircle, Bell, BarChart2, Plus } from 'lucide-react';

const AdminSidebar: React.FC = () => {
  const links = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: BarChart2 },
    { path: '/admin/members', label: 'Members', icon: Users },
    { path: '/admin/AdminBusinesses', label: 'Businesses', icon: Briefcase },
    { path: '/admin/AdminPosts', label: 'Posts', icon: FileText },
    { path: '/admin/AdminMarketplace', label: 'Marketplace', icon: FileText },
    { path: '/admin/AdminJobs', label: 'Jobs', icon: FileText },
    { path: '/admin/AdminEvents', label: 'Events', icon: FileText },
    { path: '/admin/support', label: 'Help & Support', icon: MessageCircle },
    { path: '/admin/Announcements', label: 'Announcements', icon: Bell },
    { path: '/admin/AdminManagement', label: 'Add Admin', icon: Plus },
  
  ];

  return (
    <aside className="w-64 bg-white border-r shadow-md h-full p-4 flex flex-col">
      <h2 className="text-xl font-bold mb-6">GKBC Admin</h2>
      <nav className="flex flex-col space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center space-x-2 p-2 rounded hover:bg-blue-50 transition ${
                isActive ? 'bg-blue-100 font-semibold' : ''
              }`
            }
          >
            <link.icon size={18} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
