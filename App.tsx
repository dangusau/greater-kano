import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';

// Pages
import Home from './pages/Home';
import Members from './pages/Members';
import Marketplace from './pages/Marketplace';
import Businesses from './pages/Businesses';
import BusinessDetails from './pages/BusinessDetails';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ListingDetails from './pages/ListingDetails';
import Conversations from './pages/Conversations';
import ChatWindow from './pages/ChatWindow';
import NewConversation from './pages/NewConversation';
import HelpSupport from './pages/HelpSupport';
import ForgotPassword from './pages/forgot-password';
import ResetPassword from './pages/ResetPassword';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import AdminPosts from './pages/admin/AdminPosts';
import AdminMembers from './pages/admin/Members';
import AdminBusinesses from './pages/admin/AdminBusinesses';
import AdminMarketplace from './pages/admin/AdminMarketplace';
import AdminJobs from './pages/admin/AdminJobs';
import AdminLayout from './Layout/AdminLayout';
import AdminEvents from './pages/admin/AdminEvents';
import SupportTickets from './pages/admin/SupportTickets';
import SupportTicketDetails from './pages/admin/SupportTicketDetails';
import Announcements from './pages/admin/Announcements';
import AdminManagement from './pages/admin/AdminManagement';
// Legal pages
import Terms from './pages/legal/Terms';
import Privacy from './pages/legal/Privacy';


// Layout wrapper for web/mobile responsiveness
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex bg-gray-50">
      {/* Desktop Sidebar - FIXED */}
      <aside className="hidden md:block md:w-64 md:fixed md:top-0 md:left-0 md:h-screen bg-white border-r z-40">
        <Sidebar />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 w-full md:ml-64">
        {/* Header is fixed - sits outside normal flow */}
        <Header />

        {/* Add margin-top to this container instead of padding */}
        <div className="mt-20 flex-1 flex flex-col"> {/* Added mt-20 here */}
          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 w-full">
            <div className="w-full max-w-full mx-auto">
              {children}
            </div>
          </main>

          {/* Bottom nav - FIXED on mobile */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            <BottomNav />
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    // ADDED: Root wrapper with width control
    <div className="w-full overflow-x-hidden">
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/*Legal (Public & Required) */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Admin pages */}
            <Route path="/admin/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
            <Route path="/admin/members" element={<AdminLayout><AdminMembers /></AdminLayout>} />
            <Route path="/admin/AdminBusinesses" element={<AdminLayout><AdminBusinesses /></AdminLayout>} />
            <Route path="/admin/AdminPosts" element={<AdminLayout><AdminPosts /></AdminLayout>} />
            <Route path="/admin/AdminMarketplace" element={<AdminLayout><AdminMarketplace /></AdminLayout>} />
            <Route path="/admin/AdminJobs" element={<AdminLayout><AdminJobs /></AdminLayout>} />
            <Route path="/admin/AdminEvents" element={<AdminLayout><AdminEvents/></AdminLayout>}/>
            <Route path="/admin/Announcements" element={<AdminLayout><Announcements/></AdminLayout>}/>
            <Route path="/admin/AdminManagement" element={<AdminLayout><AdminManagement/></AdminLayout>}/>
            
            <Route
              path="/admin/support"
              element={
                <AdminLayout>
                  <SupportTickets />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/support/:id"
              element={
                <AdminLayout>
                  <SupportTicketDetails />
                </AdminLayout>
              }
            />

            {/* Protected routes */}
            <Route element={<PrivateRoute />}>
              {/* Chat pages with no layout */}
              <Route path="/messages/:conversationId" element={<ChatWindow />} />

              {/* All other pages with Layout */}
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/home" element={<Layout><Home /></Layout>} />
              <Route path="/members" element={<Layout><Members /></Layout>} />
              <Route path="/marketplace" element={<Layout><Marketplace /></Layout>} />
              <Route path="/marketplace/:id" element={<Layout><ListingDetails /></Layout>} />
              <Route path="/businesses" element={<Layout><Businesses /></Layout>} />
              <Route path="/business/:id" element={<Layout><BusinessDetails /></Layout>} />
              <Route path="/explore" element={<Layout><Explore /></Layout>} />
              <Route path="/profile" element={<Layout><Profile /></Layout>} />
              <Route path="/profile/:userId" element={<Layout><Profile /></Layout>} />
              <Route path="/messages" element={<Layout><Conversations /></Layout>} />
              <Route path="/messages/new" element={<Layout><NewConversation /></Layout>} />
              <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
              <Route path="/help-support" element={<Layout><HelpSupport /></Layout>} />
            </Route>

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;