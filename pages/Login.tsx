import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Shield,
  Smartphone,
  Building,
  CheckCircle,
  UserX,
  X
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface LoginFormData {
  email: string;
  password: string;
}

interface UserProfile {
  id: string;
  email: string;
  user_status: 'member' | 'verified' | 'banned';
  verified_at?: string;
}

const LoginStatusModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  email: string;
  status: 'unverified' | 'banned' | 'no_account' | 'credentials_incorrect';
  onSignupClick: () => void;
  onTryAgain?: () => void;
  onForgotPassword?: () => void;
}> = ({ 
  isOpen, 
  onClose, 
  email, 
  status, 
  onSignupClick, 
  onTryAgain,
  onForgotPassword 
}) => {
  if (!isOpen) return null;

  const getModalConfig = () => {
    switch (status) {
      case 'unverified':
        return {
          title: 'Email Not Verified',
          icon: <AlertCircle className="text-yellow-600" size={24} />,
          iconBg: 'from-yellow-100 to-yellow-50',
          iconBorder: 'border-yellow-200',
          message: (
            <>
              <p className="text-gray-600 mb-2 text-sm">
                Your email <span className="font-semibold text-blue-600">{email}</span> has not been verified yet.
              </p>
              <p className="text-gray-600 text-sm">
                Please check your inbox for the verification link. If you didn't receive it, check your spam folder.
              </p>
            </>
          ),
          primaryButton: 'Resend Verification',
          secondaryButton: 'Close',
          primaryAction: onTryAgain,
          secondaryAction: onClose,
        };
      case 'banned':
        return {
          title: 'Account Restricted',
          icon: <UserX className="text-red-600" size={24} />,
          iconBg: 'from-red-100 to-red-50',
          iconBorder: 'border-red-200',
          message: (
            <>
              <p className="text-gray-600 mb-2 text-sm">
                Your account has been restricted.
              </p>
              <p className="text-gray-600 text-sm">
                Please contact support@GKBC.com for assistance.
              </p>
            </>
          ),
          primaryButton: 'Contact Support',
          secondaryButton: 'Close',
          primaryAction: () => window.open('mailto:support@GKBC.com', '_blank'),
          secondaryAction: onClose,
        };
      case 'no_account':
        return {
          title: 'No Account Found',
          icon: <UserX className="text-blue-600" size={24} />,
          iconBg: 'from-blue-100 to-blue-50',
          iconBorder: 'border-blue-200',
          message: (
            <>
              <p className="text-gray-600 mb-2 text-sm">
                No account found with email <span className="font-semibold text-blue-600">{email}</span>.
              </p>
              <p className="text-gray-600 text-sm">
                Please sign up to create a new account and join our business community.
              </p>
            </>
          ),
          primaryButton: 'Sign Up',
          secondaryButton: 'Try Different Email',
          primaryAction: onSignupClick,
          secondaryAction: onClose,
        };
      case 'credentials_incorrect':
        return {
          title: 'Incorrect Credentials',
          icon: <AlertCircle className="text-red-600" size={24} />,
          iconBg: 'from-red-100 to-red-50',
          iconBorder: 'border-red-200',
          message: (
            <>
              <p className="text-gray-600 mb-2 text-sm">
                The email or password you entered is incorrect.
              </p>
              <p className="text-gray-600 text-sm">
                Please check your credentials and try again.
              </p>
            </>
          ),
          primaryButton: 'Try Again',
          secondaryButton: 'Forgot Password?',
          primaryAction: onTryAgain,
          secondaryAction: onForgotPassword,
        };
    }
  };

  const config = getModalConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-center mb-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${config.iconBg} rounded-full flex items-center justify-center border ${config.iconBorder}`}>
              {config.icon}
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 text-center">{config.title}</h3>
        </div>

        <div className="p-4">
          <div className="text-center mb-4">
            {config.message}
          </div>

          <div className="space-y-2">
            <button
              onClick={config.primaryAction}
              className={`w-full ${
                status === 'banned' 
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                  : status === 'unverified'
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700'
                  : status === 'no_account'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
              } text-white font-bold py-2.5 rounded-lg hover:shadow transition-all duration-200 min-h-[44px]`}
            >
              {config.primaryButton}
            </button>
            <button
              onClick={config.secondaryAction}
              className="w-full border border-gray-300 text-gray-700 font-bold py-2.5 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 min-h-[44px]"
            >
              {config.secondaryButton}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const prefilledEmail = (location.state as any)?.prefilledEmail || '';

  const [formData, setFormData] = useState<LoginFormData>({
    email: prefilledEmail,
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>((location.state as any)?.message || null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [loginStatus, setLoginStatus] = useState<'unverified' | 'banned' | 'no_account' | 'credentials_incorrect'>('credentials_incorrect');

  const handleModalClose = () => {
    setShowStatusModal(false);
    
    if (loginStatus === 'credentials_incorrect') {
      setFormData(prev => ({ ...prev, password: '' }));
    }
    
    if (loginStatus === 'no_account') {
      setFormData(prev => ({ ...prev, email: '' }));
    }
  };

  const handleSignupFromModal = () => {
    setShowStatusModal(false);
    navigate('/signup', { 
      state: { prefilledEmail: formData.email } 
    });
  };

  const handleTryAgain = () => {
    setShowStatusModal(false);
    setFormData(prev => ({ ...prev, password: '' }));
  };

  const handleForgotPassword = () => {
    setShowStatusModal(false);
    navigate('/forgot-password');
  };

  const handleResendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email.trim(),
      });
      
      if (error) throw error;
      
      setError('Verification email sent! Please check your inbox.');
      setShowStatusModal(false);
      
    } catch (err: any) {
      setError('Failed to resend verification. Please try again later.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const email = formData.email.trim();
      const password = formData.password.trim();

      // STEP 1: Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Handle auth errors
      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          // Check if email exists in profiles (for "no_account" case)
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email.toLowerCase())
            .maybeSingle();
          
          if (!existingProfile) {
            setLoginStatus('no_account');
            setShowStatusModal(true);
          } else {
            setLoginStatus('credentials_incorrect');
            setShowStatusModal(true);
          }
        } else if (authError.message.includes('Email not confirmed')) {
          setLoginStatus('unverified');
          setShowStatusModal(true);
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }
      
      if (!authData.user) {
        setError('Authentication failed. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // STEP 2: Check email verification
      if (!authData.user.email_confirmed_at) {
        setLoginStatus('unverified');
        setShowStatusModal(true);
        setIsLoading(false);
        return;
      }
      
      // STEP 3: Get profile using authenticated user ID (works with RLS)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_status')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError) {
        // Only log critical network errors
        if (profileError.message.includes('network')) {
          console.error('Critical network error fetching profile');
        }
        setError('Account error. Please contact support@GKBC.com');
        setIsLoading(false);
        return;
      }
      
      if (!profile) {
        // Profile doesn't exist - database trigger failed
        setError('Account setup incomplete. Please contact support.');
        setIsLoading(false);
        return;
      }
      
      // STEP 4: Check user status
      if (profile.user_status === 'banned') {
        setLoginStatus('banned');
        setShowStatusModal(true);
        setIsLoading(false);
        return;
      }
      
      // STEP 5: Successful login
      navigate('/home');
      
    } catch (err: any) {
      // Only log critical network errors
      if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
        console.error('Critical network error during login');
      }
      
      let errorMessage = 'Login failed. Please try again.';
      if (err.message?.includes('Invalid login credentials')) {
        setLoginStatus('credentials_incorrect');
        setShowStatusModal(true);
      } else if (err.message?.includes('Email not confirmed')) {
        setLoginStatus('unverified');
        setShowStatusModal(true);
      } else if (err.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection.';
        setError(errorMessage);
      } else {
        setError(err.message || errorMessage);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  return (
    <>
      <LoginStatusModal
        isOpen={showStatusModal}
        onClose={handleModalClose}
        email={formData.email}
        status={loginStatus}
        onSignupClick={handleSignupFromModal}
        onTryAgain={loginStatus === 'unverified' ? handleResendVerification : handleTryAgain}
        onForgotPassword={handleForgotPassword}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex flex-col justify-center items-center px-3 relative overflow-hidden safe-area">
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-blue-600/10 to-transparent" />
        <div className="absolute top-1/4 -right-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-12 w-48 h-48 bg-blue-400/5 rounded-full blur-3xl" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden border border-blue-100">
                <img 
                  src="/GKBClogo.png" 
                  alt="GKBC Logo" 
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div class="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                        <span class="text-white font-bold text-base">GKBC</span>
                      </div>
                    `;
                  }}
                />
              </div>
            </div>
            
            <div className="mb-3">
              <h1 className="text-2xl font-black text-gray-900 text-center">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  GKBC
                </span>
              </h1>
              <p className="text-xs text-gray-500 text-center font-medium mt-0.5">
                Africa's Emerging Economic Vanguard
              </p>
            </div>
            
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome Back</h2>
              <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto">
                Sign in to access your business network
              </p>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/80 overflow-hidden mb-4">
            <div className="p-4">
              {error && (
                <div className={`mb-4 p-3 rounded-lg ${
                  error.includes('sent') || error.includes('check your email') 
                    ? 'bg-blue-50 border border-blue-100' 
                    : 'bg-red-50 border border-red-100'
                }`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0">
                      {error.includes('sent') || error.includes('check your email') ? (
                        <CheckCircle className="text-blue-600" size={16} />
                      ) : (
                        <AlertCircle className="text-red-600" size={16} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-xs ${error.includes('sent') ? 'text-blue-800' : 'text-red-800'}`}>
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-700 pl-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center">
                      <Mail className="text-gray-400" size={16} />
                    </div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pl-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center">
                      <Lock className="text-gray-400" size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-2.5 rounded-lg hover:shadow hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">Sign In</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 space-y-2">
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full text-center text-blue-600 hover:text-blue-700 font-medium text-xs py-2 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Don't have an account? Sign Up
                </button>
                
                <button
                  onClick={() => navigate('/forgot-password')}
                  className="w-full text-center text-gray-500 hover:text-gray-700 text-xs py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm rounded-lg border border-gray-200/60 p-3">
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-md flex items-center justify-center mb-0.5">
                  <Shield size={12} className="text-white" />
                </div>
                <span className="text-xs text-gray-600 font-medium">Secure</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center mb-0.5">
                  <Building size={12} className="text-white" />
                </div>
                <span className="text-xs text-gray-600 font-medium">Verified</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center mb-0.5">
                  <Smartphone size={12} className="text-white" />
                </div>
                <span className="text-xs text-gray-600 font-medium">GKBC</span>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-3">
            <p className="text-xs text-gray-400">GKBC Network v1.0</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;