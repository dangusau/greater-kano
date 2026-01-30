import React from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
