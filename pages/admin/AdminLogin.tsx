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
  Building,
  Key
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
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuthenticated = await adminAuth.isAuthenticated();
        if (isAuthenticated) {
          navigate('/admin/dashboard');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!formData.password.trim()) {
      setError('Please enter your password');
      return;
    }

    // Rate limiting check
    if (loginAttempts >= 5) {
      setError('Too many login attempts. Please try again in 15 minutes.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting admin login for:', formData.email.trim());
      
      const result = await adminAuth.login(
        formData.email.trim(),
        formData.password.trim()
      );
      
      console.log('Login result:', result);
      
      if (result.success && result.admin) {
        // Reset attempts on successful login
        setLoginAttempts(0);
        
        // Add slight delay for better UX
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 300);
      } else {
        setLoginAttempts(prev => prev + 1);
        setError(result.error || 'Invalid credentials. Please check your email and password.');
      }
    } catch (err: any) {
      console.error('Login exception:', err);
      setLoginAttempts(prev => prev + 1);
      
      if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    if (!formData.email.trim()) {
      setError('Please enter your email address first');
      return;
    }
    
    // Navigate to password reset with email pre-filled
    navigate(`/reset-password?email=${encodeURIComponent(formData.email)}`);
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-blue-700 font-medium">Verifying authentication...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we check your session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
              <Building size={28} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900">GKBC</h1>
              <p className="text-sm text-blue-600 font-medium">Greater Kano Business Council</p>
            </div>
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-4">
            <Shield size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Administration Portal</span>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Secure Admin Access</h2>
          <p className="text-gray-600">
            Sign in to manage platform content, users, and settings
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-red-700 font-medium text-sm">{error}</p>
                  {loginAttempts >= 3 && (
                    <p className="text-red-600 text-xs mt-1">
                      Attempt {loginAttempts} of 5. Too many attempts may temporarily lock your account.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Mail size={16} className="text-blue-600" />
                Admin Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-4 pr-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="your.email@example.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Lock size={16} className="text-blue-600" />
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Enter your secure password"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={20} className="text-blue-600" />
                  ) : (
                    <Eye size={20} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Security Tips */}
            {loginAttempts > 0 && loginAttempts < 3 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <Key size={14} className="inline mr-2" />
                  <strong>Security Tip:</strong> Ensure Caps Lock is off and you're using the correct email format.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || loginAttempts >= 5}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 group"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span className="animate-pulse">Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield size={20} className="group-hover:scale-110 transition-transform" />
                  <span>Sign In to Admin Panel</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-4">Need help accessing your account?</p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full text-center text-blue-600 hover:text-blue-800 font-medium text-sm py-3 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                  disabled={isLoading}
                >
                  ← Return to User Login Portal
                </button>
                
                <a
                  href="mailto:support@gkbc.com"
                  className="block text-center text-gray-500 hover:text-gray-700 text-xs py-2 hover:bg-gray-50 rounded transition-colors"
                >
                  Contact Support Team
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200">
            <Shield size={12} className="text-green-500" />
            <span>Secure Connection • Encrypted with AES-256</span>
          </div>
          
          <p className="text-xs text-gray-400 mt-4">
            © {new Date().getFullYear()} GKBC Admin Portal. All access is logged and monitored.
            <br />
            Unauthorized access attempts will be reported.
          </p>
        </div>
      </div>

      {/* Global Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;