import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuth } from '../../services/adminAuth';
import {
  Shield,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await adminAuth.isAuthenticated();
      if (isAuthenticated) {
        navigate('/admin/dashboard');
      } else {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await adminAuth.login(
        formData.email.trim(),
        formData.password.trim()
      );
      
      if (result.success && result.admin) {
        navigate('/admin/dashboard');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex flex-col justify-center items-center px-6 py-8">
      <div className="w-full max-w-md">
        {/* Admin Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center mb-6 shadow-2xl border border-red-500/30">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">GKBC Admin Portal</h1>
          <p className="text-sm text-gray-400">Secure Administration Panel</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700 p-8">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-white">Administrator Sign In</h2>
            <p className="text-sm text-gray-400 mt-2">
              Enter your admin credentials to access the control panel
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-red-200 font-medium text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-500" size={18} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-900/50 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                  placeholder="admin@GKBC.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 bg-gray-900/50 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-4 rounded-xl shadow-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Shield size={20} />
                  Sign In to Admin Panel
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-8 pt-6 border-t border-gray-700/50 space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full text-center text-gray-400 hover:text-gray-300 text-sm py-2 hover:bg-gray-900/30 rounded-lg transition-colors"
              disabled={isLoading}
            >
              ← Return to User Login
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            ⚠️ For security, change default password after first login
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;